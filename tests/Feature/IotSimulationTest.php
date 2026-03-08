<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\CollectionPoint;
use App\Models\IotReading;
use App\Models\User;

class IotSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_simulate_iot_readings_and_increase_fill_level()
    {
        $user = User::factory()->create();

        $pt = CollectionPoint::create([
            'name' => 'Demo Pt',
            'type' => 'restaurant',
            'waste_category' => 'organic',
            'lat' => 30.4,
            'lng' => -9.5,
            'fill_level' => 10,
            'priority' => 'low',
            'is_active' => true,
            'is_depot' => false
        ]);

        $response = $this->actingAs($user)->postJson('/api/iot/simulate', ['batch' => 1]);

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('updated'));

        // Refresh model from database
        $pt->refresh();

        // Organic simulation adds between 10 and 20 fill level
        $this->assertGreaterThanOrEqual(20, $pt->fill_level);

        // IotReading record was created
        $this->assertDatabaseHas('iot_readings', [
            'collection_point_id' => $pt->id
        ]);
    }

    public function test_can_reset_all_fill_levels()
    {
        $user = User::factory()->create();

        CollectionPoint::create([
            'name' => 'Full Pt',
            'type' => 'restaurant',
            'waste_category' => 'organic',
            'lat' => 30.4,
            'lng' => -9.5,
            'fill_level' => 99,
            'priority' => 'critical',
            'is_active' => true,
            'is_depot' => false
        ]);

        $response = $this->actingAs($user)->postJson('/api/iot/reset');

        $response->assertStatus(200);

        $this->assertDatabaseHas('collection_points', [
            'fill_level' => 0,
            'priority' => 'low'
        ]);
    }
}
