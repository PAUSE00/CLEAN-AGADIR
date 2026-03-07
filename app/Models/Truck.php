<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Truck extends Model
{
    protected $fillable = [
        'name', 'size', 'waste_type', 'capacity',
        'status', 'current_lat', 'current_lng',
    ];

    protected $casts = [
        'capacity'    => 'integer',
        'current_lat' => 'float',
        'current_lng' => 'float',
    ];

    public static array $capacities = [
        'small'  => 30,
        'medium' => 60,
        'large'  => 120,
    ];

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class);
    }

    public function activeRoute()
    {
        return $this->hasOne(Route::class)->where('status', 'in_progress');
    }
}
