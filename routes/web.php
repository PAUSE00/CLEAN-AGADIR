<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Api\IoTController;
use App\Http\Controllers\Api\CollectionPointController;
use App\Http\Controllers\Api\VrpController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\AnalyticsController;

// ── Pages ────────────────────────────────────────────────────────────
Route::get('/', fn() => redirect()->route('login'));

Route::get('/dashboard',  fn() => Inertia::render('Dashboard'))
    ->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/driver',     fn() => Inertia::render('DriverDashboard'))
    ->middleware(['auth'])->name('driver');

Route::get('/analytics',  fn() => Inertia::render('Analytics'))
    ->middleware(['auth'])->name('analytics');

// ── Protected API ────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    // Mapbox token
    Route::get('/api/mapbox/token', fn() =>
    response()->json(['token' => env('MAPBOX_TOKEN', '')]));

    // Collection points
    Route::get('/api/points',             [CollectionPointController::class, 'index']);
    Route::post('/api/points/collect',    [CollectionPointController::class, 'collect']);

    // Fleet / Trucks — full CRUD
    Route::get('/api/trucks',             [CollectionPointController::class, 'trucks']);
    Route::post('/api/trucks',            [CollectionPointController::class, 'storeTruck']);
    Route::delete('/api/trucks/{truck}',  [CollectionPointController::class, 'destroyTruck']);

    // VRP
    Route::post('/api/vrp/optimize',      [VrpController::class, 'optimize']);
    Route::post('/api/vrp/benchmark',     [VrpController::class, 'benchmark']);
    Route::get('/api/vrp/routes',         [VrpController::class, 'routes']);

    // IoT sensors
    Route::post('/api/iot/simulate',      [IoTController::class, 'simulate']);
    Route::get('/api/iot/status',         [IoTController::class, 'status']);
    Route::post('/api/iot/reset',         [IoTController::class, 'reset']);

    // Analytics
    Route::get('/api/analytics/overview',          [AnalyticsController::class, 'overview']);
    Route::get('/api/analytics/fill-history',      [AnalyticsController::class, 'fillHistory']);
    Route::get('/api/analytics/collection-stats',  [AnalyticsController::class, 'collectionStats']);

    // PDF export
    Route::post('/api/export/vrp-pdf',    [PdfController::class, 'exportVrp']);
});

// ── Profile ──────────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {
    Route::get('/profile',    [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile',  [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
