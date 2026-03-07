<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionPoint;
use App\Models\IotReading;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class IoTController extends Controller
{
    /**
     * Simulate IoT sensor update — mimics real sensor push.
     * In production: replace with actual sensor webhook.
     */
    public function simulate(Request $request): JsonResponse
    {
        $points = CollectionPoint::where('is_active', true)
            ->inRandomOrder()
            ->limit($request->get('batch', 20))
            ->get();

        $alerts = [];
        $updated = 0;

        foreach ($points as $point) {
            // Simulate realistic fill increase based on type
            $increment = match ($point->waste_category) {
                'organic'    => rand(10, 20),   // fills faster
                'medical'    => rand(8, 15),
                'recyclable' => rand(5, 12),
                'paper'      => rand(5, 10),
                default      => rand(5, 15),
            };

            $newLevel = min(100, $point->fill_level + $increment);
            $fireAlert = $point->waste_category === 'organic' && $newLevel > 85 && rand(0, 100) < 5;

            // Save IoT reading
            IotReading::create([
                'collection_point_id' => $point->id,
                'fill_level'          => $newLevel,
                'temperature'         => round(18 + ($newLevel / 100 * 15) + (rand(-20, 20) / 10), 1),
                'fire_alert'          => $fireAlert,
                'read_at'             => now(),
            ]);

            // Update point
            $point->fill_level = $newLevel;
            $point->updatePriority();

            if ($newLevel >= 80) {
                $alerts[] = [
                    'id'         => $point->id,
                    'name'       => $point->name,
                    'fill_level' => $newLevel,
                    'priority'   => $point->priority,
                    'lat'        => $point->lat,
                    'lng'        => $point->lng,
                    'fire_alert' => $fireAlert,
                    'category'   => $point->waste_category,
                ];
            }
            $updated++;
        }

        \Illuminate\Support\Facades\Cache::forget('collection_points_active');

        return response()->json([
            'updated'        => $updated,
            'alerts'         => $alerts,
            'critical_count' => CollectionPoint::where('priority', 'critical')->count(),
            'avg_fill'       => round(CollectionPoint::avg('fill_level'), 1),
            'timestamp'      => now()->toISOString(),
        ]);
    }

    public function status(): JsonResponse
    {
        $points = CollectionPoint::where('is_active', true)
            ->select('id', 'name', 'waste_category', 'fill_level', 'priority', 'lat', 'lng')
            ->orderByDesc('fill_level')
            ->get();

        return response()->json([
            'points'          => $points,
            'critical_count'  => $points->where('priority', 'critical')->count(),
            'high_count'      => $points->where('priority', 'high')->count(),
            'avg_fill'        => round($points->avg('fill_level'), 1),
            'by_category'     => $points->groupBy('waste_category')->map(fn($g) => [
                'count'    => $g->count(),
                'avg_fill' => round($g->avg('fill_level'), 1),
            ]),
        ]);
    }

    /**
     * Reset all fill levels (for demo/testing)
     */
    public function reset(): JsonResponse
    {
        CollectionPoint::query()->update(['fill_level' => 0, 'priority' => 'low']);
        \Illuminate\Support\Facades\Cache::forget('collection_points_active');
        return response()->json(['message' => 'Tous les niveaux réinitialisés.']);
    }
}
