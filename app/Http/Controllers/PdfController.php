<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class PdfController extends Controller
{
    public function exportVrp(Request $request)
    {
        $data = $request->validate([
            'routes' => 'required|array',
            'stats'  => 'required|array',
            'algorithm'  => 'required|string',
            'total_km'   => 'required|numeric',
            'time_ms'    => 'required|numeric',
        ]);

        $pdf = Pdf::loadView('pdf.vrp_report', $data);

        return $pdf->download('rapport-vrp-villepropre.pdf');
    }
}
