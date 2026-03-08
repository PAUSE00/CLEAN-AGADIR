<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Http\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Cache;
use App\Models\CollectionPoint;

try {
    echo "Fetching points...\n";
    $points = CollectionPoint::all()->toArray();
    echo "Count: " . count($points) . "\n";
    echo "Caching points...\n";
    Cache::put('test_points', $points, 60);
    echo "Reading from cache...\n";
    $cached = Cache::get('test_points');
    echo "Cached count: " . count($cached) . "\n";
    echo "SUCCESS\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    if (method_exists($e, 'getErrorInfo')) {
        print_r($e->getErrorInfo());
    }
}
