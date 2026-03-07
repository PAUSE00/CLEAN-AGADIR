<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <title>Rapport d'Optimisation VRP</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #00e5b8;
            padding-bottom: 10px;
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #07111e;
        }

        .logo span {
            color: #00e5b8;
        }

        .kpi-container {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }

        .kpi-container td {
            padding: 10px;
            text-align: center;
            border: 1px solid #ddd;
            background: #f9f9f9;
            width: 25%;
        }

        .kpi-val {
            font-size: 18px;
            font-weight: bold;
            color: #00e5b8;
        }

        .kpi-lbl {
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
        }

        .route-card {
            margin-bottom: 20px;
            page-break-inside: avoid;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }

        .route-header {
            background: #07111e;
            color: white;
            padding: 10px;
            font-weight: bold;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        th {
            background-color: #f1f5f9;
            font-size: 10px;
            text-transform: uppercase;
            color: #666;
        }

        .footer {
            position: fixed;
            bottom: -20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 5px;
        }
    </style>
</head>

<body>
    <div class="header">
        <div class="logo">Ville<span>Propre</span></div>
        <h2>Rapport d'Optimisation des Routes (VRP)</h2>
        <div>Date de génération: {{ now()->format('d/m/Y H:i') }}</div>
        <div>Algorithme utilisé: <strong>{{ strtoupper($data['algorithm'] ?? 'N/A') }}</strong></div>
    </div>

    <table class="kpi-container">
        <tr>
            <td>
                <div class="kpi-val">{{ $data['total_km'] ?? 0 }} km</div>
                <div class="kpi-lbl">Distance Totale</div>
            </td>
            <td>
                <div class="kpi-val">{{ count($data['routes'] ?? []) }}</div>
                <div class="kpi-lbl">Véhicules Utilisés</div>
            </td>
            <td>
                <div class="kpi-val">{{ number_format(($data['total_km'] ?? 0) * 0.21, 1) }} kg</div>
                <div class="kpi-lbl">Emissions CO₂ Estimées</div>
            </td>
            <td>
                <div class="kpi-val">{{ $data['computation_ms'] ?? 0 }} ms</div>
                <div class="kpi-lbl">Temps de Calcul</div>
            </td>
        </tr>
    </table>

    <h3 style="color:#07111e; border-bottom:1px solid #ccc; padding-bottom:5px;">Détails par Camion</h3>

    @foreach($data['routes'] ?? [] as $index => $route)
    <div class="route-card">
        <div class="route-header">
            Route {{ $index + 1 }} — Distance: {{ $route['distance_km'] ?? 0 }} km | Points collectés: {{ count($route['points'] ?? []) }}
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 5%">Ordre</th>
                    <th style="width: 45%">Nom du Point</th>
                    <th style="width: 20%">Catégorie</th>
                    <th style="width: 15%">Niveau Rempl.</th>
                    <th style="width: 15%">Priorité</th>
                </tr>
            </thead>
            <tbody>
                @foreach($route['points'] as $i => $point)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $point['name'] ?? 'Inconnu' }}</td>
                    <td>{{ ucfirst($point['waste_category'] ?? 'Général') }}</td>
                    <td>{{ $point['fill_level'] ?? 0 }}%</td>
                    <td>{{ ucfirst($point['priority'] ?? 'Normale') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endforeach

    <div class="footer">
        CLEAN AGADIR VRP System — Généré automatiquement — Page 1
    </div>
</body>

</html>