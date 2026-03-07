<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\CollectionPoint;

class VrpApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        for ($i = 0; $i < 10; $i++) {
            CollectionPoint::create([
                'name' => 'Point Test ' . $i,
                'type' => 'Corbeille',
                'waste_category' => 'general',
                'lat' => 30.42 + ($i * 0.001),
                'lng' => -9.59 + ($i * 0.001),
                'fill_level' => 90,
                'priority' => 'high',
                'is_active' => true,
            ]);
        }
    }

    public function test_api_vrp_benchmark_requires_auth()
    {
        $response = $this->postJson('/api/vrp/benchmark', [
            'num_trucks' => 1,
            'capacity' => 1000,
            'points_count' => 10
        ]);

        $response->assertStatus(401);
    }

    public function test_api_vrp_benchmark_returns_metrics()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/vrp/benchmark', [
            'num_trucks' => 2,
            'capacity' => 1000,
            'points_count' => 10
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'benchmark' => [
                '*' => ['algorithm', 'time_ms', 'distance']
            ],
            'points_tested'
        ]);

        $this->assertEquals(5, count($response->json('benchmark')));
    }

    public function test_api_export_vrp_pdf_returns_pdf()
    {
        $user = User::factory()->create();

        $payload = [
            'routes' => [
                [
                    'distance_km' => 15.5,
                    'points' => [
                        ['name' => 'Point 1', 'waste_category' => 'general', 'fill_level' => 50, 'priority' => 'low'],
                        ['name' => 'Point 2', 'waste_category' => 'medical', 'fill_level' => 90, 'priority' => 'critical']
                    ]
                ]
            ],
            'algorithm' => 'Tabu Search',
            'total_km' => 15.5,
            'time_ms' => 42.1
        ];

        $response = $this->actingAs($user)->postJson('/api/export/vrp-pdf', $payload);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }
}
