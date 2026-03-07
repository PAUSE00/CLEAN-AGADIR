<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionPoint;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CitizenController extends Controller
{
    /**
     * Submit a new citizen report.
     * Accessible publicly (no auth required).
     */
    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat'           => 'required|numeric|between:-90,90',
            'lng'           => 'required|numeric|between:-180,180',
            'type'          => 'required|string|in:overflow,wild,damage',
            'description'   => 'nullable|string|max:1000',
        ]);

        $pointType = match ($validated['type']) {
            'overflow' => 'point_apport_volontaire',
            'wild'     => 'decharge_sauvage',
            'damage'   => 'corbeille_rue',
            default    => 'point_apport_volontaire',
        };

        // Create a new priority point at 100% capacity
        $point = CollectionPoint::create([
            'name'           => 'Signalement Citoyen (' . strtoupper($validated['type']) . ')',
            'type'           => $pointType,
            'waste_category' => 'general',
            'lat'            => $validated['lat'],
            'lng'            => $validated['lng'],
            'fill_level'     => 100,
            'priority'       => 'high',
            'is_active'      => true,
            'is_depot'       => false,
            'zone'           => 'Signalement Public',
        ]);

        return response()->json([
            'message' => 'Signalement reçu avec succès. Une équipe sera dépêchée sur place.',
            'point'   => $point
        ], 201);
    }
}
