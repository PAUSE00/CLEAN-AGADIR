<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionPoint;
use App\Models\Truck;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CollectionPointController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $pointsArray = Cache::remember('collection_points_all', 3600, function () {
            return CollectionPoint::where(function ($q) {
                $q->where('is_active', true)->orWhere('is_depot', true);
            })
                ->select('id', 'name', 'type', 'waste_category', 'lat', 'lng', 'fill_level', 'priority', 'last_collected_at', 'open_time', 'close_time', 'zone', 'is_depot')
                ->get()
                ->toArray();
        });

        // Convert back to collection for easy filtering
        $allPoints = collect($pointsArray);

        // Filter the collection in memory
        $points = $allPoints;

        if ($request->category && $request->category !== 'all') {
            $points = $points->where('waste_category', $request->category);
        }
        if ($request->priority && $request->priority !== 'all') {
            $points = $points->where('priority', $request->priority);
        }
        if ($request->search) {
            $points = $points->filter(fn($p) => str_contains(strtolower($p['name'] ?? ''), strtolower($request->search)));
        }

        return response()->json($points->values());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'type'  => 'required|string',
            'lat'   => 'required|numeric|between:-90,90',
            'lng'   => 'required|numeric|between:-180,180',
        ]);

        $data['waste_category'] = CollectionPoint::wasteCategory($data['type']);
        $point = CollectionPoint::create($data);

        Cache::forget('collection_points_all'); // Invalidate cache

        return response()->json($point, 201);
    }

    // Truck CRUD
    public function trucks(): JsonResponse
    {
        return response()->json(Truck::all());
    }

    public function storeTruck(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:50',
            'size'       => 'required|in:small,medium,large',
            'waste_type' => 'required|string',
        ]);
        $data['capacity'] = Truck::$capacities[$data['size']];
        return response()->json(Truck::create($data), 201);
    }

    public function destroyTruck(Truck $truck): JsonResponse
    {
        $truck->delete();
        return response()->json(['deleted' => true]);
    }

    /**
     * Collect points — reset fill_level to 0% when a truck visits them.
     */
    public function collect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'point_ids'   => 'required|array|min:1',
            'point_ids.*' => 'integer|exists:collection_points,id',
        ]);

        $count = CollectionPoint::whereIn('id', $validated['point_ids'])
            ->update([
                'fill_level'       => 0,
                'priority'         => 'low',
                'last_collected_at' => now(),
            ]);

        Cache::forget('collection_points_all'); // Invalidate cache when collected

        return response()->json([
            'collected' => $count,
            'message'   => "$count points collectés avec succès.",
        ]);
    }
}
