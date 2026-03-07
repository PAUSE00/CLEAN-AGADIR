<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionPoint;
use App\Models\Truck;
use App\Models\Route;
use App\Services\VrpService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VrpController extends Controller
{
    public function __construct(private VrpService $vrp) {}

    public function optimize(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'num_trucks'    => 'nullable|integer|min:0|max:100',
            'capacity'      => 'required|integer|min:10|max:10000',
            'algorithm'     => 'required|in:greedy,2opt,tabu,kmeans,nsga',
            'iterations'    => 'integer|min:10|max:300',
            'waste_filter'  => 'nullable|string|in:all,medical,organic,recyclable,paper,general',
            'scheduled_date' => 'nullable|date',
            'truck_ids'     => 'nullable|array',
            'points_override' => 'nullable|array',
        ]);

        if (!empty($validated['points_override'])) {
            $points = $validated['points_override'];
        } else {
            $query = CollectionPoint::where('is_active', true)->where('is_depot', false);
            if (!empty($validated['waste_filter']) && $validated['waste_filter'] !== 'all') {
                $query->where('waste_category', $validated['waste_filter']);
            }
            $points = $query->select('id', 'name', 'type', 'waste_category', 'lat', 'lng', 'fill_level', 'priority')
                ->get()->toArray();
        }

        if (empty($points)) {
            return response()->json(['error' => 'Aucun point de collecte disponible.'], 422);
        }

        $result = $this->vrp->optimize(
            $points,
            $validated['num_trucks'] ?? 0,
            $validated['capacity'],
            $validated['algorithm'],
            $validated['iterations'] ?? 80
        );

        // Persist routes if truck_ids provided
        if (!empty($validated['truck_ids'])) {
            $trucks = Truck::whereIn('id', $validated['truck_ids'])->get();
            $date = $validated['scheduled_date'] ?? today()->toDateString();
            foreach ($result['routes'] as $i => $routeData) {
                if (isset($trucks[$i])) {
                    Route::create([
                        'truck_id'          => $trucks[$i]->id,
                        'algorithm'         => $validated['algorithm'],
                        'points_order'      => array_column($routeData['points'], 'id'),
                        'total_distance_km' => $routeData['distance_km'],
                        'co2_kg'            => $routeData['co2_kg'],
                        'computation_ms'    => (int)$result['computation_ms'],
                        'status'            => 'planned',
                        'scheduled_date'    => $date,
                    ]);
                }
            }
        }

        return response()->json($result);
    }

    public function benchmark(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'num_trucks'    => 'nullable|integer|min:0|max:100',
            'capacity'      => 'required|integer|min:10|max:10000',
            'points_count'  => 'integer|min:10|max:1000',
        ]);

        $limit = $validated['points_count'] ?? 100;
        $points = CollectionPoint::where('is_active', true)->where('is_depot', false)
            ->inRandomOrder()
            ->limit($limit)
            ->select('id', 'name', 'type', 'waste_category', 'lat', 'lng', 'fill_level', 'priority')
            ->get()->toArray();

        if (empty($points)) {
            return response()->json(['error' => 'Aucun point de collecte disponible.'], 422);
        }

        $algorithms = ['greedy', '2opt', 'tabu', 'kmeans', 'nsga'];
        $results = [];

        foreach ($algorithms as $algo) {
            $iter = $algo === 'tabu' ? 20 : ($algo === 'nsga' ? 8 : 80);
            $res = $this->vrp->optimize(
                $points,
                $validated['num_trucks'] ?? 0,
                $validated['capacity'],
                $algo,
                $iter
            );
            $results[] = [
                'algorithm' => $algo,
                'time_ms'   => $res['computation_ms'],
                'distance'  => $res['total_km']
            ];
        }

        return response()->json(['benchmark' => $results, 'points_tested' => count($points)]);
    }

    public function routes(Request $request): JsonResponse
    {
        $routes = Route::with('truck')
            ->when($request->date, fn($q) => $q->whereDate('scheduled_date', $request->date))
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json($routes);
    }
}
