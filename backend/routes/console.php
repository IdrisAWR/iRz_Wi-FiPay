<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule automatic upload of monthly financial report to Google Drive on the last day of each month at 23:59
Schedule::command('reports:upload-drive')->lastDayOfMonth('23:59');

