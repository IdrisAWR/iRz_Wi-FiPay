<?php

namespace App\Console\Commands;

use App\Services\GoogleSheetsService;
use Illuminate\Console\Command;
use Throwable;

class SyncPaymentsToGoogleSheets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sheets:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync all stored payment transactions to Google Spreadsheet';

    /**
     * Execute the console command.
     */
    public function handle(GoogleSheetsService $sheetsService): int
    {
        $this->info("Starting bulk payment synchronization to Google Spreadsheet...");

        if (!$sheetsService->isConfigured()) {
            $this->error("Google Sheets is not configured! Please provide GOOGLE_SPREADSHEET_ID and GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON in .env");
            return Command::FAILURE;
        }

        try {
            $count = $sheetsService->syncAllPayments();

            $this->info("Successfully synchronized {$count} payment transaction(s) to Google Spreadsheet!");
            $this->info("Spreadsheet Link: " . $sheetsService->getSpreadsheetLink());

            return Command::SUCCESS;
        } catch (Throwable $e) {
            $this->error("Failed to sync payments to Google Spreadsheet: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
