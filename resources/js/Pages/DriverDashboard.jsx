import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../../css/dashboard.css';

const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e'];

export default function DriverDashboard({ auth }) {
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [currentStop, setCurrentStop] = useState(0);
    const [collectedStops, setCollectedStops] = useState(new Set());
    const [pts, setPts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const markersRef = useRef({});
    const truckMarkerRef = useRef(null);

    // Load data
    useEffect(() => {
        const init = async () => {
            try {
                const [tokenRes, ptsRes] = await Promise.all([
                    fetch('/api/mapbox/token').then(r => r.json()),
                    fetch('/api/points').then(r => r.json()),
                ]);
                setPts(ptsRes.data || []);
                mapboxgl.accessToken = tokenRes.token || '';

                if (!mapContainerRef.current) return;
                const map = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/dark-v11',
                    center: [-9.5981, 30.4278],
                    zoom: 13,
                });
                map.addControl(new mapboxgl.GeolocateControl({
                    positionOptions: { enableHighAccuracy: true },
                    trackUserLocation: true,
                    showUserHeading: true
                }));
                mapRef.current = map;
                map.on('style.load', () => setMapReady(true));

                // Load any existing routes
                const vrpRes = await fetch('/api/vrp/routes').then(r => r.json()).catch(() => ({ routes: [] }));
                if (vrpRes.routes?.length) setRoutes(vrpRes.routes);
            } catch (e) {
                console.error('Driver init error', e);
            }
            setLoading(false);
        };
        init();
        return () => { if (mapRef.current) mapRef.current.remove(); };
    }, []);

    // When a route is selected, show it on the map
    useEffect(() => {
        if (!mapRef.current || !mapReady || !selectedRoute) return;
        const map = mapRef.current;
        const route = selectedRoute;
        const color = RC[routes.indexOf(route) % RC.length];

        // Draw route line
        const sourceId = 'driver-route';
        const layerId = 'driver-route-layer';
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        if (route.osrm_geometry?.coordinates) {
            map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: route.osrm_geometry } });
            map.addLayer({ id: layerId, type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': 5, 'line-opacity': 0.9 } });
        }

        // Show stop markers
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};
        route.points.forEach((p, i) => {
            const el = document.createElement('div');
            const isDone = collectedStops.has(p.id);
            const isCurrent = i === currentStop;
            el.style.cssText = `
                width:36px;height:36px;border-radius:50%;
                background:${isDone ? '#001a14' : isCurrent ? color : '#0a1424'};
                border:3px solid ${isDone ? '#00e5b8' : isCurrent ? color : '#1a2e42'};
                color:${isDone ? '#00e5b8' : '#fff'};
                font-size:13px;font-weight:700;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 0 ${isCurrent ? 20 : 8}px ${isCurrent ? color : '#0005'};
                cursor:pointer;transition:all .3s;
                ${isCurrent ? `animation:pulse-marker 1s infinite alternate;` : ''}
            `;
            el.textContent = isDone ? '✓' : (i + 1);
            const marker = new mapboxgl.Marker({ element: el }).setLngLat([Number(p.lng), Number(p.lat)]).addTo(map);
            markersRef.current[p.id] = marker;
        });

        // Fly to current stop
        const stop = route.points[currentStop];
        if (stop) map.flyTo({ center: [Number(stop.lng), Number(stop.lat)], zoom: 16, duration: 1200 });

    }, [selectedRoute, mapReady, currentStop, collectedStops]);

    const confirmCollection = () => {
        if (!selectedRoute) return;
        const stop = selectedRoute.points[currentStop];
        if (!stop) return;

        setCollectedStops(prev => new Set([...prev, stop.id]));
        // Persist
        fetch('/api/points/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
            body: JSON.stringify({ point_ids: [stop.id] })
        }).catch(() => { });

        // Move to next stop
        const nextStop = currentStop + 1;
        if (nextStop < selectedRoute.points.length) {
            setCurrentStop(nextStop);
        }
    };

    const currentStopData = selectedRoute?.points?.[currentStop];
    const progress = selectedRoute ? (collectedStops.size / selectedRoute.points.length) : 0;
    const allDone = selectedRoute && collectedStops.size >= selectedRoute.points.length;

    if (loading) return (
        <div className="driver-view" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <span className="spin" style={{ width: 30, height: 30, borderWidth: 3 }} />
            <div style={{ marginTop: 12, color: '#7a92aa', fontSize: 13 }}>Chargement...</div>
        </div>
    );

    return (
        <>
            <Head><title>VillePropre — Vue Chauffeur</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="driver-view">
                {/* Header */}
                <div className="driver-header">
                    <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#00e5b8,#00a88a)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚛</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#dde6f4' }}>Vue Chauffeur</div>
                        <div style={{ fontSize: 11, color: '#7a92aa' }}>{auth.user?.name}</div>
                    </div>
                    <Link href={route('dashboard')} style={{ color: '#7a92aa', fontSize: 11, textDecoration: 'none', background: '#1a2e42', padding: '4px 10px', borderRadius: 6 }}>
                        ← Dashboard Admin
                    </Link>
                </div>

                {/* Route selector (if no route selected) */}
                {!selectedRoute && (
                    <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#dde6f4' }}>
                            {routes.length === 0 ? 'Aucune route assignée' : `Choisissez votre route (${routes.length} disponible${routes.length > 1 ? 's' : ''})`}
                        </div>
                        {routes.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#374e64', fontSize: 13, marginTop: 40 }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                                Demandez à l'administrateur de lancer l'optimisation VRP.
                            </div>
                        )}
                        {routes.map((r, i) => (
                            <div key={i} onClick={() => { setSelectedRoute(r); setCurrentStop(0); setCollectedStops(new Set()); }}
                                style={{ background: '#0a1424', border: `1px solid ${RC[i % RC.length]}44`, borderRadius: 12, padding: 16, marginBottom: 12, cursor: 'pointer', transition: '.2s' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: RC[i % RC.length], boxShadow: `0 0 8px ${RC[i % RC.length]}` }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#dde6f4' }}>Route {i + 1}</div>
                                        <div style={{ fontSize: 11, color: '#7a92aa', fontFamily: "'JetBrains Mono',monospace" }}>
                                            {r.points?.length || 0} arrêts · {r.distance_km} km
                                        </div>
                                    </div>
                                    <div style={{ color: RC[i % RC.length], fontSize: 20 }}>›</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Map (when route selected) */}
                {selectedRoute && (
                    <div className="driver-map">
                        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                        {/* Top progress pill */}
                        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(7,17,30,.9)', border: '1px solid #1a2e42', borderRadius: 30, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 600, backdropFilter: 'blur(8px)' }}>
                            <span style={{ color: '#00e5b8' }}>{collectedStops.size}/{selectedRoute.points.length}</span>
                            <div style={{ width: 80, height: 4, background: '#1a2e42', borderRadius: 99 }}>
                                <div style={{ height: '100%', width: `${progress * 100}%`, background: '#00e5b8', borderRadius: 99, transition: 'width .4s ease' }} />
                            </div>
                            {allDone ? <span style={{ color: '#00e5b8' }}>✓ Terminé!</span> : <span style={{ color: '#7a92aa' }}>en cours</span>}
                        </div>

                        {/* Back button */}
                        <button onClick={() => setSelectedRoute(null)} style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(7,17,30,.9)', border: '1px solid #1a2e42', color: '#7a92aa', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                            ← Changer
                        </button>
                    </div>
                )}

                {/* Bottom panel (when route selected) */}
                {selectedRoute && (
                    <div className="driver-bottom">
                        {allDone ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#00e5b8', marginBottom: 4 }}>Route Terminée!</div>
                                <div style={{ color: '#7a92aa', fontSize: 12, marginBottom: 16 }}>{selectedRoute.points.length} bennes collectées</div>
                                <button className="driver-confirm-btn" onClick={() => setSelectedRoute(null)} style={{ background: '#1a2e42', color: '#dde6f4', boxShadow: 'none' }}>
                                    ← Revenir aux Routes
                                </button>
                            </div>
                        ) : currentStopData ? (
                            <>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, color: '#7a92aa', marginBottom: 2 }}>Arrêt {currentStop + 1}/{selectedRoute.points.length}</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#dde6f4', lineHeight: 1.3 }}>{currentStopData.name || 'Benne'}</div>
                                        <div style={{ fontSize: 11, color: '#7a92aa', marginTop: 2 }}>{currentStopData.zone || ''}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', background: '#0a1424', border: '1px solid #1a2e42', borderRadius: 10, padding: '8px 14px' }}>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: (currentStopData.fill_level || 0) >= 85 ? '#f43f5e' : '#fbbf24', fontFamily: "'JetBrains Mono',monospace" }}>{currentStopData.fill_level || 0}%</div>
                                        <div style={{ fontSize: 9, color: '#7a92aa' }}>remplissage</div>
                                    </div>
                                </div>
                                <button className="driver-confirm-btn" onClick={confirmCollection}>
                                    ✅ Confirmer Collecte
                                </button>
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}
