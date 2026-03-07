<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionPoint;
use App\Models\IotReading;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    /**
     * High-level overview metrics for the analytics dashboard.
     */
    public function overview(): JsonResponse
    {
        $points = CollectionPoint::where('is_active', true)->where('is_depot', false);

        $totalPoints  = (clone $points)->count();
        $criticalPts  = (clone $points)->where('priority', 'critical')->count();
        $highPts      = (clone $points)->where('priority', 'high')->count();
        $avgFill      = round((clone $points)->avg('fill_level'), 1);

        // Readings from last 24h
        $recentReadings = IotReading::where('read_at', '>=', now()->subDay())->count();
        $fireAlerts     = IotReading::where('read_at', '>=', now()->subDay())
            ->where('fire_alert', true)->count();

        // Points collected today (fill_level reset to 0 in last 24h)
        $collectedToday = CollectionPoint::where('last_collected_at', '>=', now()->subDay())
            ->where('is_depot', false)->count();

        // Category breakdown
        $byCategory = CollectionPoint::where('is_active', true)->where('is_depot', false)
            ->select('waste_category', DB::raw('COUNT(*) as count'), DB::raw('AVG(fill_level) as avg_fill'))
            ->groupBy('waste_category')
            ->get()
            ->map(fn($r) => [
                'category' => $r->waste_category,
                'count'    => $r->count,
                'avg_fill' => round($r->avg_fill, 1),
            ]);

        // Zone breakdown
        $byZone = CollectionPoint::where('is_active', true)->where('is_depot', false)
            ->whereNotNull('zone')
            ->select('zone', DB::raw('COUNT(*) as count'), DB::raw('AVG(fill_level) as avg_fill'))
            ->groupBy('zone')
            ->orderByDesc(DB::raw('AVG(fill_level)'))
            ->limit(8)
            ->get();

        return response()->json([
            'total_points'     => $totalPoints,
            'critical_count'   => $criticalPts,
            'high_count'       => $highPts,
            'avg_fill'         => $avgFill,
            'collected_today'  => $collectedToday,
            'recent_readings'  => $recentReadings,
            'fire_alerts_24h'  => $fireAlerts,
            'by_category'      => $byCategory,
            'by_zone'          => $byZone,
        ]);
    }

    /**
     * Fill level history over time — for line charts.
     */
    public function fillHistory(Request $request): JsonResponse
    {
        $hours  = (int) $request->get('hours', 24);
        $hours  = min(168, max(1, $hours)); // 1h to 7 days
        $from   = now()->subHours($hours);

        // Average fill per hour, grouped by waste category
        $rows = IotReading::where('read_at', '>=', $from)
            ->join('collection_points', 'iot_readings.collection_point_id', '=', 'collection_points.id')
            ->select(
                DB::raw("DATE_FORMAT(iot_readings.read_at, '%Y-%m-%d %H:00:00') as hour"),
                'collection_points.waste_category',
                DB::raw('AVG(iot_readings.fill_level) as avg_fill'),
                DB::raw('MAX(iot_readings.fill_level) as max_fill'),
                DB::raw('COUNT(*) as readings')
            )
            ->groupBy('hour', 'collection_points.waste_category')
            ->orderBy('hour')
            ->get();

        // Pivot into time -> { medical: x, organic: y, ... }
        $timeline = [];
        foreach ($rows as $row) {
            $h = $row->hour;
            if (!isset($timeline[$h])) {
                $timeline[$h] = ['time' => $h, 'total' => 0, 'readings' => 0];
            }
            $timeline[$h][$row->waste_category] = round($row->avg_fill, 1);
            $timeline[$h]['max'] = max($timeline[$h]['max'] ?? 0, $row->max_fill);
            $timeline[$h]['readings'] += $row->readings;
        }

        return response()->json([
            'hours'    => $hours,
            'timeline' => array_values($timeline),
        ]);
    }

    /**
     * Collection performance statistics.
     */
    public function collectionStats(): JsonResponse
    {
        // Collections per day for the last 7 days
        $daily = CollectionPoint::select(
            DB::raw('DATE(last_collected_at) as date'),
            DB::raw('COUNT(*) as collected')
        )
            ->whereNotNull('last_collected_at')
            ->where('last_collected_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top 10 most critical zones right now
        $hotspots = CollectionPoint::where('is_active', true)
            ->where('is_depot', false)
            ->where('fill_level', '>=', 80)
            ->orderByDesc('fill_level')
            ->limit(10)
            ->select('name', 'zone', 'waste_category', 'fill_level', 'priority', 'lat', 'lng')
            ->get();

        // Fire alert trend
        $fireHistory = IotReading::where('fire_alert', true)
            ->where('read_at', '>=', now()->subDays(7))
            ->select(DB::raw('DATE(read_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Average temperature reading
        $avgTemp = round(IotReading::where('read_at', '>=', now()->subDay())->avg('temperature'), 1);

        return response()->json([
            'daily_collections' => $daily,
            'hotspots'          => $hotspots,
            'fire_history'      => $fireHistory,
            'avg_temp_24h'      => $avgTemp,
            'total_readings'    => IotReading::count(),
        ]);
    }
}
