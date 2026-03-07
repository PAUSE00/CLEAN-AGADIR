<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionLog extends Model
{
    protected $fillable = [
        'route_id', 'collection_point_id', 'truck_id',
        'collected', 'fill_level_at_collection', 'notes', 'collected_at',
    ];

    protected $casts = [
        'collected'   => 'boolean',
        'collected_at'=> 'datetime',
    ];

    public function route(): BelongsTo { return $this->belongsTo(Route::class); }
    public function collectionPoint(): BelongsTo { return $this->belongsTo(CollectionPoint::class); }
    public function truck(): BelongsTo { return $this->belongsTo(Truck::class); }
}
