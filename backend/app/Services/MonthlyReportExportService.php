<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Payment;
use Carbon\Carbon;

class MonthlyReportExportService
{
    /**
     * Generate an Excel file for the given month (YYYY-MM).
     * Returns the absolute path to the generated temp file.
     */
    public function generateXlsx(string $month): string
    {
        if (class_exists('PhpOffice\PhpSpreadsheet\Spreadsheet')) {
            return $this->generateWithPhpSpreadsheet($month);
        }

        return $this->generateHtmlExcel($month);
    }

    protected function generateWithPhpSpreadsheet(string $month): string
    {
        $monthDate = Carbon::createFromFormat('Y-m', $month);
        $monthName = $monthDate->translatedFormat('F Y');

        $payments = Payment::where('for_month', $month)->with('customer')->orderBy('payment_date', 'asc')->get();
        $sudahBayarCount = $payments->unique('customer_id')->count();
        $totalPendapatan = $payments->sum('amount');
        
        $paidCustomerIds = $payments->pluck('customer_id')->toArray();
        $firstDayOfMonthStr = $month . '-01';

        $unpaidCustomersQuery = Customer::where('status', 'active')
            ->whereNotIn('id', $paidCustomerIds)
            ->get();
            
        $unpaidCustomers = $unpaidCustomersQuery->filter(function($customer) use ($firstDayOfMonthStr) {
            $activeDateStr = substr($customer->active_date, 0, 7) . '-01';
            return $activeDateStr <= $firstDayOfMonthStr;
        })->values();

        $totalCustomers = $sudahBayarCount + $unpaidCustomers->count();
        $belumBayarCount = $unpaidCustomers->count();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle("Laporan {$month}");

        // Header Title
        $sheet->setCellValue('A1', "LAPORAN KEUANGAN iRz WiFi - {$monthName}");
        $sheet->mergeCells('A1:D1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Summary Section
        $sheet->setCellValue('A3', 'RINGKASAN LAPORAN');
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(12);

        $summaryData = [
            ['Total Pelanggan', $totalCustomers],
            ['Sudah Bayar', $sudahBayarCount],
            ['Belum Bayar', $belumBayarCount],
            ['Total Pendapatan', 'Rp ' . number_format($totalPendapatan, 0, ',', '.')],
        ];

        $row = 4;
        foreach ($summaryData as $item) {
            $sheet->setCellValue("A{$row}", $item[0]);
            $sheet->setCellValue("B{$row}", $item[1]);
            $sheet->getStyle("A{$row}")->getFont()->setBold(true);
            $row++;
        }

        // Section 1: Transaction Details (Sudah Bayar)
        $row += 1;
        $sheet->setCellValue("A{$row}", "DAFTAR PEMBAYARAN (SUDAH BAYAR)");
        $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(12);
        
        $row++;
        $sheet->setCellValue("A{$row}", 'Tanggal');
        $sheet->setCellValue("B{$row}", 'Nama Pelanggan');
        $sheet->setCellValue("C{$row}", 'Paket');
        $sheet->setCellValue("D{$row}", 'Nominal (Rp)');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E40AF']
            ],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER]
        ];
        $sheet->getStyle("A{$row}:D{$row}")->applyFromArray($headerStyle);

        $row++;
        if ($payments->count() === 0) {
            $sheet->setCellValue("A{$row}", "Tidak ada transaksi pada bulan ini");
            $sheet->mergeCells("A{$row}:D{$row}");
            $row++;
        } else {
            foreach ($payments as $p) {
                $sheet->setCellValue("A{$row}", $p->payment_date);
                $sheet->setCellValue("B{$row}", $p->customer ? $p->customer->name : '-');
                $sheet->setCellValue("C{$row}", $p->customer ? $p->customer->package_name : '-');
                $sheet->setCellValue("D{$row}", $p->amount);
                $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode('#,##0');
                $row++;
            }
        }

        // Section 2: Unpaid Customers Breakdown
        $row += 1;
        $sheet->setCellValue("A{$row}", "DAFTAR PELANGGAN BELUM BAYAR");
        $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(12);

        $row++;
        $sheet->setCellValue("A{$row}", 'Nama Pelanggan');
        $sheet->setCellValue("B{$row}", 'No. Telepon');
        $sheet->setCellValue("C{$row}", 'Tanggal Aktif');
        $sheet->setCellValue("D{$row}", 'Tagihan (Rp)');

        $unpaidHeaderStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'DC2626']
            ],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER]
        ];
        $sheet->getStyle("A{$row}:D{$row}")->applyFromArray($unpaidHeaderStyle);

        $row++;
        if ($unpaidCustomers->count() === 0) {
            $sheet->setCellValue("A{$row}", "Semua pelanggan aktif telah membayar");
            $sheet->mergeCells("A{$row}:D{$row}");
        } else {
            foreach ($unpaidCustomers as $c) {
                $sheet->setCellValue("A{$row}", $c->name);
                $sheet->setCellValue("B{$row}", $c->phone ?? '-');
                $sheet->setCellValue("C{$row}", $c->active_date ?? '-');
                $sheet->setCellValue("D{$row}", $c->monthly_fee);
                $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode('#,##0');
                $row++;
            }
        }

        foreach (range('A', 'D') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $tempDir = storage_path('app/temp_reports');
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        $filePath = $tempDir . DIRECTORY_SEPARATOR . "Laporan_iRz_WiFi_{$month}.xlsx";
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Fallback HTML-Excel generator when PhpSpreadsheet is unavailable.
     */
    protected function generateHtmlExcel(string $month): string
    {
        $monthDate = Carbon::createFromFormat('Y-m', $month);
        $monthName = $monthDate->translatedFormat('F Y');

        $payments = Payment::where('for_month', $month)->with('customer')->orderBy('payment_date', 'asc')->get();
        $sudahBayarCount = $payments->unique('customer_id')->count();
        $totalPendapatan = $payments->sum('amount');
        
        $paidCustomerIds = $payments->pluck('customer_id')->toArray();
        $firstDayOfMonthStr = $month . '-01';

        $unpaidCustomersQuery = Customer::where('status', 'active')
            ->whereNotIn('id', $paidCustomerIds)
            ->get();
            
        $unpaidCustomers = $unpaidCustomersQuery->filter(function($customer) use ($firstDayOfMonthStr) {
            $activeDateStr = substr($customer->active_date, 0, 7) . '-01';
            return $activeDateStr <= $firstDayOfMonthStr;
        })->values();

        $totalCustomers = $sudahBayarCount + $unpaidCustomers->count();
        $belumBayarCount = $unpaidCustomers->count();

        ob_start();
        ?>
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { bg-color: #1E40AF; color: #ffffff; text-align: left; }
                .title { font-size: 18px; font-weight: bold; text-align: center; }
                .header-blue { background-color: #1E40AF; color: #ffffff; font-weight: bold; }
                .header-red { background-color: #DC2626; color: #ffffff; font-weight: bold; }
                .number { text-align: right; }
            </style>
        </head>
        <body>
            <table>
                <tr><td colspan="4" class="title">LAPORAN KEUANGAN iRz WiFi - <?= htmlspecialchars($monthName) ?></td></tr>
                <tr><td colspan="4"></td></tr>
                <tr><td colspan="4"><b>RINGKASAN LAPORAN</b></td></tr>
                <tr><td><b>Total Pelanggan</b></td><td><?= $totalCustomers ?></td><td colspan="2"></td></tr>
                <tr><td><b>Sudah Bayar</b></td><td><?= $sudahBayarCount ?></td><td colspan="2"></td></tr>
                <tr><td><b>Belum Bayar</b></td><td><?= $belumBayarCount ?></td><td colspan="2"></td></tr>
                <tr><td><b>Total Pendapatan</b></td><td>Rp <?= number_format($totalPendapatan, 0, ',', '.') ?></td><td colspan="2"></td></tr>
                <tr><td colspan="4"></td></tr>
                <tr><td colspan="4"><b>DAFTAR PEMBAYARAN (SUDAH BAYAR)</b></td></tr>
                <tr class="header-blue">
                    <th>Tanggal</th>
                    <th>Nama Pelanggan</th>
                    <th>Paket</th>
                    <th>Nominal (Rp)</th>
                </tr>
                <?php if ($payments->count() === 0): ?>
                    <tr><td colspan="4">Tidak ada transaksi pada bulan ini</td></tr>
                <?php else: ?>
                    <?php foreach ($payments as $p): ?>
                        <tr>
                            <td><?= htmlspecialchars($p->payment_date) ?></td>
                            <td><?= htmlspecialchars($p->customer ? $p->customer->name : '-') ?></td>
                            <td><?= htmlspecialchars($p->customer ? $p->customer->package_name : '-') ?></td>
                            <td class="number"><?= number_format($p->amount, 0, ',', '.') ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                <tr><td colspan="4"></td></tr>
                <tr><td colspan="4"><b>DAFTAR PELANGGAN BELUM BAYAR</b></td></tr>
                <tr class="header-red">
                    <th>Nama Pelanggan</th>
                    <th>No. Telepon</th>
                    <th>Tanggal Aktif</th>
                    <th>Tagihan (Rp)</th>
                </tr>
                <?php if ($unpaidCustomers->count() === 0): ?>
                    <tr><td colspan="4">Semua pelanggan aktif telah membayar</td></tr>
                <?php else: ?>
                    <?php foreach ($unpaidCustomers as $c): ?>
                        <tr>
                            <td><?= htmlspecialchars($c->name) ?></td>
                            <td><?= htmlspecialchars($c->phone ?? '-') ?></td>
                            <td><?= htmlspecialchars($c->active_date ?? '-') ?></td>
                            <td class="number"><?= number_format($c->monthly_fee, 0, ',', '.') ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </table>
        </body>
        </html>
        <?php
        $htmlContent = ob_get_clean();

        $tempDir = storage_path('app/temp_reports');
        if (!file_exists($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        $filePath = $tempDir . DIRECTORY_SEPARATOR . "Laporan_iRz_WiFi_{$month}.xls";
        file_put_contents($filePath, $htmlContent);

        return $filePath;
    }
}
