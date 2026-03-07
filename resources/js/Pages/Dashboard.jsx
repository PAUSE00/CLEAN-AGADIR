import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

// Waste category colors (exactly from original)
const WC = { medical: '#f43f5e', organic: '#22c55e', recyclable: '#38bdf8', paper: '#fbbf24', general: '#a78bfa' };
const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];

// Error Boundary to prevent full blank page on runtime errors
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('Dashboard Error:', error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ background: '#06101c', color: '#f43f5e', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Erreur d'affichage</div>
                    <div style={{ fontSize: 12, color: '#7a92aa', maxWidth: 600, textAlign: 'center', marginBottom: 24 }}>{this.state.error?.message}</div>
                    <button onClick={() => this.setState({ hasError: false, error: null })} style={{ background: '#00e5b8', color: '#06101c', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>↻ Recharger</button>
                </div>
            );
        }
        return this.props.children;
    }
}

function AnimatedCounter({ value, duration = 800 }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const end = parseFloat(value) || 0;
        if (end === 0) { setCount(0); return; }
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            setCount(Math.floor(p * end));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [value, duration]);
    return <span>{count}</span>;
}

export default function Dashboard(props) {
    return <ErrorBoundary><DashboardInner {...props} /></ErrorBoundary>;
}

function DashboardInner({ auth }) {
    const isAdmin = auth.user?.is_admin;
    const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
    const [pts, setPts] = useState([]);
    const [trucks, setTrucks] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [vrpRunning, setVrpRunning] = useState(false);
    const [vrpResult, setVrpResult] = useState(null);
    const [numTrucks, setNumTrucks] = useState(0);
    const [capacity, setCapacity] = useState(500);
    const [algorithm, setAlgorithm] = useState('nsga');
    const [iterations, setIterations] = useState(80);
    const [wasteFilter, setWasteFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('carte');
    const [logs, setLogs] = useState([{ id: 0, msg: 'Système prêt.', type: 'ok', time: new Date().toLocaleTimeString() }]);
    const [toasts, setToasts] = useState([]);
    const [highlightRoute, setHighlightRoute] = useState(null);
    const [lyPts, setLyPts] = useState(true);
    const [lyRt, setLyRt] = useState(true);
    const [lyDep, setLyDep] = useState(true);
    const [lyHeat, setLyHeat] = useState(false);
    const [wasteFilters, setWasteFilters] = useState({ medical: true, organic: true, recyclable: true, paper: true, general: true });
    const [playbackRouteIndex, setPlaybackRouteIndex] = useState(null);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [collectedPoints, setCollectedPoints] = useState(new Set());
    const [numDepots, setNumDepots] = useState(1);
    const [fleetTrucks, setFleetTrucks] = useState([]);
    const [showDemo, setShowDemo] = useState(false);
    const [iotSimRunning, setIotSimRunning] = useState(false);
    const [iotAlerts, setIotAlerts] = useState([]);
    const [benchResult, setBenchResult] = useState(null);
    const [benchRunning, setBenchRunning] = useState(false);
    const iotTimerRef = useRef(null);
    const animationRef = useRef(null);
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const markersRef = useRef({});
    const truckMarkerRef = useRef(null);
    const truckAnimRef = useRef(null);
    const [truckPos, setTruckPos] = useState(null);
    const routesLayerIds = useRef([]);
    const depotRef = useRef(null); // always stores current depot point
    const [emergencyReplanningNeeded, setEmergencyReplanningNeeded] = useState(false);

    const addLog = (msg, type = "info") => {
        setLogs(prev => [{ id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    };
    const addToast = (msg, type = "info") => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    useEffect(() => {
        fetch("/api/mapbox/token")
            .then(res => res.json())
            .then(data => {
                const token = data.token || '';
                mapboxgl.accessToken = token;
                initMap();
                loadData();
            })
            .catch(() => {
                // If token fetch fails, still initialize map with default token and load data
                mapboxgl.accessToken = '';
                initMap();
                loadData();
            });
        return () => { };
    }, []); // Run only once on mount — NOT on every pts change

    const initMap = () => {
        if (mapRef.current) return;
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-9.5981, 30.4278], zoom: 12, pitch: 45, bearing: -17.6, antialias: true
        });
        mapRef.current.on('style.load', () => {
            setMapStyleLoaded(true);
            mapRef.current.addLayer({
                'id': '3d-buildings', 'source': 'composite', 'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'], 'type': 'fill-extrusion', 'minzoom': 14,
                'paint': { 'fill-extrusion-color': '#aaa', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'min_height'], 'fill-extrusion-opacity': 0.6 }
            });
            // Do NOT call loadData() here — data is already loaded once from the token fetch above.
            // Calling it here would re-trigger setPts(), which could cause unnecessary re-renders.
        });
    };

    const loadData = async () => {
        try {
            const pRes = await fetch("/api/points");
            const pData = await pRes.json();
            setPts(pData);
            const tRes = await fetch("/api/trucks");
            const tData = await tRes.json();
            setTrucks(tData);
            addLog(`✓ ${pData.length} points + ${tData.length} camions chargés`, "ok");
        } catch (e) { addLog("Erreur chargement données", "err"); }
    };

    // Waste icons by category
    const WC_ICON = { medical: '💊', organic: '🥬', recyclable: '♻️', paper: '📄', general: '🗑️' };

    // Render markers
    useEffect(() => {
        if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};
        if (!lyPts && !lyDep) return;
        pts.forEach(p => {
            const lat = Number(p.lat);
            const lng = Number(p.lng);
            // Skip invalid coordinates
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            if (lat === 0 && lng === 0) return;

            if (!lyPts && !p.is_depot) return;
            if (!lyDep && p.is_depot) return;
            const wc = p.waste_category || 'general';
            if (!wasteFilters[wc] && !p.is_depot) return;
            const isCollected = collectedPoints.has(p.id);
            const color = isCollected ? '#374e64' : (p.is_depot ? '#ffffff' : (WC[wc] || '#a78bfa'));
            const fillPct = isCollected ? 0 : (p.fill_level || 0);
            const isCritical = fillPct >= 85;

            const container = document.createElement('div');
            container.style.cssText = 'display:flex;align-items:center;justify-content:center;cursor:pointer;';
            const inner = document.createElement('div');

            if (p.is_depot) {
                inner.style.cssText = [
                    `background: #ffffff`,
                    `color: #000000`,
                    `font-size: 11px`,
                    `font-weight: 800`,
                    `padding: 3px 6px`,
                    `border-radius: 4px`,
                    `border: 2px solid #000`,
                    `box-shadow: 0 4px 6px rgba(0,0,0,0.3)`,
                    `display: flex; align-items: center; justify-content: center`,
                    `cursor: pointer; user-select: none; z-index: 50`,
                    `transition: transform .15s`
                ].join(';');
                // Generic name like D1, D2
                inner.textContent = `D${p.id}`;
            } else {
                const size = 22;
                const collectedColor = '#00e5b8'; // neon cyan/green for emptied bins
                inner.style.cssText = [
                    `width:${size}px;height:${size}px;border-radius:50%`,
                    `background:${isCollected ? '#001a14' : color + '40'}`,
                    `border: 2px solid ${isCollected ? collectedColor : color}`,
                    `color: ${isCollected ? collectedColor : '#ffffff'}`,
                    `font-size:10px`,
                    `font-weight:700`,
                    `display:flex;align-items:center;justify-content:center`,
                    `cursor:pointer;user-select:none`,
                    `box-shadow:0 0 ${isCollected ? 10 : (isCritical ? 14 : 6)}px ${isCollected ? collectedColor : color}`,
                    `transition:all .3s ease`,
                    `z-index: ${isCritical ? 40 : 30}`,
                    isCritical && !isCollected ? 'animation:pulse-marker 1s infinite alternate;' : ''
                ].join(';');
                inner.textContent = isCollected ? '✓' : Math.round(fillPct);
            }
            inner.title = `${p.name} — ${fillPct}%`;
            inner.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.3)'; });
            inner.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
            container.appendChild(inner);

            const popupHTML = `<div style="background:#0d1b2a;border:1px solid ${color}44;border-radius:8px;padding:8px 12px;font-family:'Space Grotesk',sans-serif;min-width:140px">
                <div style="font-weight:700;font-size:12px;color:#dde6f4;margin-bottom:2px">${p.name}</div>
                ${!p.is_depot && p.zone ? `<div style="font-size:10px;color:#7a92aa;margin-bottom:6px">📍 ${p.zone}</div>` : ''}
                <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:${color}">${WC_ICON[wc] || ''} ${wc} · <b>${fillPct}%</b></div>
                ${!p.is_depot ? `<div style="margin-top:6px;margin-bottom:6px;height:4px;background:#1a2e42;border-radius:4px"><div style="height:100%;width:${fillPct}%;background:${color};border-radius:4px"></div></div>` : ''}
                ${p.open_time && p.close_time ? `<div style="font-size:10px;color:#a0aec0;border-top:1px dashed #1a2e42;padding-top:6px;margin-top:4px;display:flex;align-items:center;gap:4px">🕒 <span>${p.open_time.slice(0, 5)}</span><span style="color:#4a5568">—</span><span>${p.close_time.slice(0, 5)}</span></div>` : ''}
            </div>`;
            const popup = new mapboxgl.Popup({ offset: 18, closeButton: false, className: 'vp-popup' }).setHTML(popupHTML);
            const marker = new mapboxgl.Marker(container).setLngLat([lng, lat]).setPopup(popup).addTo(mapRef.current);
            markersRef.current[p.id] = marker;
        });
    }, [pts, wasteFilters, collectedPoints, lyPts, lyDep, mapStyleLoaded]);


    // Sync depotRef without triggering routes effect
    useEffect(() => { depotRef.current = pts.find(p => p.is_depot) || null; }, [pts]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const renderRoutes = () => {
            if (!map.isStyleLoaded()) return;
            try {
                // Clear old layers/sources
                routesLayerIds.current.forEach(id => {
                    if (map.getLayer(id)) map.removeLayer(id);
                    if (map.getSource(id)) map.removeSource(id);
                });
                routesLayerIds.current = [];
                if (!lyRt || !routes.length) return;

                routes.forEach((r, i) => {
                    const color = RC[i % RC.length];
                    const sourceId = `route-source-${i}`;
                    const haloId = `route-halo-${i}`;
                    const layerId = `route-layer-${i}`;

                    let coords = r.osrm_geometry?.coordinates;
                    if (!coords || coords.length === 0) {
                        const depot = depotRef.current;
                        if (depot) coords = [[depot.lng, depot.lat], ...r.points.map(p => [p.lng, p.lat]), [depot.lng, depot.lat]];
                        else coords = r.points.map(p => [p.lng, p.lat]);
                    }
                    if (!coords || coords.length < 2) return;

                    const isActive = playbackRouteIndex === i;
                    const isOther = playbackRouteIndex !== null && !isActive;
                    const lineOpacity = isOther ? 0.2 : (highlightRoute === null || highlightRoute === i ? 1 : 0.3);
                    const lineWidth = isActive ? 6 : (highlightRoute === i ? 5 : 3);

                    try {
                        const geo = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
                        // Update existing source (prevents flicker) or add new
                        if (map.getSource(sourceId)) {
                            map.getSource(sourceId).setData(geo);
                        } else {
                            map.addSource(sourceId, { type: 'geojson', data: geo });
                        }
                        // Halo layer
                        if (!map.getLayer(haloId)) {
                            map.addLayer({ id: haloId, type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': lineWidth + 8, 'line-opacity': isOther ? 0.05 : 0.15 } });
                        } else {
                            map.setPaintProperty(haloId, 'line-opacity', isOther ? 0.05 : 0.15);
                            map.setPaintProperty(haloId, 'line-width', lineWidth + 8);
                        }
                        // Main route line
                        if (!map.getLayer(layerId)) {
                            map.addLayer({ id: layerId, type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': lineWidth, 'line-opacity': lineOpacity } });
                        } else {
                            map.setPaintProperty(layerId, 'line-opacity', lineOpacity);
                            map.setPaintProperty(layerId, 'line-width', lineWidth);
                        }
                        routesLayerIds.current.push(haloId, layerId);
                    } catch (_) { /* skip bad route */ }
                });
            } catch (e) { console.error('Route render error:', e); }
        };

        // Run now, or wait for style to load
        if (map.isStyleLoaded()) renderRoutes();
        else map.once('styledata', renderRoutes);
    }, [routes, highlightRoute, playbackRouteIndex, lyRt]);

    // Heatmap Layer
    useEffect(() => {
        if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

        const sourceId = 'heatmap-source';
        const layerId = 'heatmap-layer';

        if (mapRef.current.getLayer(layerId)) mapRef.current.removeLayer(layerId);
        if (mapRef.current.getSource(sourceId)) mapRef.current.removeSource(sourceId);

        if (!lyHeat || pts.length === 0) return;

        const features = pts
            .filter(p => !p.is_depot && !collectedPoints.has(p.id))
            .filter(p => {
                const wc = p.waste_category || 'general';
                return wasteFilters[wc] === true;
            })
            .map(p => ({
                type: 'Feature',
                properties: { fill_level: p.fill_level || 0 },
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
            }));

        mapRef.current.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
        mapRef.current.addLayer({
            id: layerId,
            type: 'heatmap',
            source: sourceId,
            maxzoom: 16,
            paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'fill_level'], 0, 0, 100, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 3],
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, '#00e5b8',
                    0.4, '#fbbf24',
                    0.6, '#f97316',
                    0.8, '#ef4444',
                    1, '#991b1b'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 20, 16, 60],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 16, 0]
            }
        });
    }, [pts, lyHeat, wasteFilters, collectedPoints]);

    // Fetch OSRM road geometry for a route's points
    const fetchOsrmGeometry = async (points, depot) => {
        try {
            const coords = [[depot.lng, depot.lat], ...points.map(p => [p.lng, p.lat]), [depot.lng, depot.lat]];
            const coordStr = coords.map(c => c.join(',')).join(';');
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes?.[0]?.geometry) return data.routes[0].geometry;
        } catch { /* Fallback to straight line if OSRM fails */ }
        return null;
    };

    const runVRP = async () => {
        if (!isAdmin) return;
        setVrpRunning(true);
        addLog(`▶ Optimisation ${algorithm.toUpperCase()} en cours...`, "info");
        try {
            const res = await fetch("/api/vrp/optimize", {
                method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ num_trucks: numTrucks, capacity, algorithm, iterations, waste_filter: wasteFilter }),
            });
            const data = await res.json();
            if (data.error) { addLog(`✗ ${data.error}`, "err"); return; }

            // Enrich routes with OSRM road geometry
            addLog(`🗺️ Calcul routes routières réelles (OSRM)...`, "info");
            const depot = pts.find(p => p.is_depot);
            const enriched = await Promise.all(data.routes.map(async (r) => {
                const geo = depot ? await fetchOsrmGeometry(r.points, depot) : null;
                return { ...r, osrm_geometry: geo };
            }));

            setVrpResult({ ...data, routes: enriched });
            setRoutes(enriched);
            addLog(`✓ ${enriched.length} routes · ${data.total_km}km · ${data.computation_ms}ms`, "ok");
            addToast(`✅ ${enriched.length} routes optimisées sur routes réelles!`, 'ok');
            setActiveTab('carte');
        } catch (e) { addLog(`✗ Erreur VRP: ${e.message}`, "err"); }
        finally { setVrpRunning(false); }
    };

    const exportPdf = async () => {
        if (!vrpResult || !routes.length) return;
        try {
            addLog("📄 Génération PDF...", "info");
            const res = await fetch("/api/export/vrp-pdf", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content }, body: JSON.stringify({ routes: vrpResult.routes, stats: vrpResult.stats || [], algorithm: vrpResult.algorithm, total_km: vrpResult.total_km, time_ms: vrpResult.computation_ms }), });
            if (!res.ok) throw new Error("Erreur serveur");
            const blob = await res.blob();
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `rapport-vrp-${new Date().toISOString().slice(0, 10)}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
            addLog("✅ PDF exporté", "ok"); addToast("PDF exporté", "ok");
        } catch (e) { addLog(`✗ PDF: ${e.message}`, "err"); }
    };

    const exportCSV = () => {
        let csv = "Route,ID,Nom,Lat,Lng,Remplissage\n";
        routes.forEach((r, i) => r.points.forEach(p => csv += `${i + 1},${p.id},"${p.name}",${p.lat},${p.lng},${p.fill_level}\n`));
        const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.setAttribute("download", "vrp-routes.csv"); document.body.appendChild(link); link.click(); link.remove();
    };

    const playRoute = (index) => {
        if (playbackRouteIndex === index) {
            setPlaybackRouteIndex(null);
            if (animationRef.current?.cancelled !== undefined) animationRef.current.cancelled = true;
            if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
            return;
        }

        const route = routes[index];
        if (!route || !route.points || route.points.length === 0) return;

        const depot = pts.find(p => p.is_depot);
        if (!depot) { addLog("✗ Dépôt non trouvé", "err"); return; }

        setActiveTab('carte');
        setPlaybackRouteIndex(index);
        setPlaybackProgress(0);
        setCollectedPoints(new Set());
        setHighlightRoute(index);
        addLog(`🚛 Départ Route ${index + 1} — ${route.points.length} bennes à collecter`, 'info');

        const routeColor = RC[index % RC.length];
        const osrmCoords = route.osrm_geometry?.coordinates;

        // Create truck marker at depot — needs explicit size for Mapbox to position it
        if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
        const truckContainer = document.createElement('div');
        truckContainer.style.cssText = `width:44px;height:44px;display:flex;align-items:center;justify-content:center;pointer-events:none;`;
        const truckEl = document.createElement('div');
        truckEl.innerHTML = '🚛';
        truckEl.style.cssText = `font-size:30px;line-height:1;filter:drop-shadow(0 0 10px ${routeColor}) drop-shadow(0 0 20px ${routeColor});animation:truck-bounce .4s ease-in-out infinite alternate;`;
        truckContainer.appendChild(truckEl);
        const dLng = Number(depot.lng), dLat = Number(depot.lat);
        truckMarkerRef.current = new mapboxgl.Marker({ element: truckContainer, anchor: 'center' })
            .setLngLat([dLng, dLat])
            .addTo(mapRef.current);

        mapRef.current.flyTo({ center: [dLng, dLat], zoom: 14, duration: 1200 });

        const cancelRef = { cancelled: false };
        animationRef.current = cancelRef;
        const collected = new Set();

        // Smoothly move truck from [lng1,lat1] to [lng2,lat2] over durationMs
        const animateSegment = (from, to, durationMs) => new Promise(resolve => {
            if (cancelRef.cancelled) return resolve();
            let t0 = null;
            const tick = (ts) => {
                if (cancelRef.cancelled) return resolve();
                if (!t0) t0 = ts;
                const t = Math.min((ts - t0) / durationMs, 1);
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                const lng = from[0] + (to[0] - from[0]) * ease;
                const lat = from[1] + (to[1] - from[1]) * ease;
                if (truckMarkerRef.current) truckMarkerRef.current.setLngLat([lng, lat]);
                if (mapRef.current) mapRef.current.easeTo({ center: [lng, lat], duration: 150 });
                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            requestAnimationFrame(tick);
        });

        // Move truck along a path at CONSTANT speed: msPerDeg = ms per degree of coordinate distance
        const animatePath = async (coords, msPerDeg) => {
            if (!coords || coords.length < 2) return;
            for (let i = 0; i < coords.length - 1 && !cancelRef.cancelled; i++) {
                const dist = Math.hypot(coords[i + 1][0] - coords[i][0], coords[i + 1][1] - coords[i][1]);
                await animateSegment(coords[i], coords[i + 1], Math.max(dist * msPerDeg, 25));
            }
        };

        // Find OSRM coord index closest to a {lat,lng} waypoint
        const closestIdx = (coords, pt) => {
            let best = 0, bestD = Infinity;
            coords.forEach(([lng, lat], i) => { const d = Math.hypot(lng - pt.lng, lat - pt.lat); if (d < bestD) { bestD = d; best = i; } });
            return best;
        };

        const waypoints = [depot, ...route.points, depot];
        const totalSegs = waypoints.length - 1;

        // Build per-segment OSRM slices using closest-point boundaries
        let segmentPaths;
        if (osrmCoords && osrmCoords.length >= 2) {
            const indices = waypoints.map(wp => closestIdx(osrmCoords, wp));
            segmentPaths = Array.from({ length: totalSegs }, (_, si) => {
                const s = Math.min(indices[si], osrmCoords.length - 2);
                const e = Math.min(indices[si + 1] + 1, osrmCoords.length);
                return (e > s + 1) ? osrmCoords.slice(s, e)
                    : [[waypoints[si].lng, waypoints[si].lat], [waypoints[si + 1].lng, waypoints[si + 1].lat]];
            });
        } else {
            segmentPaths = Array.from({ length: totalSegs }, (_, si) =>
                Array.from({ length: 12 }, (__, k) => {
                    const t = k / 11;
                    return [waypoints[si].lng + (waypoints[si + 1].lng - waypoints[si].lng) * t,
                    waypoints[si].lat + (waypoints[si + 1].lat - waypoints[si].lat) * t];
                })
            );
        }

        // Constant speed: ~25s for full route regardless of distance
        const totalLen = segmentPaths.reduce((sum, path) => {
            for (let i = 0; i < path.length - 1; i++) sum += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
            return sum;
        }, 0);
        const msPerDeg = totalLen > 0 ? 25000 / totalLen : 8000;

        (async () => {
            for (let seg = 0; seg < totalSegs && !cancelRef.cancelled; seg++) {
                // Drive this road segment at constant speed
                await animatePath(segmentPaths[seg], msPerDeg);
                if (cancelRef.cancelled) break;

                // Snap truck exactly to the waypoint
                const arrivalWp = waypoints[seg + 1];
                if (truckMarkerRef.current) truckMarkerRef.current.setLngLat([arrivalWp.lng, arrivalWp.lat]);
                setPlaybackProgress((seg + 1) / totalSegs);

                // Collect the bin at this stop (if it's a collection point, not the final return-to-depot)
                const binPoint = route.points[seg];
                if (binPoint) {
                    // Visual: flash the truck and collect
                    truckEl.innerHTML = '🚛💨';
                    addLog(`♻️ Collecte: ${binPoint.name} (${binPoint.fill_level}% → 0%)`, 'ok');
                    collected.add(binPoint.id);
                    setCollectedPoints(new Set(collected));
                    // Reset fill level in local state to 0
                    setPts(prev => prev.map(p => p.id === binPoint.id ? { ...p, fill_level: 0 } : p));
                    await new Promise(r => setTimeout(r, 550)); // brief collection pause

                    truckEl.innerHTML = '🚛';
                }
            }

            if (!cancelRef.cancelled) {
                addLog(`✅ Route ${index + 1} terminée — ${route.points.length} bennes collectées!`, 'ok');
                addToast(`Route ${index + 1} terminée ✅`, 'ok');
                // Persist to server
                fetch('/api/points/collect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                    body: JSON.stringify({ point_ids: Array.from(collected) })
                }).catch(() => { });
                setTimeout(() => {
                    setPlaybackRouteIndex(null);
                    if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
                }, 1500);
            }
        })();
    };

    const addTruck = async (size) => {
        try {
            const res = await fetch('/api/trucks', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ name: `Camion ${Math.floor(Math.random() * 1000)}`, size, waste_type: 'general' })
            });
            if (res.ok) { addLog(`Camion ${size} ajouté à la flotte`, 'ok'); loadData(); }
        } catch (e) { addLog(`Erreur ajout camion`, 'err'); }
    };

    const removeTruck = async (id) => {
        try {
            const res = await fetch(`/api/trucks/${id}`, {
                method: 'DELETE', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content }
            });
            if (res.ok) { addLog(`Camion #${id} retiré de la flotte`, 'info'); loadData(); }
        } catch (e) { }
    };

    const triggerBreakdown = async (routeIndex) => {
        addLog(`💥 Panne signalée sur la Route ${routeIndex + 1} ! Replannification des points restants...`, 'err');
        addToast(`Panne de Camion détectée`, 'err');
        if (playbackRouteIndex === routeIndex) {
            cancelAnimationFrame(animationRef.current);
            setPlaybackRouteIndex(null);
            if (truckMarkerRef.current) truckMarkerRef.current.remove();
            truckMarkerRef.current = null;
        }
        if (trucks.length > 0) await removeTruck(trucks[0].id);
        setActiveTab('vrp');
        runVRP();
    };

    const statsChart = useMemo(() => {
        let counts = { organic: 0, medical: 0, recyclable: 0, paper: 0, general: 0 };
        pts.forEach(p => { const wc = p.waste_category || 'general'; counts[wc] = (counts[wc] || 0) + 1; });
        return Object.entries(counts).map(([k, v]) => ({ name: k, value: v, fill: WC[k] }));
    }, [pts]);

    const avgFill = useMemo(() => {
        if (!pts.length) return 0;
        return (pts.reduce((s, p) => s + (p.fill_level || 0), 0) / pts.length).toFixed(1);
    }, [pts]);

    const criticalCount = useMemo(() => pts.filter(p => p.fill_level >= 85).length, [pts]);

    const toggleWaste = (cat) => setWasteFilters(prev => ({ ...prev, [cat]: !prev[cat] }));

    const TABS = [
        { id: 'carte', icon: '🗺️', label: 'Carte' },
        { id: 'vrp', icon: '🧠', label: 'VRP' },
        { id: 'iot', icon: '⚡', label: 'IoT' },
        { id: 'fleet', icon: '🚛', label: 'Flotte' },
        { id: 'stats', icon: '📊', label: 'Stats' },
        { id: 'bench', icon: '✨', label: 'Bench' },
    ];

    return (
        <>
            <Head><title>VillePropre — Système VRP Dynamique · Agadir PFE</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
            </Head>

            {/* DEMO OVERLAY */}
            {showDemo && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,17,30,.97)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#00e5b8', textAlign: 'center' }}>♻️ VillePropre — VRP Dynamique</div>
                    <div style={{ fontSize: 13, color: '#7a92aa', textAlign: 'center', maxWidth: 540, lineHeight: 1.7 }}>
                        Optimisation des tournées de collecte des déchets · Agadir, Maroc<br />
                        <span style={{ color: '#00e5b8' }}>Algorithmes : Glouton · 2-opt · Tabou · K-Means · NSGA-II</span><br />
                        Volumes probabilistes · Sous-problème dynamique · Replanification
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                        {[{ v: pts.length || 833, l: 'Points réels OSM' }, { v: 5, l: 'Algorithmes VRP' }, { v: vrpResult?.total_km || '—', l: 'km optimisé' }, { v: routes.length, l: 'Routes actives' }].map((d, i) => (
                            <div key={i} style={{ background: '#0d1b2a', border: '1px solid #1a2e42', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#00e5b8', fontFamily: "'JetBrains Mono',monospace" }}>{d.v}</div>
                                <div style={{ fontSize: 10, color: '#7a92aa', marginTop: 3 }}>{d.l}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setShowDemo(false)} className="btn bb bsm" style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #1a2e42', color: '#dde6f4', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✕ Fermer</button>
                </div>
            )}

            <div id="vp-app" style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "'Space Grotesk',sans-serif", background: "#07111e", color: "#dde6f4", fontSize: 13 }}>

                {/* TOP BAR */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 52, background: "rgba(7,17,30,.97)", borderBottom: "1px solid #1a2e42", zIndex: 1000 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 15, color: "#00e5b8", flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#00e5b8,#00a88a)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>♻️</div>
                        VillePropre
                        <span style={{ fontSize: 9, background: "rgba(0,229,184,.12)", color: "#00e5b8", border: "1px solid rgba(0,229,184,.2)", padding: "1px 6px", borderRadius: 3, fontFamily: "'JetBrains Mono',monospace" }}>v4 PFE</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginLeft: 20 }}>
                        <button style={{ background: '#1a2e42', color: '#fbbf24', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>☀️ Mode: Jour</button>
                        <div style={{ display: "flex", gap: 4, background: "transparent", padding: 0 }}>
                            {TABS.map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? "#06101c" : "#7a92aa", border: activeTab === t.id ? "none" : "1px solid transparent", background: activeTab === t.id ? "#00e5b8" : "transparent", fontFamily: "'Space Grotesk',sans-serif", transition: "all .2s", display: 'flex', alignItems: 'center', gap: 6, whiteSpace: "nowrap" }}>
                                    {t.icon && <span style={{ opacity: activeTab === t.id ? 1 : 0.6 }}>{t.icon}</span>} {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#7a92aa", marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
                        <span className="pulse"></span>
                        <button onClick={() => setShowDemo(true)} style={{ padding: "4px 10px", background: "rgba(0,229,184,.1)", border: "1px solid rgba(0,229,184,.3)", color: "#00e5b8", borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: "pointer", display: 'flex', gap: 6 }}>🎓 Soutenance (Demo)</button>
                        <span>Pts:<b style={{ color: "#00e5b8", marginLeft: 4 }}>{pts.length}</b></span>
                        <span>Km:<b style={{ color: "#00e5b8", marginLeft: 4 }}>{vrpResult?.total_km || '—'}</b></span>
                        <span>Routes:<b style={{ color: "#00e5b8", marginLeft: 4 }}>{routes.length}</b></span>
                        {auth.user && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 10, borderLeft: "1px solid #1a2e42" }}>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: isAdmin ? 'rgba(244,63,94,.1)' : 'rgba(34,197,94,.1)', color: isAdmin ? '#f43f5e' : '#22c55e', border: isAdmin ? '1px solid rgba(244,63,94,.2)' : '1px solid rgba(34,197,94,.2)' }}>{isAdmin ? 'ADMIN' : 'CHAUFFEUR'}</span>
                                <span style={{ fontSize: 11, fontWeight: 500, color: '#dde6f4' }}>{auth.user.name}</span>
                                <Link href={route('logout')} method="post" as="button" style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>[Sortie]</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* BODY */}
                <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", flex: 1, overflow: "hidden" }}>
                    {/* SIDEBAR */}
                    <div style={{ background: "#08101f", borderRight: "1px solid #1a2e42", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>

                        {/* TAB: CARTE */}
                        {activeTab === 'carte' && (
                            <div className="fade-in">
                                <Sec title="Métriques Temps Réel">
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                        <div className="kpi"><div className="kv" style={{ color: '#00e5b8' }}><AnimatedCounter value={pts.length} /></div><div className="kl">Points</div></div>
                                        <div className="kpi"><div className="kv" style={{ color: '#00e5b8' }}>{routes.length}</div><div className="kl">Routes actives</div></div>
                                        <div className="kpi"><div className="kv" style={{ color: '#38bdf8' }}>{vrpResult?.total_km || '—'}km</div><div className="kl">Distance totale</div></div>
                                        <div className="kpi"><div className="kv" style={{ color: '#10b981' }}>{avgFill}%</div><div className="kl">Remplissage Moy</div></div>
                                    </div>
                                </Sec>
                                <Sec title="Filtres Déchets">
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                                        {Object.entries({ medical: { icon: '', label: 'Medical' }, organic: { icon: '', label: 'Organic' }, recyclable: { icon: '', label: 'Recyclable' }, paper: { icon: '', label: 'Paper' }, general: { icon: '', label: 'General' } }).map(([k, v]) => (
                                            <div key={k} onClick={() => toggleWaste(k)} className={`chip ${wasteFilters[k] ? 'on' : 'off'}`} style={{ border: wasteFilters[k] ? '1px solid ' + WC[k] : '1px solid #1a2e42', padding: '3px 10px', borderRadius: 20, color: wasteFilters[k] ? WC[k] : '#7a92aa', cursor: 'pointer', transition: '.2s', fontSize: 10, fontWeight: 600 }}>{v.label}</div>
                                        ))}
                                    </div>
                                </Sec>
                                <Sec title="Couches & Options">
                                    <label className="ly-row"><input type="checkbox" checked={lyPts} onChange={e => setLyPts(e.target.checked)} /> Points collecte</label>
                                    <label className="ly-row"><input type="checkbox" checked={lyRt} onChange={e => setLyRt(e.target.checked)} /> Tracés routes</label>
                                    <label className="ly-row"><input type="checkbox" checked={lyHeat} onChange={e => setLyHeat(e.target.checked)} /> Heatmap densité</label>
                                </Sec>
                                <Sec title="Routes Actives">
                                    {routes.length === 0 ? <div style={{ color: "#374e64", fontSize: 11, textAlign: "center", padding: 14 }}>Aucune route calculée</div> : (
                                        <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                                            {routes.map((r, i) => (
                                                <div key={i} className={`ri ${highlightRoute === i ? 'hl' : ''}`} onClick={() => setHighlightRoute(i)} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, padding: 10, borderRadius: 8, background: '#0a1424', border: '1px solid #1a2e42' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: RC[i % RC.length], flexShrink: 0 }}></div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: '#dde6f4', fontSize: 11, fontWeight: 600 }}>Route {i + 1}</div>
                                                            <div style={{ fontSize: 9, color: '#7a92aa', fontFamily: "'JetBrains Mono',monospace" }}>{r.points.length} pts · {r.distance_km}km · {(r.distance_km * 0.21).toFixed(2)}kg CO₂</div>
                                                        </div>
                                                        <button onClick={e => { e.stopPropagation(); playRoute(i); }} style={{ background: playbackRouteIndex === i ? 'rgba(244,63,94,.1)' : '#00e5b8', color: playbackRouteIndex === i ? '#f43f5e' : '#06101c', border: playbackRouteIndex === i ? '1px solid #f43f5e' : 'none', padding: '5px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            {playbackRouteIndex === i ? '⏹' : '▶ Animer'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Sec>
                            </div>
                        )}

                        {/* TAB: VRP */}
                        {activeTab === 'vrp' && (
                            <div className="fade-in">
                                {isAdmin ? (<>
                                    <Sec title="Paramètres Algorithmiques (Phase Base)">
                                        <select value={algorithm} onChange={e => setAlgorithm(e.target.value)} className="vp-input">
                                            <option value="greedy">🟢 Glouton — O(n²)</option>
                                            <option value="2opt">🔵 2-opt — O(n²·k)</option>
                                            <option value="tabu">🟠 Tabou — O(n²·iter)</option>
                                            <option value="kmeans">🟣 K-Means+NN — O(k·n·i)</option>
                                            <option value="nsga">⭐ NSGA-II Multi-obj — O(n²·G)</option>
                                        </select>
                                        <div className="rr"><div className="rr-lbl"><span>Itérations Tabou/NSGA</span><b>{iterations}</b></div><input type="range" min="10" max="300" value={iterations} onChange={e => setIterations(+e.target.value)} className="vp-slider" /></div>
                                        <div className="rr"><div className="rr-lbl"><span>Camions</span><b>{numTrucks === 0 ? 'Auto' : numTrucks}</b></div><input type="range" min="0" max="20" value={numTrucks} onChange={e => setNumTrucks(+e.target.value)} className="vp-slider" /></div>
                                        <div className="rr"><div className="rr-lbl"><span>Type Déchet</span><b></b></div>
                                            <select value={wasteFilter} onChange={e => setWasteFilter(e.target.value)} className="vp-input" style={{ marginBottom: 0 }}>
                                                <option value="all">Tous types de déchets</option>
                                                <option value="medical">💊 Médical uniquement</option>
                                                <option value="organic">🥗 Organique uniquement</option>
                                                <option value="recyclable">♻️ Recyclable uniquement</option>
                                            </select>
                                        </div>
                                    </Sec>
                                    <Sec title="">
                                        <button className="btn ba" onClick={runVRP} disabled={vrpRunning} style={{ padding: '10px', fontSize: 13, display: 'flex', gap: 8, justifyContent: 'center' }}>{vrpRunning ? <><span className="spin"></span> Calcul en cours...</> : '▶ Lancer Optimisation'}</button>
                                        {routes.length > 0 && <button className="btn bb" onClick={() => { setRoutes([]); setVrpResult(null); }} style={{ marginTop: 8, color: '#f43f5e', borderColor: '#f43f5e', padding: '10px 12px' }}>✕ Effacer Routes</button>}
                                    </Sec>
                                    <Sec title="Terminal Console">
                                        <div className="log">{logs.map(l => <div key={l.id} className={`ll ${l.type}`}>[{l.time}] {l.msg}</div>)}</div>
                                    </Sec>
                                    {vrpResult && (
                                        <Sec title="Résultats Phase Base">
                                            {vrpResult.routes.map((r, i) => (
                                                <div key={i} className="abar"><div className="abar-h"><b>Route {i + 1}</b><span>{r.distance_km} km · {r.points.length} pts</span></div><div className="abar-t"><div className="abar-f" style={{ width: `${Math.min(100, (r.distance_km / ((vrpResult.total_km || 1) / vrpResult.routes.length)) * 50)}%`, background: RC[i % RC.length] }}></div></div></div>
                                            ))}
                                        </Sec>
                                    )}
                                </>) : (
                                    <div style={{ padding: 20, textAlign: 'center', color: '#7a92aa', fontSize: 13, background: 'rgba(244,63,94,.05)', borderRadius: 8, border: '1px solid rgba(244,63,94,.2)', margin: 12 }}>
                                        <div style={{ fontSize: 30, marginBottom: 10 }}>🔒</div>
                                        <div style={{ color: '#f43f5e', fontWeight: 600, marginBottom: 8 }}>Accès Restreint</div>
                                        Seul un Administrateur peut générer des plans VRP.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: IoT */}
                        {activeTab === 'iot' && (
                            <div className="fade-in">
                                <Sec title="Simulation Capteurs IoT">
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
                                        <div className="kpi"><div className="kv" style={{ color: '#f43f5e' }}>{criticalCount}</div><div className="kl">Alertes critiques</div></div>
                                        <div className="kpi"><div className="kv" style={{ color: '#fbbf24' }}>{avgFill}%</div><div className="kl">Niveau moyen</div></div>
                                        <div className="kpi"><div className="kv">{pts.filter(p => (p.fill_level || 0) >= 80).length}</div><div className="kl">Haute priorité</div></div>
                                        <div className="kpi"><div className="kv" style={{ color: '#22c55e' }}>{pts.filter(p => (p.fill_level || 0) < 50).length}</div><div className="kl">Normal (&lt;50%)</div></div>
                                    </div>
                                    <button className={`btn ${iotSimRunning ? 'bb' : 'ba'}`} style={iotSimRunning ? { borderColor: '#f43f5e', color: '#f43f5e' } : {}} onClick={async () => {
                                        if (iotSimRunning) {
                                            setIotSimRunning(false);
                                            if (iotTimerRef.current) clearInterval(iotTimerRef.current);
                                            addLog('■ Simulation IoT arrêtée', 'info');
                                            return;
                                        }
                                        setIotSimRunning(true);
                                        addLog('▶ Simulation IoT démarrée', 'ok');
                                        const runSim = async () => {
                                            try {
                                                const res = await fetch('/api/iot/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content } });
                                                const data = await res.json();
                                                if (data.alerts?.length) {
                                                    setIotAlerts(prev => [...data.alerts, ...prev].slice(0, 20));
                                                    data.alerts.forEach(a => {
                                                        addLog(`🚨 ${a.name} → ${a.fill_level}% ${a.fire_alert ? '🔥 INCENDIE!' : ''}`, a.fire_alert ? 'err' : 'info');
                                                        if (a.fill_level >= 90) {
                                                            addToast(`Alerte: ${a.name} → ${a.fill_level}%`, 'err');
                                                            setEmergencyReplanningNeeded(true);
                                                        }
                                                    });
                                                }
                                                addLog(`✓ IoT: ${data.updated} capteurs, ${data.critical_count} critiques, moy ${data.avg_fill}%`, 'ok');
                                                loadData();
                                            } catch (e) { addLog(`✗ IoT: ${e.message}`, 'err'); }
                                        };
                                        runSim();
                                        iotTimerRef.current = setInterval(runSim, 4000);
                                    }}>{iotSimRunning ? '■ Arrêter Simulation' : '▶ Démarrer Simulation IoT'}</button>
                                    <button className="btn bb" onClick={async () => {
                                        try {
                                            await fetch('/api/iot/reset', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content } });
                                            addLog('↺ Niveaux réinitialisés', 'ok'); setIotAlerts([]); loadData();
                                        } catch (e) { addLog(`✗ Reset: ${e.message}`, 'err'); }
                                    }}>↺ Réinitialiser Niveaux</button>
                                    {emergencyReplanningNeeded && (
                                        <button className="btn ba" style={{ background: '#f43f5e', borderColor: '#f43f5e', color: 'white', marginTop: 10, width: '100%', fontSize: 13, padding: 10 }} onClick={() => {
                                            setEmergencyReplanningNeeded(false);
                                            setActiveTab('vrp');
                                            runVRP();
                                        }}>🚨 Replannification d'Urgence (VRP)</button>
                                    )}
                                </Sec>
                                <Sec title="Top 10 — Niveaux Critiques">
                                    {[...pts].sort((a, b) => (b.fill_level || 0) - (a.fill_level || 0)).slice(0, 10).map((p, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
                                            <span style={{ color: (p.fill_level || 0) >= 85 ? '#f43f5e' : (p.fill_level || 0) >= 60 ? '#fbbf24' : '#dde6f4', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name?.substring(0, 30)}</span>
                                            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#00e5b8', marginLeft: 8 }}>{p.fill_level || 0}%</span>
                                        </div>
                                    ))}
                                </Sec>
                                <Sec title="Alertes Actives">
                                    {iotAlerts.length === 0 ? <div style={{ color: '#374e64', fontSize: 11, padding: 10 }}>Aucune alerte — Lance la simulation</div> : (
                                        <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                                            {iotAlerts.map((a, i) => (
                                                <div key={i} className="ri" style={{ borderColor: a.fire_alert ? '#f43f5e' : '#fbbf24' }}>
                                                    <div style={{ fontSize: 14 }}>{a.fire_alert ? '🔥' : '⚠️'}</div>
                                                    <div className="ri-info"><div className="ri-name" style={{ color: a.fire_alert ? '#f43f5e' : '#fbbf24' }}>{a.name?.substring(0, 25)}</div><div className="ri-sub">{a.category} · {a.fill_level}%</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Sec>
                            </div>
                        )}

                        {/* TAB: FLEET */}
                        {activeTab === 'fleet' && (
                            <div className="fade-in">
                                <Sec title="Gestion de la Flotte">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                        <button className="btn bb" onClick={() => addTruck('small')} style={{ fontSize: 10, padding: '6px' }}>+ Petit</button>
                                        <button className="btn bb" onClick={() => addTruck('medium')} style={{ fontSize: 10, padding: '6px' }}>+ Moyen</button>
                                        <button className="btn bb" onClick={() => addTruck('large')} style={{ fontSize: 10, padding: '6px' }}>+ Grand</button>
                                    </div>
                                </Sec>
                                <Sec title="Flotte Active">
                                    {trucks.length === 0 ? <div style={{ color: '#374e64', fontSize: 11, padding: 12, textAlign: 'center' }}>Aucun véhicule</div> :
                                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                            {trucks.map((t, i) => (
                                                <div key={i} className="fi" style={{ justifyContent: 'space-between', paddingRight: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.status === 'active' ? '#00e5b8' : '#f43f5e' }}></div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 11 }}>{t.name || `Camion ${i + 1}`}</div>
                                                            <div style={{ color: '#7a92aa', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>{t.capacity || 500}L · {t.size?.toUpperCase() || 'STD'}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeTruck(t.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 4 }} className="ri">×</button>
                                                </div>
                                            ))}</div>}
                                </Sec>
                                <Sec title="Statistiques">
                                    <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7a92aa' }}>Capacité totale</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{trucks.reduce((s, t) => s + (t.capacity || 500), 0)} L</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7a92aa' }}>Camions actifs</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#00e5b8' }}>{trucks.length}</span></div>
                                    </div>
                                </Sec>
                            </div>
                        )}

                        {/* TAB: STATS */}
                        {activeTab === 'stats' && (
                            <div className="fade-in">
                                <Sec title="Répartition Types de Déchets">
                                    <div style={{ height: 150 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart><Pie data={statsChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} stroke="none" label>{statsChart.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={{ background: '#0d1b2a', border: '1px solid #1a2e42', borderRadius: 8, color: '#dde6f4', fontSize: 11 }} /></PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Sec>
                                {routes.length > 0 && (
                                    <Sec title="Distances par Route">
                                        <div style={{ height: 150 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={routes.map((r, i) => ({ name: `R${i + 1}`, km: r.distance_km }))}><XAxis dataKey="name" stroke="#7a92aa" fontSize={9} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#0d1b2a', border: '1px solid #1a2e42', borderRadius: 8, fontSize: 10 }} /><Bar dataKey="km" fill="#00e5b8" radius={[4, 4, 0, 0]} /></BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Sec>
                                )}
                                <Sec title="Complexité Temporelle">
                                    <table className="bt"><thead><tr><th>Algo</th><th>Complexité</th></tr></thead><tbody>
                                        <tr><td>Glouton</td><td style={{ color: '#7a92aa' }}>O(n²)</td></tr>
                                        <tr><td>2-opt</td><td style={{ color: '#7a92aa' }}>O(n²·k)</td></tr>
                                        <tr><td>Tabou</td><td style={{ color: '#7a92aa' }}>O(n²·I)</td></tr>
                                        <tr><td>K-Means</td><td style={{ color: '#7a92aa' }}>O(k·n·i)</td></tr>
                                        <tr><td>NSGA-II</td><td style={{ color: '#7a92aa' }}>O(n²·G)</td></tr>
                                    </tbody></table>
                                </Sec>
                            </div>
                        )}

                        {/* TAB: BENCH */}
                        {activeTab === 'bench' && (
                            <div className="fade-in">
                                <Sec title="Stress Test Algorithmes">
                                    <button className="btn ba" disabled={benchRunning} onClick={async () => {
                                        setBenchRunning(true); addLog('⚡ Benchmark en cours...', 'info');
                                        try {
                                            const res = await fetch('/api/vrp/benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content }, body: JSON.stringify({ capacity, num_trucks: numTrucks, points_count: Math.min(pts.length, 100) }) });
                                            const data = await res.json();
                                            setBenchResult(data);
                                            addLog(`✓ Benchmark: ${data.points_tested} pts testés sur 5 algos`, 'ok');
                                            addToast(`Benchmark terminé: ${data.points_tested} points`, 'ok');
                                        } catch (e) { addLog(`✗ Bench: ${e.message}`, 'err'); }
                                        setBenchRunning(false);
                                    }}>{benchRunning ? <><span className="spin"></span> Benchmark...</> : '⚡ Benchmark Complet (5 algos)'}</button>
                                </Sec>
                                <Sec title="Comparaison Performance">
                                    {benchResult ? (
                                        <div>
                                            {benchResult.benchmark.map((b, i) => {
                                                const maxDist = Math.max(...benchResult.benchmark.map(x => x.distance));
                                                return (
                                                    <div key={i} className="abar">
                                                        <div className="abar-h"><b>{b.algorithm.toUpperCase()}</b><span>{b.time_ms}ms · {b.distance}km</span></div>
                                                        <div className="abar-t"><div className="abar-f" style={{ width: `${(b.distance / maxDist) * 100}%`, background: RC[i % RC.length] }}></div></div>
                                                    </div>
                                                );
                                            })}
                                            <div style={{ fontSize: 9, color: '#374e64', marginTop: 8, textAlign: 'center' }}>{benchResult.points_tested} points testés</div>
                                        </div>
                                    ) : <div style={{ color: '#374e64', fontSize: 11, padding: 10, textAlign: 'center' }}>Lance le benchmark</div>}
                                </Sec>
                                <Sec title="Complexité Temporelle">
                                    <table className="bt"><thead><tr><th>Algo</th><th>Big-O</th><th>Mesuré</th><th>km</th></tr></thead><tbody>
                                        {[['Glouton', 'O(n²)', 'greedy'], ['2-opt', 'O(n²·k)', '2opt'], ['Tabou', 'O(n²·I)', 'tabu'], ['K-Means', 'O(k·n·i)', 'kmeans'], ['NSGA-II', 'O(n²·G)', 'nsga']].map(([name, cx, key]) => {
                                            const r = benchResult?.benchmark?.find(b => b.algorithm === key);
                                            return <tr key={key}><td>{name}</td><td style={{ color: '#7a92aa' }}>{cx}</td><td style={{ color: '#00e5b8' }}>{r ? r.time_ms + 'ms' : '—'}</td><td>{r ? r.distance + 'km' : '—'}</td></tr>;
                                        })}
                                    </tbody></table>
                                </Sec>
                            </div>
                        )}

                        {/* TERMINAL */}
                        <div style={{ marginTop: "auto", borderTop: "1px solid #1a2e42", background: "#07111e" }}>
                            <div style={{ padding: "6px 13px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#374e64" }}>Core IA Terminal</div>
                            <div className="log" style={{ height: 130 }}>{logs.map(l => <div key={l.id} className={`ll ${l.type}`}>[{l.time}] {l.msg}</div>)}</div>
                        </div>
                    </div>

                    {/* MAP */}
                    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                        <div ref={mapContainerRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}></div>
                        {/* LEGEND OVERLAY (exactly like original) */}
                        <div className="mapi">
                            <div className="mc">
                                <div className="mc-h">Légende</div>
                                {Object.entries({ 'Médical': '#f43f5e', 'Organique': '#22c55e', 'Recyclable': '#38bdf8', 'Papier': '#fbbf24', 'Général': '#a78bfa' }).map(([name, color]) => (
                                    <div key={name} className="lr"><div className="ld" style={{ background: color }}></div>{name}</div>
                                ))}
                                <hr style={{ borderColor: '#1a2e42', margin: '5px 0' }} />
                                <div className="lr"><div style={{ width: 14, height: 3, background: '#00e5b8', flexShrink: 0, borderRadius: 2 }}></div>Route base</div>
                            </div>
                            {vrpResult && (
                                <div className="mc">
                                    <div className="mc-h">Résultat VRP</div>
                                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#00e5b8' }}>{vrpResult.total_km} km</div>
                                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7a92aa' }}>{vrpResult.computation_ms}ms · {vrpResult.algorithm}</div>
                                </div>
                            )}
                        </div>
                        {/* TOASTS */}
                        <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
                            {toasts.map(t => (
                                <div key={t.id} className="toast-slide" style={{ background: t.type === 'err' ? "rgba(244,63,94,.95)" : "rgba(0,229,184,.95)", color: t.type === 'err' ? "#fff" : "#07111e", padding: "12px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 15px rgba(0,0,0,.3)", display: "flex", alignItems: "center", gap: 10, maxWidth: 350 }}>
                                    <span style={{ fontSize: 16 }}>{t.type === 'err' ? '🚨' : '✅'}</span><span>{t.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* GLOBAL CSS */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    *{box-sizing:border-box}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#21384f;border-radius:3px}
                    .fade-in{animation:fadeIn .15s ease}@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
                    .sec{padding:11px 13px;border-bottom:1px solid #1a2e42}
                    .sh{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#374e64;margin-bottom:9px}
                    .kpi{background:#07111e;border:1px solid #1a2e42;border-radius:7px;padding:8px 10px}
                    .kv{font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:500;color:#00e5b8;line-height:1}
                    .kl{font-size:9px;color:#374e64;margin-top:3px;text-transform:uppercase;letter-spacing:.4px}
                    .btn{width:100%;padding:8px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:'Space Grotesk',sans-serif;transition:.15s;margin-bottom:5px;display:flex;align-items:center;justify-content:center;gap:6px}
                    .btn:disabled{opacity:.35;cursor:not-allowed}
                    .ba{background:#00e5b8;color:#06101c}.ba:hover{filter:brightness(1.1)}
                    .bb{background:transparent;color:#dde6f4;border:1px solid #1a2e42}.bb:hover{border-color:#00e5b8;color:#00e5b8}
                    .vp-input{width:100%;background:#0a1424;border:1px solid #1a2e42;color:#dde6f4;padding:8px 10px;border-radius:8px;font-size:11px;font-family:'Space Grotesk',sans-serif;outline:none;margin-bottom:10px;transition:.2s}
                    .vp-input:focus{border-color:#00e5b8;box-shadow:0 0 10px rgba(0,229,184,.15)}
                    .vp-slider{-webkit-appearance:none;width:100%;height:4px;border-radius:99px;background:#1a2e42;outline:none}
                    .vp-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#00e5b8;cursor:pointer;box-shadow:0 0 8px rgba(0,229,184,.5)}
                    .rr{margin-bottom:12px}.rr-lbl{display:flex;justify-content:space-between;font-size:11px;color:#7a92aa;margin-bottom:5px}.rr-lbl b{color:#00e5b8;font-family:'JetBrains Mono',monospace;background:rgba(0,229,184,.1);padding:2px 6px;border-radius:4px}
                    .chip{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:.15s;font-family:'JetBrains Mono',monospace}.chip.off{opacity:.2}
                    .ly-row{font-size:11px;color:#7a92aa;display:flex;align-items:center;gap:7px;cursor:pointer;margin-bottom:8px}
                    .ly-row input[type="checkbox"]{accent-color:#00e5b8;width:14px;height:14px}
                    .ri{display:flex;align-items:center;gap:7px;padding:6px 8px;background:#07111e;border:1px solid #1a2e42;border-radius:6px;margin-bottom:4px;cursor:pointer;transition:.15s}
                    .ri:hover,.ri.hl{border-color:#00e5b8;background:rgba(0,229,184,.04)}
                    .ri-ico{width:24px;height:24px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
                    .ri-info{flex:1;min-width:0}.ri-name{font-weight:600;font-size:11px}.ri-sub{color:#7a92aa;font-family:'JetBrains Mono',monospace;font-size:10px}
                    .play-btn{width:24px;height:24px;border-radius:5px;background:rgba(56,189,248,.1);color:#38bdf8;border:1px solid rgba(56,189,248,.25);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;transition:.15s}.play-btn:hover{background:#38bdf8;color:#fff}
                    .fi{display:flex;align-items:center;gap:7px;padding:7px 8px;background:#07111e;border:1px solid #1a2e42;border-radius:6px;margin-bottom:4px}
                    .log{background:#0a1424;border:1px solid #1a2e42;border-radius:8px;padding:10px;font-family:'JetBrains Mono',monospace;font-size:10px;height:150px;overflow-y:auto;line-height:1.9}
                    .ll{color:#7a92aa}.ll.ok{color:#00e5b8}.ll.info{color:#fbbf24}.ll.err{color:#f43f5e}
                    .abar{margin-bottom:10px}.abar-h{display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px}.abar-h b{color:#dde6f4}.abar-h span{color:#00e5b8;font-family:'JetBrains Mono',monospace}
                    .abar-t{height:6px;background:#1a2e42;border-radius:99px;overflow:hidden}.abar-f{height:100%;border-radius:99px;transition:width 1s ease}
                    .bt{width:100%;border-collapse:collapse;font-size:10px;font-family:'JetBrains Mono',monospace}.bt th{background:#07111e;color:#7a92aa;text-align:left;padding:5px 6px;border-bottom:1px solid #1a2e42;font-weight:500}.bt td{padding:4px 6px;border-bottom:1px solid rgba(26,46,66,.5)}
                    .mapi{position:absolute;top:16px;right:16px;z-index:500;display:flex;flex-direction:column;gap:10px;pointer-events:none}.mapi>*{pointer-events:all}
                    .mc{background:#050b14;border:1px solid #1a2e42;border-radius:12px;padding:12px 16px;box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:160px;backdrop-filter:blur(8px)}
                    .mc-h{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a92aa;margin-bottom:8px}
                    .lr{display:flex;align-items:center;gap:8px;font-size:11px;color:#dde6f4;margin-bottom:6px}.ld{width:10px;height:10px;border-radius:50%;flex-shrink:0}
                    .toast-slide{animation:slideIn .4s cubic-bezier(.175,.885,.32,1.275)}@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
                    .pulse{width:6px;height:6px;border-radius:50%;background:#00e5b8;animation:pu 2s infinite;display:inline-block}@keyframes pu{0%,100%{opacity:1}50%{opacity:.2}}
                    .spin{display:inline-block;width:11px;height:11px;border:2px solid rgba(0,229,184,.2);border-top-color:#00e5b8;border-radius:50%;animation:sp .5s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
                    @keyframes pulse-marker{0%{transform:scale(1);opacity:1}100%{transform:scale(1.4);opacity:.5}}
                    @keyframes truck-bounce{0%{transform:translateY(0) scale(1)}100%{transform:translateY(-4px) scale(1.06)}}
                    .ba:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:0 4px 14px #00e5b840}
                    .kpi:hover{border-color:#00e5b844;background:#0d1b2a}
                    .play-btn:hover{transform:scale(1.1)}
                    .mapboxgl-popup-content{background:transparent!important;padding:0!important;box-shadow:none!important}
                    .mapboxgl-popup-tip{display:none!important}
                ` }} />
            </div>
        </>
    );
}

function Sec({ title, children }) {
    return <div className="sec"><div className="sh">{title}</div>{children}</div>;
}
