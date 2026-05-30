<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::post('/customers/import', [CustomerController::class, 'import']);
    Route::apiResource('customers', CustomerController::class);
    
    Route::apiResource('payments', PaymentController::class);
    Route::post('/payments/sync', [PaymentController::class, 'sync']); // For offline sync

    Route::get('/reports/monthly', [ReportController::class, 'monthly']);
    Route::get('/reports/yearly', [ReportController::class, 'yearly']);
    
    Route::apiResource('users', UserController::class)->except(['show', 'update']);
});

Route::get('/payments/verify/{code}', [PaymentController::class, 'verify']);
