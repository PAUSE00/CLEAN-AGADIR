<?php

namespace Database\Seeders;

use App\Models\CollectionPoint;
use Illuminate\Database\Seeder;

class CollectionPointSeeder extends Seeder
{
    // Type → waste_category mapping
    private static array $typeMap = [
        'pharmacy' => 'medical',
        'clinic' => 'medical',
        'doctors' => 'medical',
        'cafe' => 'organic',
        'restaurant' => 'organic',
        'fast_food' => 'organic',
        'bakery' => 'organic',
        'butcher' => 'organic',
        'supermarket' => 'recyclable',
        'convenience' => 'recyclable',
        'marketplace' => 'recyclable',
        'bank' => 'paper',
        'school' => 'paper',
        'library' => 'paper',
        'post_office' => 'paper',
        'post_office;bank' => 'paper',
    ];

    public function run(): void
    {
        // Clean table to avoid duplicates on every redeploy and reset count to 834
        \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();
        CollectionPoint::truncate();
        \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();

        // Load all 833 points from the JSON file
        $jsonPath = database_path('data/agadir_structures.json');
        $raw = json_decode(file_get_contents($jsonPath), true);

        // Map JSON fields (latitude/longitude) to DB fields (lat/lng)
        $data = array_map(fn($d) => [
            'name' => $d['name'],
            'type' => $d['type'],
            'lat'  => $d['latitude'],
            'lng'  => $d['longitude'],
        ], $raw);

        $chunks = array_chunk($data, 100);

        // Define some realistic zones and their collection time windows
        $zones = [
            ['name' => 'Centre Ville', 'open' => '05:00', 'close' => '09:00'],
            ['name' => 'Talborjt', 'open' => '08:00', 'close' => '12:00'],
            ['name' => 'Hay Mohammadi', 'open' => '14:00', 'close' => '18:00'],
            ['name' => 'Zone Touristique', 'open' => '20:00', 'close' => '02:00'],
            ['name' => 'Quartier Industriel', 'open' => '00:00', 'close' => '06:00'],
        ];

        $index = 0;
        foreach ($chunks as $chunk) {
            $records = array_map(function ($d) use ($zones) {
                $lat = $d['lat'];
                $lng = $d['lng'];

                // Assign zones based on geographic boundaries
                if ($lat > 30.42 && $lng < -9.59) {
                    $zone = $zones[3]; // Zone Touristique (North West)
                } elseif ($lat > 30.42 && $lng >= -9.59) {
                    $zone = $zones[2]; // Hay Mohammadi (North East)
                } elseif ($lat <= 30.42 && $lat > 30.39) {
                    if ($lng < -9.57) {
                        $zone = $zones[0]; // Centre Ville (Central West)
                    } else {
                        $zone = $zones[1]; // Talborjt (Central East)
                    }
                } else {
                    $zone = $zones[4]; // Quartier Industriel (South)
                }

                return [
                    'name'           => $d['name'],
                    'type'           => $d['type'],
                    'waste_category' => self::$typeMap[$d['type']] ?? 'general',
                    'lat'            => $d['lat'],
                    'lng'            => $d['lng'],
                    'fill_level'     => rand(0, 40), // initial random fill
                    'priority'       => 'low',
                    'is_active'      => true,
                    'open_time'      => $zone['open'],
                    'close_time'     => $zone['close'],
                    'zone'           => $zone['name'],
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ];
            }, $chunk);

            CollectionPoint::insert($records);
        }
    }
}
