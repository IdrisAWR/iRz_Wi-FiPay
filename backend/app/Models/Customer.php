<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'ip_address',
        'package_name',
        'monthly_fee',
        'active_date',
        'status',
    ];

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
