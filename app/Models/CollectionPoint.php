<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectionPoint extends Model
{
    protected $fillable = [
        'name',
        'type',
        'waste_category',
        'lat',
        'lng',
        'fill_level',
        'priority',
        'last_collected_at',
        'is_active',
        'is_depot',
        'open_time',
        'close_time',
        'zone',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'fill_level' => 'integer',
        'is_active' => 'boolean',
        'is_depot' => 'boolean',
        'last_collected_at' => 'datetime',
    ];

    // Type → waste category mapping
    public static array $typeMap = [
        'pharmacy'    => 'medical',
        'clinic'      => 'medical',
        'doctors'     => 'medical',
        'cafe'        => 'organic',
        'restaurant'  => 'organic',
        'fast_food'   => 'organic',
        'bakery'      => 'organic',
        'butcher'     => 'organic',
        'supermarket' => 'recyclable',
        'convenience' => 'recyclable',
        'marketplace' => 'recyclable',
        'bank'        => 'paper',
        'school'      => 'paper',
        'library'     => 'paper',
        'post_office' => 'paper',
        'post_office;bank' => 'paper',
    ];

    public static function wasteCategory(string $type): string
    {
        return self::$typeMap[$type] ?? 'general';
    }

    public function iotReadings(): HasMany
    {
        return $this->hasMany(IotReading::class);
    }

    public function latestReading()
    {
        return $this->hasOne(IotReading::class)->latestOfMany('read_at');
    }

    public function collectionLogs(): HasMany
    {
        return $this->hasMany(CollectionLog::class);
    }

    public function updatePriority(): void
    {
        $this->priority = match (true) {
            $this->fill_level >= 90 => 'critical',
            $this->fill_level >= 75 => 'high',
            $this->fill_level >= 50 => 'medium',
            default                 => 'low',
        };
        $this->save();
    }
}
