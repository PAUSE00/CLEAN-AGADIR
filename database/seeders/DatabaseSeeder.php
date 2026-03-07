<?php

namespace Database\Seeders;

use App\Models\CollectionPoint;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Default users
        User::firstOrCreate(
            ['email' => 'admin@villepropre.ma'],
            [
                'name' => 'Admin VRP',
                'password' => Hash::make('password'),
                'is_admin' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'chauffeur@villepropre.ma'],
            [
                'name' => 'Chauffeur 1',
                'password' => Hash::make('password'),
                'is_admin' => false,
            ]
        );

        // Seed collection points from real OSM data
        $this->call(CollectionPointSeeder::class);

        // Add the Dépôt Central point
        CollectionPoint::firstOrCreate(
            ['name' => 'Dépôt Central'],
            [
                'type' => 'depot',
                'waste_category' => 'general',
                'lat' => 30.4278,
                'lng' => -9.5981,
                'fill_level' => 0,
                'priority' => 'low',
                'is_active' => true,
                'is_depot' => true,
                'zone' => 'Centre Ville'
            ]
        );

        // Seed default fleet
        $trucks = [
            ['name' => 'AGD-001', 'size' => 'large',  'waste_type' => 'all',        'capacity' => 120, 'status' => 'idle'],
            ['name' => 'AGD-002', 'size' => 'large',  'waste_type' => 'all',        'capacity' => 120, 'status' => 'idle'],
            ['name' => 'AGD-003', 'size' => 'medium', 'waste_type' => 'medical',    'capacity' => 60,  'status' => 'idle'],
            ['name' => 'AGD-004', 'size' => 'medium', 'waste_type' => 'organic',    'capacity' => 60,  'status' => 'idle'],
            ['name' => 'AGD-005', 'size' => 'medium', 'waste_type' => 'recyclable', 'capacity' => 60,  'status' => 'idle'],
            ['name' => 'AGD-006', 'size' => 'medium', 'waste_type' => 'all',        'capacity' => 60,  'status' => 'idle'],
            ['name' => 'AGD-007', 'size' => 'small',  'waste_type' => 'medical',    'capacity' => 30,  'status' => 'idle'],
            ['name' => 'AGD-008', 'size' => 'small',  'waste_type' => 'paper',      'capacity' => 30,  'status' => 'idle'],
        ];

        foreach ($trucks as $truck) {
            Truck::firstOrCreate(['name' => $truck['name']], $truck);
        }
    }
}
