<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index()
    {
        return response()->json(Customer::with('payments')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'ip_address' => 'nullable|string|max:50',
            'package_name' => 'required|string|max:100',
            'monthly_fee' => 'required|numeric|min:0',
            'active_date' => 'required|date',
            'status' => 'required|in:active,inactive',
        ]);

        $customer = Customer::create($validated);
        return response()->json($customer->load('payments'), 201);
    }

    public function show(Customer $customer)
    {
        return response()->json($customer->load('payments'));
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'ip_address' => 'nullable|string|max:50',
            'package_name' => 'sometimes|required|string|max:100',
            'monthly_fee' => 'sometimes|required|numeric|min:0',
            'active_date' => 'sometimes|required|date',
            'status' => 'sometimes|required|in:active,inactive',
        ]);

        $customer->update($validated);
        return response()->json($customer->load('payments'));
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();
        return response()->json(['message' => 'Customer deleted']);
    }
    public function import(Request $request)
    {
        $validated = $request->validate([
            'customers' => 'required|array',
            'customers.*.name' => 'required|string|max:255',
            'customers.*.phone' => 'nullable|string|max:20',
            'customers.*.ip_address' => 'nullable|string|max:50',
            'customers.*.package_name' => 'required|string|max:100',
            'customers.*.monthly_fee' => 'required|numeric|min:0',
            'customers.*.active_date' => 'required|date',
            'customers.*.status' => 'required|in:active,inactive',
        ]);

        $created = 0;
        $skipped = 0;

        foreach ($validated['customers'] as $custData) {
            $exists = Customer::where('name', $custData['name'])->exists();
            if ($exists) {
                $skipped++;
                continue;
            }

            Customer::create($custData);
            $created++;
        }

        return response()->json([
            'message' => 'Import completed',
            'created' => $created,
            'skipped' => $skipped
        ], 200);
    }
}
