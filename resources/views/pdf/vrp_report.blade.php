<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <title>Rapport VRP - CLEAN AGADIR</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #00e5b8;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #1e293b;
            margin: 0;
        }

        .header h2 {
            color: #00e5b8;
            margin: 5px 0 0 0;
            font-size: 18px;
        }

        .summary {
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .summary h3 {
            margin-top: 0;
            color: #334155;
        }

        .kpi {
            display: inline-block;
            width: 30%;
            margin-bottom: 10px;
        }

        .kpi-title {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
        }

        .kpi-value {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
        }

        .route {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .route-header {
            background: #0f172a;
            color: #f8fafc;
            padding: 10px;
            border-radius: 5px 5px 0 0;
            font-weight: bold;
        }

        .route-stats {
            background: #f1f5f9;
            padding: 10px;
            border-radius: 0 0 5px 5px;
            font-size: 14px;
            border: 1px solid #e2e8f0;
            border-top: none;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
        }

        th,
        td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            text-align: left;
        }

        th {
            background: #e2e8f0;
            color: #334155;
        }

        .footer {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            width: 100%;
            position: fixed;
            bottom: -20px;
        }

        .page-number:before {
            content: counter(page);
        }
    </style>
</head>

<body>
    <div class="footer">
        CLEAN AGADIR - Rapport généré le {{ now()->format('d/m/Y à H:i') }} - Page <span class="page-number"></span>
    </div>

    <div class="header">
        <h1>♻️ CLEAN AGADIR — Agadir</h1>
        <h2>Rapport d'Optimisation des Routes (VRP)</h2>
    </div>

    <div class="summary">
        <h3>Résumé de l'Optimisation</h3>
        <div>
            <div class="kpi">
                <div class="kpi-title">Distance Totale</div>
                <div class="kpi-value">{{ number_format($total_km, 2) }} km</div>
            </div>
            <div class="kpi">
                <div class="kpi-title">Temps de Calcul</div>
                <div class="kpi-value">{{ $time_ms }} ms</div>
            </div>
            <div class="kpi">
                <div class="kpi-title">Algorithme</div>
                <div class="kpi-value" style="text-transform: capitalize;">{{ $algorithm }}</div>
            </div>
        </div>
        <div>
            <div class="kpi">
                <div class="kpi-title">Nombre de Routes</div>
                <div class="kpi-value">{{ count($routes) }}</div>
            </div>
            <div class="kpi">
                <div class="kpi-title">Date</div>
                <div class="kpi-value">{{ now()->format('d/m/Y') }}</div>
            </div>
        </div>
    </div>

    @foreach($routes as $index => $route)
    <div class="route">
        <div class="route-header">
            Route {{ $index + 1 }}
        </div>
        <div class="route-stats">
            <strong>Points assignés :</strong> {{ count($route['points']) ?? 0 }} <br>
            <strong>Distance estimée :</strong> {{ number_format($route['distance_km'] ?? 0, 2) }} km <br>
            <strong>Économie CO₂ :</strong> {{ number_format($route['co2_kg'] ?? 0, 2) }} kg <br>
        </div>

        @if(isset($route['points']) && count($route['points']) > 0)
        <table>
            <thead>
                <tr>
                    <th width="5%">#</th>
                    <th width="45%">Nom du Point</th>
                    <th width="20%">Type de Déchet</th>
                    <th width="30%">Coordonnées</th>
                </tr>
            </thead>
            <tbody>
                @foreach(array_slice($route['points'], 0, 100) as $i => $point)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $point['name'] ?? 'Point Inconnu' }}</td>
                    <td>{{ ucfirst($point['waste_category'] ?? 'Général') }}</td>
                    <td style="font-family: monospace; font-size: 10px;">{{ number_format($point['lat'], 4) }}, {{ number_format($point['lng'], 4) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @if(count($route['points']) > 100)
        <div style="font-size: 11px; color: #64748b; margin-top: 5px; font-style: italic;">... et {{ count($route['points']) - 100 }} autres points (tronqué pour affichage).</div>
        @endif
        @endif
    </div>
    @endforeach

</body>

</html>