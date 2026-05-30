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
        
        $totalCustomers = Customer::count();
        $payments = Payment::where('for_month', $month)->with('customer')->get();
        
        $sudahBayarCount = $payments->unique('customer_id')->count();
        $belumBayarCount = max(0, $totalCustomers - $sudahBayarCount);
        
        $totalPendapatan = $payments->sum('amount');
        
        // Simpel rekap, belum termasuk total tunggakan global (karena perlu logic cek per customer)
        return response()->json([
            'month' => $month,
            'total_customers' => $totalCustomers,
            'sudah_bayar' => $sudahBayarCount,
            'belum_bayar' => $belumBayarCount,
            'total_pendapatan' => $totalPendapatan,
            'payments' => $payments
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
}
