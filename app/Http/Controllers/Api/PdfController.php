<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class PdfController extends Controller
{
    public function exportVrp(Request $request)
    {
        $data = $request->validate([
            'routes'     => 'required|array',
            'algorithm'  => 'nullable|string',
            'total_km'   => 'nullable|numeric',
            'time_ms'    => 'nullable|numeric',
            'stats'      => 'nullable|array'
        ]);

        $viewData = [
            'routes' => $data['routes'],
            'algorithm' => $data['algorithm'] ?? 'N/A',
            'total_km' => $data['total_km'] ?? 0,
            'computation_ms' => $data['time_ms'] ?? 0,
        ];

        $pdf = Pdf::loadView('pdf.vrp-report', ['data' => $viewData]);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="rapport-vrp.pdf"',
        ]);
    }
}
