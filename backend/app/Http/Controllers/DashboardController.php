<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Payment;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $currentMonth = Carbon::now()->format('Y-m');
        
        $totalCustomers = Customer::count();
        
        // Total pembayaran bulan ini (berdasarkan for_month)
        $paymentsThisMonth = Payment::where('for_month', $currentMonth)->get();
        
        $sudahBayarCount = $paymentsThisMonth->unique('customer_id')->count();
        $belumBayarCount = max(0, $totalCustomers - $sudahBayarCount);
        
        $totalPendapatan = $paymentsThisMonth->sum('amount');

        // Data Grafik: Pendapatan 6 bulan terakhir
        $chartData = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i)->format('Y-m');
            $monthName = Carbon::now()->subMonths($i)->translatedFormat('M Y'); // ex: May 2026
            $revenue = Payment::where('for_month', $month)->sum('amount');
            
            $chartData[] = [
                'name' => $monthName,
                'revenue' => (int) $revenue
            ];
        }

        return response()->json([
            'total_customers' => $totalCustomers,
            'sudah_bayar_bulan_ini' => $sudahBayarCount,
            'belum_bayar_bulan_ini' => $belumBayarCount,
            'total_pendapatan_bulan_ini' => $totalPendapatan,
            'chart_data' => $chartData
        ]);
    }
}
