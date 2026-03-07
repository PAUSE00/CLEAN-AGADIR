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

    // Load data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [tokenRes, ptsRes, vrpRes] = await Promise.all([
                    fetch('/api/mapbox/token').then(r => r.json()),
                    fetch('/api/points').then(r => r.json()),
                    fetch('/api/vrp/routes').then(r => r.json()).catch(() => ({ routes: [] }))
                ]);
                setPts(ptsRes.data || []);
                mapboxgl.accessToken = tokenRes.token || '';
                if (vrpRes.routes?.length) setRoutes(vrpRes.routes);
            } catch (e) {
                console.error('Driver init error', e);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    // Init Map when a route is selected
    useEffect(() => {
        if (loading || !selectedRoute || !mapContainerRef.current || mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-9.5981, 30.4278],
            zoom: 13,
        });

        // Add driver location
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
            showAccuracyCircle: false
        }));

        mapRef.current = map;
        map.on('style.load', () => setMapReady(true));

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMapReady(false);
            }
        };
    }, [selectedRoute, loading]);

    // Show route on map
    useEffect(() => {
        if (!mapRef.current || !mapReady || !selectedRoute) return;
        const map = mapRef.current;
        const route = selectedRoute;
        const color = RC[routes.indexOf(route) % RC.length];

        const sourceId = 'driver-route';
        const layerId = 'driver-route-layer';
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        if (route.osrm_geometry?.coordinates) {
            map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: route.osrm_geometry } });
            map.addLayer({
                id: layerId, type: 'line', source: sourceId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': color, 'line-width': 6, 'line-opacity': 0.8 }
            });
        }

        // Cleanup old markers
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};

        // Draw stop markers
        route.points.forEach((p, i) => {
            const el = document.createElement('div');
            const isDone = collectedStops.has(p.id);
            const isCurrent = i === currentStop;

            el.style.cssText = `
                width:32px;height:32px;border-radius:50%;
                background:${isDone ? 'rgba(34,197,94,0.1)' : isCurrent ? color : '#0a1424'};
                border:3px solid ${isDone ? '#22c55e' : isCurrent ? '#fff' : '#1a2e42'};
                color:${isDone ? '#22c55e' : isCurrent ? '#000' : '#fff'};
                font-size:12px;font-weight:700;
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 0 ${isCurrent ? 24 : 8}px ${isCurrent ? color : 'transparent'};
                cursor:pointer; transition:all .4s cubic-bezier(0.4, 0, 0.2, 1);
                ${isCurrent ? `transform: scale(1.3); z-index: 10; animation: glow-pulse 2s infinite;` : 'z-index: 1;'}
            `;
            el.textContent = isDone ? '✓' : (i + 1);

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([Number(p.lng), Number(p.lat)])
                .addTo(map);
            markersRef.current[p.id] = marker;
        });

        // Smooth fly to current stop
        const stop = route.points[currentStop];
        if (stop) {
            map.flyTo({
                center: [Number(stop.lng), Number(stop.lat)],
                zoom: 16.5,
                pitch: 45, // Add a cool 3D perspective angle
                duration: 1500
            });
        }
    }, [selectedRoute, mapReady, currentStop, collectedStops]);

    const confirmCollection = () => {
        if (!selectedRoute) return;
        const stop = selectedRoute.points[currentStop];
        if (!stop) return;

        setCollectedStops(prev => new Set([...prev, stop.id]));

        // Persist to DB
        fetch('/api/points/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
            body: JSON.stringify({ point_ids: [stop.id] })
        }).catch(() => { });

        // Move to next
        const nextStop = currentStop + 1;
        if (nextStop < selectedRoute.points.length) {
            setCurrentStop(nextStop);
        }
    };

    const currentStopData = selectedRoute?.points?.[currentStop];
    const progress = selectedRoute ? (collectedStops.size / selectedRoute.points.length) : 0;
    const allDone = selectedRoute && collectedStops.size >= selectedRoute.points.length;

    if (loading) return (
        <div className="driver-view" style={{ alignItems: 'center', justifyContent: 'center', background: '#050b14' }}>
            <span className="spin" style={{ width: 40, height: 40, borderWidth: 4, borderColor: 'rgba(0,229,184,0.2)', borderTopColor: '#00e5b8' }} />
            <div style={{ marginTop: 16, color: '#00e5b8', fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>SYNCHRONISATION...</div>
        </div>
    );

    return (
        <>
            <Head><title>CLEAN AGADIR — Terminal Driver</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="driver-view" style={{ background: '#050b14' }}>
                {/* ── HEADER ── */}
                <div style={{
                    padding: '16px 20px', background: 'rgba(5,11,20,0.85)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    zIndex: 10
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                        background: 'linear-gradient(135deg, #00e5b8, #00a88a)',
                        boxShadow: '0 4px 16px rgba(0,229,184,0.3), inset 0 2px 0 rgba(255,255,255,0.2)'
                    }}>🚛</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: 0.5 }}>CLEAN AGADIR Driver</div>
                        <div style={{ fontSize: 12, color: '#00e5b8', fontFamily: "'JetBrains Mono', monospace" }}>{auth.user?.name || 'CHAUFFEUR #204'}</div>
                    </div>
                    <Link href={route('dashboard')} style={{
                        color: '#7a92aa', fontSize: 20, textDecoration: 'none',
                        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)'
                    }}>⎋</Link>
                </div>

                {/* ── ROUTE SELECTION (No route selected) ── */}
                {!selectedRoute && (
                    <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#7a92aa', marginBottom: 16 }}>
                            {routes.length === 0 ? 'Aucune affectation' : 'Feuilles de route disponibles'}
                        </div>

                        {routes.length === 0 && (
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16, padding: '40px 20px', marginTop: 20 }}>
                                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📭</div>
                                <div style={{ color: '#dde6f4', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>En attente de dispatching</div>
                                <div style={{ color: '#7a92aa', fontSize: 13, lineHeight: 1.5 }}>Veuillez patienter pendant que le centre de contrôle optimise les tournées.</div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: 16 }}>
                            {routes.map((r, i) => {
                                const routeColor = RC[i % RC.length];
                                return (
                                    <div key={i} onClick={() => { setSelectedRoute(r); setCurrentStop(0); setCollectedStops(new Set()); }}
                                        style={{
                                            background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '20px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            borderLeft: `4px solid ${routeColor}`,
                                            cursor: 'pointer', transition: 'all .25s',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ background: `${routeColor}22`, color: routeColor, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                                                    Tournée {i + 1}
                                                </div>
                                            </div>
                                            <div style={{ color: '#fff', fontSize: 24, opacity: 0.3 }}>›</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 24 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#7a92aa', marginBottom: 4 }}>ARRÊTS</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{r.points?.length || 0}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: '#7a92aa', marginBottom: 4 }}>DISTANCE</div>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{r.distance_km} <span style={{ fontSize: 14, color: '#7a92aa' }}>km</span></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── MAP & NAVIGATION (Route selected) ── */}
                {selectedRoute && (
                    <div className="driver-map">
                        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                        {/* Top HUD */}
                        <div style={{
                            position: 'absolute', top: 16, left: 16, right: 16,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            zIndex: 10
                        }}>
                            <button onClick={() => setSelectedRoute(null)} style={{
                                background: 'rgba(5,11,20,0.85)', backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                width: 44, height: 44, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                            }}>
                                ←
                            </button>

                            <div style={{
                                background: 'rgba(5,11,20,0.85)', backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
                                padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                            }}>
                                <span style={{ color: '#00e5b8', fontWeight: 700, fontSize: 14 }}>
                                    {collectedStops.size} / {selectedRoute.points.length}
                                </span>
                                <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progress * 100}%`, background: '#00e5b8', borderRadius: 99, transition: 'width .5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                </div>
                            </div>
                        </div>

                        {/* Glassmorphism Bottom Sheet Context */}
                        <div style={{
                            position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 10,
                            background: 'rgba(10,20,36,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
                            padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
                        }}>
                            {allDone ? (
                                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <div style={{ width: 64, height: 64, background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                                        ✅
                                    </div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Tournée Terminée!</div>
                                    <div style={{ color: '#7a92aa', fontSize: 14, marginBottom: 24 }}>Vous avez collecté les {selectedRoute.points.length} points avec succès.</div>
                                    <button onClick={() => setSelectedRoute(null)} style={{
                                        width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                                        background: '#fff', color: '#000', fontSize: 16, fontWeight: 700, cursor: 'pointer'
                                    }}>
                                        Retour au Menu Principal
                                    </button>
                                </div>
                            ) : currentStopData ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <div style={{ background: '#00e5b8', color: '#000', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Prochain Arrêt</div>
                                                <div style={{ color: '#7a92aa', fontSize: 12, fontWeight: 600 }}>#{currentStop + 1}</div>
                                            </div>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>{currentStopData.name || 'Benne Publique'}</div>
                                            <div style={{ fontSize: 13, color: '#7a92aa', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                📍 {currentStopData.zone || 'Zone résidentielle'}
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 16, padding: '12px 16px', textAlign: 'center',
                                            minWidth: 80
                                        }}>
                                            <div style={{ fontSize: 26, fontWeight: 700, color: (currentStopData.fill_level || 0) >= 85 ? '#f43f5e' : (currentStopData.fill_level || 0) >= 50 ? '#fbbf24' : '#22c55e', lineHeight: 1 }}>
                                                {currentStopData.fill_level || 0}<span style={{ fontSize: 16 }}>%</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: '#7a92aa', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Volume</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${currentStopData.lat},${currentStopData.lng}`} target="_blank" rel="noreferrer"
                                            style={{
                                                flex: 1, padding: '16px', borderRadius: 16, textDecoration: 'none',
                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                                                color: '#38bdf8', fontSize: 15, fontWeight: 600,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                            }}>
                                            ↗️ Navigation
                                        </a>

                                        <button onClick={confirmCollection} style={{
                                            flex: 2, padding: '16px', borderRadius: 16, border: 'none',
                                            background: 'linear-gradient(135deg, #00e5b8, #00a88a)', color: '#06101c',
                                            fontSize: 16, fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            boxShadow: '0 8px 24px rgba(0,229,184,0.3)'
                                        }}>
                                            ✅ Confirmer
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                                        <button style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: 12, fontWeight: 600, opacity: 0.8, cursor: 'pointer', textDecoration: 'underline' }}>
                                            Signaler un problème d'accès
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
