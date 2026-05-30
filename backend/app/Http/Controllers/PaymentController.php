<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function index()
    {
        return response()->json(Payment::with(['customer', 'user'])->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'payment_date' => 'required|date',
            'for_month' => 'required|string',
            'amount' => 'required|numeric',
            'proof_image' => 'nullable|string', // Base64 image
            'payment_code' => 'required|string|unique:payments,payment_code'
        ]);

        // Cek apakah pelanggan sudah membayar untuk bulan ini
        $exists = Payment::where('customer_id', $validated['customer_id'])
                         ->where('for_month', $validated['for_month'])
                         ->exists();

        if ($exists) {
            return response()->json(['message' => 'Pembayaran ganda: Tagihan untuk bulan ini sudah dilunasi.'], 422);
        }

        $path = null;
        if (!empty($validated['proof_image'])) {
            $path = $this->saveBase64Image($validated['proof_image']);
        }

        $payment = Payment::create([
            'customer_id' => $validated['customer_id'],
            'user_id' => $request->user()->id,
            'payment_date' => $validated['payment_date'],
            'for_month' => $validated['for_month'],
            'amount' => $validated['amount'],
            'proof_image_path' => $path,
            'payment_code' => $validated['payment_code']
        ]);

        return response()->json($payment->load('customer'), 201);
    }

    public function sync(Request $request)
    {
        $validated = $request->validate([
            'payments' => 'required|array',
            'payments.*.customer_id' => 'required|exists:customers,id',
            'payments.*.payment_date' => 'required|date',
            'payments.*.for_month' => 'required|string',
            'payments.*.amount' => 'required|numeric',
            'payments.*.proof_image' => 'nullable|string', // Base64
            'payments.*.payment_code' => 'required|string|unique:payments,payment_code'
        ]);

        $created = [];
        foreach ($validated['payments'] as $payData) {
            // Cek duplikasi saat sinkronisasi
            $exists = Payment::where('customer_id', $payData['customer_id'])
                             ->where('for_month', $payData['for_month'])
                             ->exists();

            if ($exists) {
                continue; // Lewati jika sudah pernah disinkronisasi/dibayar
            }

            $path = null;
            if (!empty($payData['proof_image'])) {
                $path = $this->saveBase64Image($payData['proof_image']);
            }

            $payment = Payment::create([
                'customer_id' => $payData['customer_id'],
                'user_id' => $request->user()->id,
                'payment_date' => $payData['payment_date'],
                'for_month' => $payData['for_month'],
                'amount' => $payData['amount'],
                'proof_image_path' => $path,
                'payment_code' => $payData['payment_code']
            ]);
            
            $created[] = $payment;
        }

        return response()->json(['message' => 'Synced successfully', 'payments' => $created], 200);
    }

    public function verify($code)
    {
        $payment = Payment::with('customer')->where('payment_code', $code)->first();

        if (!$payment) {
            return response()->json(['message' => 'Payment code not found'], 404);
        }

        return response()->json($payment, 200);
    }

    private function saveBase64Image($base64Image)
    {
        // Extract base64 data
        @list($type, $file_data) = explode(';', $base64Image);
        @list(, $file_data) = explode(',', $file_data);
        
        $imageName = Str::random(32) . '.jpg';
        Storage::disk('public')->put('proofs/' . $imageName, base64_decode($file_data));
        return 'proofs/' . $imageName;
    }

    public function destroy($id)
    {
        $payment = Payment::find($id);
        if (!$payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }

        if ($payment->proof_image_path) {
            Storage::disk('public')->delete($payment->proof_image_path);
        }
        
        $payment->delete();
        
        return response()->json(['message' => 'Payment deleted successfully']);
    }
}
