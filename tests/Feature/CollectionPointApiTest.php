<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\CollectionPoint;
use App\Models\User;

class CollectionPointApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_fetch_active_points()
    {
        $user = User::factory()->create();

        CollectionPoint::create([
            'name' => 'Active Organic Pt',
            'type' => 'restaurant',
            'waste_category' => 'organic',
            'lat' => 30.420,
            'lng' => -9.590,
            'fill_level' => 50,
            'priority' => 'low',
            'is_active' => true,
            'is_depot' => false
        ]);

        CollectionPoint::create([
            'name' => 'Inactive Pt',
            'type' => 'bank',
            'waste_category' => 'paper',
            'lat' => 30.421,
            'lng' => -9.591,
            'fill_level' => 10,
            'priority' => 'low',
            'is_active' => false,
            'is_depot' => false
        ]);

        $response = $this->actingAs($user)->get('/api/points');

        $response->assertStatus(200);

        $data = $response->json();
        $this->assertCount(1, $data);
        $this->assertEquals('Active Organic Pt', $data[0]['name']);
    }

    public function test_can_filter_by_waste_category()
    {
        $user = User::factory()->create();

        CollectionPoint::create([
            'name' => 'Org Pt',
            'type' => 'restaurant',
            'waste_category' => 'organic',
            'lat' => 30.4,
            'lng' => -9.5,
            'is_active' => true,
            'is_depot' => false
        ]);

        CollectionPoint::create([
            'name' => 'Medical Pt',
            'type' => 'hospital',
            'waste_category' => 'medical',
            'lat' => 30.4,
            'lng' => -9.5,
            'is_active' => true,
            'is_depot' => false
        ]);

        // Filter organic
        $resOrganic = $this->actingAs($user)->get('/api/points?category=organic')->json();
        $this->assertCount(1, $resOrganic);
        $this->assertEquals('organic', $resOrganic[0]['waste_category']);

        // Filter all returns all
        $resAll = $this->actingAs($user)->get('/api/points?category=all')->json();
        $this->assertCount(2, $resAll);
    }

    public function test_can_collect_points_and_reset_fill_level()
    {
        $user = User::factory()->create();

        $pt = CollectionPoint::create([
            'name' => 'Full Pt',
            'type' => 'restaurant',
            'waste_category' => 'organic',
            'lat' => 30.4,
            'lng' => -9.5,
            'fill_level' => 100,
            'priority' => 'critical',
            'is_active' => true,
            'is_depot' => false
        ]);

        $response = $this->actingAs($user)->postJson('/api/points/collect', [
            'point_ids' => [$pt->id]
        ]);

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('collected'));

        $this->assertDatabaseHas('collection_points', [
            'id' => $pt->id,
            'fill_level' => 0,
            'priority' => 'low'
        ]);
    }
}
