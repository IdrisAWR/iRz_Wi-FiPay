<?php

namespace App\Services;

use App\Models\Payment;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleSheetsService
{
    protected ?string $spreadsheetId;
    protected ?string $serviceAccountJson;

    public function __construct(?string $spreadsheetId = null, ?string $serviceAccountJson = null)
    {
        $this->spreadsheetId = $spreadsheetId ?? config('services.google_drive.spreadsheet_id');
        $this->serviceAccountJson = $serviceAccountJson ?? config('services.google_drive.service_account_json');
    }

    /**
     * Check if Google Sheets configuration is present.
     */
    public function isConfigured(): bool
    {
        return !empty($this->spreadsheetId) && !empty($this->serviceAccountJson);
    }

    /**
     * Get the web link to open the Google Spreadsheet.
     */
    public function getSpreadsheetLink(): ?string
    {
        if (empty($this->spreadsheetId)) {
            return null;
        }

        return "https://docs.google.com/spreadsheets/d/{$this->spreadsheetId}/edit";
    }

    /**
     * Parse service account config.
     */
    protected function getServiceAccountConfig(): array
    {
        if (!$this->isConfigured()) {
            throw new Exception("Google Sheets configuration is incomplete. Please set GOOGLE_SPREADSHEET_ID and GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON in .env.");
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

    protected function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Obtain Google OAuth2 Access Token for Spreadsheets API scope.
     */
    protected function getAccessToken(): string
    {
        $config = $this->getServiceAccountConfig();
        $now = time();

        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT'
        ]));

        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $config['client_email'],
            'scope' => 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
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
     * Append a single payment transaction row to the Google Spreadsheet.
     */
    public function appendPayment(Payment $payment): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $payment->loadMissing(['customer', 'user']);

        $rowValues = [
            $payment->payment_date,
            $payment->payment_code,
            $payment->customer ? $payment->customer->name : '-',
            $payment->customer ? $payment->customer->package_name : '-',
            $payment->amount,
            $payment->for_month,
            $payment->user ? $payment->user->name : 'System'
        ];

        return $this->appendRows([$rowValues]);
    }

    /**
     * Bulk append multiple rows or sync all payments to Google Spreadsheet.
     */
    public function syncAllPayments(): int
    {
        if (!$this->isConfigured()) {
            throw new Exception("Google Sheets is not configured.");
        }

        // Ensure header exists first
        $this->ensureHeaders();

        $payments = Payment::with(['customer', 'user'])->orderBy('payment_date', 'asc')->get();

        if ($payments->isEmpty()) {
            return 0;
        }

        $rows = [];
        foreach ($payments as $payment) {
            $rows[] = [
                $payment->payment_date,
                $payment->payment_code,
                $payment->customer ? $payment->customer->name : '-',
                $payment->customer ? $payment->customer->package_name : '-',
                $payment->amount,
                $payment->for_month,
                $payment->user ? $payment->user->name : 'System'
            ];
        }

        $this->appendRows($rows);

        return count($rows);
    }

    /**
     * Append rows array to Google Sheet via REST API v4.
     */
    protected function appendRows(array $values): bool
    {
        $accessToken = $this->getAccessToken();
        $range = 'A1';

        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/{$range}:append?valueInputOption=USER_ENTERED";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Content-Type' => 'application/json'
        ])->post($url, [
            'range' => $range,
            'majorDimension' => 'ROWS',
            'values' => $values
        ]);

        if (!$response->successful()) {
            Log::error("Google Sheets append failed (" . $response->status() . "): " . $response->body());
            throw new Exception("Google Sheets API append error: " . $response->body());
        }

        Log::info("Successfully appended " . count($values) . " row(s) to Google Spreadsheet ID: {$this->spreadsheetId}");
        return true;
    }

    /**
     * Check if table header exists on Row 1, if not create headers.
     */
    protected function ensureHeaders(): void
    {
        try {
            $accessToken = $this->getAccessToken();
            $url = "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/A1:G1";

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
            ])->get($url);

            if ($response->successful()) {
                $data = $response->json();
                if (!empty($data['values']) && count($data['values']) > 0) {
                    // Header already exists
                    return;
                }
            }

            // Append header row
            $headers = [
                ['Tanggal Transaksi', 'Kode Nota', 'Nama Pelanggan', 'Paket', 'Nominal (Rp)', 'Bulan Tagihan', 'Petugas Admin']
            ];
            $this->appendRows($headers);
        } catch (Exception $e) {
            Log::warning("Could not check/create Google Sheets headers: " . $e->getMessage());
        }
    }
}
