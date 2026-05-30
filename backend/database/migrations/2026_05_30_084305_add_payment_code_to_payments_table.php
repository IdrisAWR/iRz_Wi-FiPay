<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('payments', 'payment_code')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('payment_code');
            });
        }
        
        Schema::table('payments', function (Blueprint $table) {
            $table->string('payment_code')->nullable()->after('id');
        });

        // Backfill existing records
        $payments = DB::table('payments')->get();
        foreach ($payments as $payment) {
            DB::table('payments')
                ->where('id', $payment->id)
                ->update(['payment_code' => 'IRW-' . str_replace('-', '', date('Ymd')) . '-' . strtoupper(Str::random(4))]);
        }

        Schema::table('payments', function (Blueprint $table) {
            $table->unique('payment_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['payment_code']);
            $table->dropColumn('payment_code');
        });
    }
};
