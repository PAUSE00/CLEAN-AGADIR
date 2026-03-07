<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\IoTController;
use App\Http\Controllers\Api\CollectionPointController;
use App\Http\Controllers\Api\VrpController;
use App\Http\Controllers\Api\PdfController;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/driver', function () {
    return Inertia::render('DriverDashboard');
})->middleware(['auth'])->name('driver');


// Protected API routes accessible only when authenticated
Route::middleware('auth')->group(function () {
    // Mapbox
    Route::get('/api/mapbox/token', function () {
        return response()->json(['token' => env('MAPBOX_TOKEN', '')]);
    });

    // Points
    Route::get('/api/points', [CollectionPointController::class, 'index']);
    Route::post('/api/points/collect', [CollectionPointController::class, 'collect']);

    // VRP & Fleet
    Route::post('/api/vrp/optimize', [VrpController::class, 'optimize']);
    Route::get('/api/trucks', [CollectionPointController::class, 'trucks']); // Using existing method

    // IoT
    Route::post('/api/iot/simulate', [IoTController::class, 'simulate']);
    Route::get('/api/iot/status', [IoTController::class, 'status']);
    Route::post('/api/iot/reset', [IoTController::class, 'reset']);

    // VRP Benchmark & Route history
    Route::post('/api/vrp/benchmark', [VrpController::class, 'benchmark']);
    Route::get('/api/vrp/routes', [VrpController::class, 'routes']);

    // Export PDF
    Route::post('/api/export/vrp-pdf', [PdfController::class, 'exportVrp']);
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
