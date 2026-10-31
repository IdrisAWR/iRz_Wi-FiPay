<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function monthly(Request $request)
    {
        $month = $request->query('month', Carbon::now()->format('Y-m'));
        
        $payments = Payment::where('for_month', $month)->with('customer')->get();
        $sudahBayarCount = $payments->unique('customer_id')->count();
        
        $totalPendapatan = $payments->sum('amount');
        
        $paidCustomerIds = $payments->pluck('customer_id')->toArray();
        $monthDate = $month . '-01';

        $unpaidCustomersQuery = Customer::where('status', 'active')
            ->whereNotIn('id', $paidCustomerIds)
            ->get();
            
        $unpaidCustomers = $unpaidCustomersQuery->filter(function($customer) use ($monthDate) {
            $activeDateStr = substr($customer->active_date, 0, 7) . '-01';
            return $activeDateStr <= $monthDate;
        })->values();

        $eligibleTotalCustomersCount = $sudahBayarCount + $unpaidCustomers->count();
        
        // Simpel rekap, belum termasuk total tunggakan global (karena perlu logic cek per customer)
        return response()->json([
            'month' => $month,
            'total_customers' => $eligibleTotalCustomersCount,
            'sudah_bayar' => $sudahBayarCount,
            'belum_bayar' => $unpaidCustomers->count(),
            'total_pendapatan' => $totalPendapatan,
            'payments' => $payments,
            'unpaid_customers' => $unpaidCustomers
        ]);
    }

    public function yearly(Request $request)
    {
        $year = $request->query('year', Carbon::now()->format('Y'));
        
        $customers = Customer::where('status', 'active')
            ->with(['payments' => function($q) use ($year) {
                $q->where('for_month', 'like', $year . '-%');
            }])
            ->orderBy('name')
            ->get();

        $data = $customers->map(function($customer) {
            $paidMonths = $customer->payments->pluck('for_month')->toArray();
            return [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'monthly_fee' => $customer->monthly_fee,
                'active_date' => $customer->active_date,
                'paid_months' => $paidMonths
            ];
        });

        return response()->json([
            'year' => $year,
            'data' => $data
        ]);
    }

    public function uploadToDrive(Request $request, \App\Services\MonthlyReportExportService $exportService, \App\Services\GoogleDriveService $driveService)
    {
        $month = $request->input('month', Carbon::now()->format('Y-m'));

        if (!$driveService->isConfigured()) {
            return response()->json([
                'message' => 'Konfigurasi Google Drive belum lengkap. Silakan atur Folder ID dan Service Account Credentials terlebih dahulu.'
            ], 422);
        }

        try {
            $filePath = $exportService->generateXlsx($month);
            $fileName = "Laporan_iRz_WiFi_{$month}.xlsx";

            $result = $driveService->uploadFile($filePath, $fileName);

            if (file_exists($filePath)) {
                @unlink($filePath);
            }

            return response()->json([
                'message' => "Laporan bulan {$month} berhasil diunggah ke Google Drive!",
                'data' => $result
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal mengunggah laporan ke Google Drive: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getDriveStatus(\App\Services\GoogleDriveService $driveService, \App\Services\GoogleSheetsService $sheetsService)
    {
        $folderId = config('services.google_drive.folder_id');
        $spreadsheetId = config('services.google_drive.spreadsheet_id');
        $hasServiceAccount = !empty(config('services.google_drive.service_account_json'));

        return response()->json([
            'is_configured' => $driveService->isConfigured(),
            'folder_id' => $folderId ? (substr($folderId, 0, 6) . '...') : null,
            'sheets_configured' => $sheetsService->isConfigured(),
            'spreadsheet_id' => $spreadsheetId ? (substr($spreadsheetId, 0, 6) . '...') : null,
            'spreadsheet_link' => $sheetsService->getSpreadsheetLink(),
            'has_service_account' => $hasServiceAccount,
            'auto_upload_enabled' => (bool) config('services.google_drive.auto_upload', true)
        ]);
    }

    public function syncSheets(\App\Services\GoogleSheetsService $sheetsService)
    {
        if (!$sheetsService->isConfigured()) {
            return response()->json([
                'message' => 'Konfigurasi Google Sheets belum lengkap. Silakan isi GOOGLE_SPREADSHEET_ID dan Service Account Credentials terlebih dahulu.'
            ], 422);
        }

        try {
            $count = $sheetsService->syncAllPayments();

            return response()->json([
                'message' => "Berhasil menyinkronkan {$count} data transaksi ke Google Spreadsheet!",
                'count' => $count,
                'spreadsheet_link' => $sheetsService->getSpreadsheetLink()
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal menyinkronkan ke Google Sheets: ' . $e->getMessage()
            ], 500);
        }
    }
}

