<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IotReading extends Model
{
    protected $fillable = [
        'collection_point_id', 'fill_level', 'temperature', 'fire_alert', 'read_at',
    ];

    protected $casts = [
        'fill_level'  => 'integer',
        'temperature' => 'float',
        'fire_alert'  => 'boolean',
        'read_at'     => 'datetime',
    ];

    public function collectionPoint(): BelongsTo
    {
        return $this->belongsTo(CollectionPoint::class);
    }
}
