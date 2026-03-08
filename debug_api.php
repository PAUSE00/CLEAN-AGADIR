<?php

use App\Models\CollectionPoint;
use App\Http\Controllers\Api\CollectionPointController;
use Illuminate\Http\Request;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$app->make(\Illuminate\Contracts\Http\Kernel::class)->bootstrap();

$request = new Request();
$controller = new CollectionPointController();
try {
    $response = $controller->index($request);
    echo "SUCCESS: " . count(json_decode($response->getContent())) . " points found\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
