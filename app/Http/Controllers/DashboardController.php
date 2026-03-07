<?php

namespace App\Http\Controllers;

use App\Models\CollectionPoint;
use App\Models\Truck;
use App\Models\Route;
use App\Models\IotReading;
use App\Services\VrpService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $points = CollectionPoint::where('is_active', true)
            ->select('id', 'name', 'type', 'waste_category', 'lat', 'lng', 'fill_level', 'priority', 'last_collected_at')
            ->get();

        $trucks = Truck::with('activeRoute')->get();

        $stats = [
            'total_points'   => $points->count(),
            'critical_alerts'=> $points->where('priority', 'critical')->count(),
            'high_alerts'    => $points->where('priority', 'high')->count(),
            'avg_fill'       => round($points->avg('fill_level'), 1),
            'active_trucks'  => $trucks->where('status', 'active')->count(),
            'total_trucks'   => $trucks->count(),
            'routes_today'   => Route::whereDate('scheduled_date', today())->count(),
            'collected_today'=> Route::whereDate('scheduled_date', today())->where('status', 'completed')->count(),
        ];

        $byCategory = $points->groupBy('waste_category')->map->count();
        $byPriority = $points->groupBy('priority')->map->count();

        // Latest IoT readings for alerts
        $alerts = IotReading::with('collectionPoint')
            ->where('fill_level', '>=', 80)
            ->where('read_at', '>=', Carbon::now()->subHours(2))
            ->orderByDesc('fill_level')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'point_name' => $r->collectionPoint->name,
                'fill_level' => $r->fill_level,
                'lat'        => $r->collectionPoint->lat,
                'lng'        => $r->collectionPoint->lng,
                'fire_alert' => $r->fire_alert,
                'read_at'    => $r->read_at->diffForHumans(),
            ]);

        return Inertia::render('Dashboard', [
            'points'     => $points,
            'trucks'     => $trucks,
            'stats'      => $stats,
            'byCategory' => $byCategory,
            'byPriority' => $byPriority,
            'alerts'     => $alerts,
        ]);
    }
}
