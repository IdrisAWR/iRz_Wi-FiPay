<?php

namespace App\Console\Commands;

use App\Services\GoogleDriveService;
use App\Services\MonthlyReportExportService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Throwable;

class UploadMonthlyReportToDrive extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:upload-drive {--month= : Month in YYYY-MM format (optional)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate monthly report Excel file and upload automatically to Google Drive';

    /**
     * Execute the console command.
     */
    public function handle(MonthlyReportExportService $exportService, GoogleDriveService $driveService): int
    {
        $month = $this->option('month') ?? Carbon::now()->format('Y-m');

        $this->info("Starting monthly report generation for month: {$month}");

        if (!$driveService->isConfigured()) {
            $this->error("Google Drive is not configured! Please provide GOOGLE_DRIVE_FOLDER_ID and GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON in .env");
            return Command::FAILURE;
        }

        try {
            $filePath = $exportService->generateXlsx($month);
            $fileName = "Laporan_iRz_WiFi_{$month}.xlsx";

            $this->info("Excel report generated at: {$filePath}");
            $this->info("Uploading file to Google Drive...");

            $result = $driveService->uploadFile($filePath, $fileName);

            // Clean up temporary local file
            if (file_exists($filePath)) {
                @unlink($filePath);
            }

            $this->info("Successfully uploaded monthly report to Google Drive!");
            $this->info("File ID: " . $result['file_id']);
            $this->info("View Link: " . $result['view_link']);

            return Command::SUCCESS;
        } catch (Throwable $e) {
            $this->error("Failed to upload monthly report: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
