<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleDriveService
{
    protected ?string $folderId;
    protected ?string $serviceAccountJson;

    public function __construct(?string $folderId = null, ?string $serviceAccountJson = null)
    {
        $this->folderId = $folderId ?? config('services.google_drive.folder_id');
        $this->serviceAccountJson = $serviceAccountJson ?? config('services.google_drive.service_account_json');
    }

    /**
     * Check if Google Drive configuration is complete.
     */
    public function isConfigured(): bool
    {
        return !empty($this->folderId) && !empty($this->serviceAccountJson);
    }

    /**
     * Parse service account config from filepath or JSON string.
     */
    protected function getServiceAccountConfig(): array
    {
        if (!$this->isConfigured()) {
            throw new Exception("Google Drive configuration is incomplete. Please check GOOGLE_DRIVE_FOLDER_ID and GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON in .env.");
        }

        $credentialsStr = trim($this->serviceAccountJson);

        if (file_exists($credentialsStr)) {
            $credentialsStr = file_get_contents($credentialsStr);
        }

        $jsonConfig = json_decode($credentialsStr, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($jsonConfig)) {
            throw new Exception("Invalid Google Service Account JSON configuration.");
        }

        if (empty($jsonConfig['client_email']) || empty($jsonConfig['private_key'])) {
            throw new Exception("Service account JSON missing 'client_email' or 'private_key'.");
        }

        return $jsonConfig;
    }

    /**
     * Helper to base64url encode strings.
     */
    protected function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Obtain Google OAuth2 Access Token via JWT assertion.
     */
    protected function getAccessToken(): string
    {
        // Try google/apiclient SDK if class exists
        if (class_exists('Google\Client')) {
            try {
                $client = new \Google\Client();
                $client->setApplicationName("WifiPay Monthly Report");
                $client->setScopes(['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']);
                $client->setAuthConfig($this->getServiceAccountConfig());
                $token = $client->fetchAccessTokenWithAssertion();
                if (isset($token['access_token'])) {
                    return $token['access_token'];
                }
            } catch (Exception $e) {
                Log::warning("Google SDK client auth failed, falling back to native HTTP JWT: " . $e->getMessage());
            }
        }

        // Native PHP JWT Auth fallback (zero package dependencies)
        $config = $this->getServiceAccountConfig();
        $now = time();

        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT'
        ]));

        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $config['client_email'],
            'scope' => 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]));

        $signatureInput = $header . '.' . $payload;
        $signature = '';

        $binaryKey = openssl_pkey_get_private($config['private_key']);
        if (!$binaryKey) {
            throw new Exception("Failed to parse private key from Service Account credentials.");
        }

        if (!openssl_sign($signatureInput, $signature, $binaryKey, OPENSSL_ALGO_SHA256)) {
            throw new Exception("Failed to sign JWT with private key.");
        }

        $jwt = $signatureInput . '.' . $this->base64UrlEncode($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt
        ]);

        if (!$response->successful()) {
            throw new Exception("Google OAuth token request failed: " . $response->body());
        }

        $data = $response->json();
        return $data['access_token'];
    }

    /**
     * Upload a local file to the configured Google Drive folder.
     */
    public function uploadFile(string $filePath, string $fileName, string $mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'): array
    {
        if (!file_exists($filePath)) {
            throw new Exception("File not found at path: {$filePath}");
        }

        $accessToken = $this->getAccessToken();
        $fileContent = file_get_contents($filePath);

        $metadata = [
            'name' => $fileName,
            'parents' => [$this->folderId]
        ];

        // Multipart upload via Google Drive v3 REST API
        $boundary = 'foo_bar_baz_' . uniqid();
        $delimiter = "--" . $boundary;
        $closeDelimiter = "--" . $boundary . "--";

        $multipartBody = $delimiter . "\r\n";
        $multipartBody .= "Content-Type: application/json; charset=UTF-8\r\n\r\n";
        $multipartBody .= json_encode($metadata) . "\r\n";
        $multipartBody .= $delimiter . "\r\n";
        $multipartBody .= "Content-Type: " . $mimeType . "\r\n\r\n";
        $multipartBody .= $fileContent . "\r\n";
        $multipartBody .= $closeDelimiter;

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Content-Type' => 'multipart/related; boundary=' . $boundary,
            'Content-Length' => strlen($multipartBody)
        ])->withBody($multipartBody, 'multipart/related; boundary=' . $boundary)
          ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,createdTime');

        if (!$response->successful()) {
            throw new Exception("Google Drive upload failed (" . $response->status() . "): " . $response->body());
        }

        $uploaded = $response->json();

        Log::info("Google Drive upload successful. File ID: {$uploaded['id']}, Name: {$uploaded['name']}");

        return [
            'file_id' => $uploaded['id'] ?? null,
            'name' => $uploaded['name'] ?? $fileName,
            'view_link' => $uploaded['webViewLink'] ?? "https://drive.google.com/file/d/" . ($uploaded['id'] ?? '') . "/view",
            'created_time' => $uploaded['createdTime'] ?? date('c'),
        ];
    }
}
