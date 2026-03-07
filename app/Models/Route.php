<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Route extends Model
{
    protected $fillable = [
        'truck_id', 'algorithm', 'points_order',
        'total_distance_km', 'co2_kg', 'computation_ms',
        'status', 'scheduled_date',
    ];

    protected $casts = [
        'points_order'      => 'array',
        'total_distance_km' => 'float',
        'co2_kg'            => 'float',
        'computation_ms'    => 'integer',
        'scheduled_date'    => 'date',
    ];

    public function truck(): BelongsTo
    {
        return $this->belongsTo(Truck::class);
    }

    public function collectionLogs(): HasMany
    {
        return $this->hasMany(CollectionLog::class);
    }
}
