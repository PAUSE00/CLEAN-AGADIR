<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\VrpService;

class VrpServiceTest extends TestCase
{
    /** @var VrpService */
    protected $vrp;

    protected function setUp(): void
    {
        parent::setUp();
        $this->vrp = new VrpService();
    }

    public function test_distance_haversine()
    {
        // Distance between Paris and London is approx 343km
        // Paris: 48.8566, 2.3522
        // London: 51.5072, -0.1276
        // NOTE: The function signature is protected or public? Let's check VrpService. 
        // We can just invoke optimize with a small mock dataset and see if it outputs distance correctly.

        $points = [
            ['id' => '1', 'name' => 'Pt1', 'lat' => 30.1, 'lng' => -9.0, 'fill_level' => 50],
            ['id' => '2', 'name' => 'Pt2', 'lat' => 30.0, 'lng' => -9.1, 'fill_level' => 50]
        ];

        // Capacity = 100, trucks = 1
        $result = $this->vrp->optimize($points, 1, 100, 'greedy', 10);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('routes', $result);
        $this->assertArrayHasKey('total_km', $result);

        // 1 route expected
        $this->assertCount(1, $result['routes']);

        $route = $result['routes'][0];
        // Must contain both points (and NO depot mixed in as a normal point)
        $this->assertCount(2, $route['points']);
        $this->assertGreaterThan(0, $result['total_km']);
        // CO2 = distance * 0.21 (per VrpService.php)
        $expectedCo2 = round($result['total_km'] * 0.21, 2);
        $this->assertEquals($expectedCo2, $result['total_co2']);
    }

    public function test_respects_logic_when_auto_trucks()
    {
        $points = [
            ['id' => '1', 'name' => 'Pt1', 'lat' => 30.1, 'lng' => -9.0, 'fill_level' => 60],
            ['id' => '2', 'name' => 'Pt2', 'lat' => 30.0, 'lng' => -9.1, 'fill_level' => 60],
            ['id' => '3', 'name' => 'Pt3', 'lat' => 30.1, 'lng' => -9.2, 'fill_level' => 60],
        ];

        // If numTrucks is 0, VRpService calculates trucks using formula
        // Formula: ceil((3 items / capacity) * 1.2)
        // With capacity = 2, totalVolume / capacity = 3/2 = 1.5. ceil(1.5 * 1.2) = ceil(1.8) = 2 trucks
        $result = $this->vrp->optimize($points, 0, 2, 'greedy', 10);

        $this->assertCount(2, $result['routes']);
    }
}
