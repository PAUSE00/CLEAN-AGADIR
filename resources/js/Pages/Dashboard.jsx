import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../../css/dashboard.css';

// Sub-components
import MapContainer from '../Components/Map/MapContainer';
import RouteList from '../Components/Sidebar/RouteList';
import VrpControls from '../Components/Sidebar/VrpControls';
import StatsPanel from '../Components/Sidebar/StatsPanel';
import { Sec, AnimatedCounter, LoadingSkeleton, EmptyState } from '../Components/UI/Shared';
import AutoDemo from '../Components/UI/AutoDemo';

// Constants
const WC = { medical: '#f43f5e', organic: '#22c55e', recyclable: '#38bdf8', paper: '#fbbf24', general: '#a78bfa' };
const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];

// ─── Error Boundary ─────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error('Dashboard Error:', error, info); }
    render() {
        if (this.state.hasError) return (
            <div style={{ background: '#06101c', color: '#f43f5e', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Erreur d'affichage</div>
                <div style={{ fontSize: 12, color: '#7a92aa', maxWidth: 600, textAlign: 'center', marginBottom: 24 }}>{this.state.error?.message}</div>
                <button onClick={() => this.setState({ hasError: false, error: null })} style={{ background: '#00e5b8', color: '#06101c', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>↻ Recharger</button>
            </div>
        );
        return this.props.children;
    }
}

export default function Dashboard(props) {
    return <ErrorBoundary><DashboardInner {...props} /></ErrorBoundary>;
}

// ─── Main Component ─────────────────────────────────────────────────
function DashboardInner({ auth }) {
    const isAdmin = auth.user?.is_admin;

    // Map state
    const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const markersRef = useRef({});
    const truckMarkerRef = useRef(null);
    const routesLayerIds = useRef([]);
    const depotRef = useRef(null);

    // Data
    const [pts, setPts] = useState([]);
    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const initialLoadDoneRef = useRef(false);

    // Routes & VRP
    const [routes, setRoutes] = useState([]);
    const [vrpRunning, setVrpRunning] = useState(false);
    const [vrpResult, setVrpResult] = useState(null);
    const [numTrucks, setNumTrucks] = useState(0);
    const [capacity, setCapacity] = useState(500);
    const [algorithm, setAlgorithm] = useState('nsga');
    const [iterations, setIterations] = useState(80);
    const [wasteFilter, setWasteFilter] = useState('all');

    // Sidebar & UI
    const [activeTab, setActiveTab] = useState('carte');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showDemo, setShowDemo] = useState(false);

    // Layers
    const [lyPts, setLyPts] = useState(true);
    const [lyRt, setLyRt] = useState(true);
    const [lyDep, setLyDep] = useState(true);
    const [lyHeat, setLyHeat] = useState(false);
    const [lyZones, setLyZones] = useState(false);
    const [ly3D, setLy3D] = useState(true);
    const [wasteFilters, setWasteFilters] = useState({ medical: true, organic: true, recyclable: true, paper: true, general: true });
    const [highlightRoute, setHighlightRoute] = useState(null);

    // Animation
    const [playbackRouteIndex, setPlaybackRouteIndex] = useState(null);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [collectedPoints, setCollectedPoints] = useState(new Set());
    const animationRef = useRef(null);
    const truckAnimRef = useRef(null);
    const truckPositionRef = useRef(null); // live GPS of animating truck

    // Dynamic Replanning
    const [replanningActive, setReplanningActive] = useState(false);

    // Logs & Toasts
    const [logs, setLogs] = useState([{ id: 0, msg: 'Système prêt.', type: 'ok', time: new Date().toLocaleTimeString() }]);
    const [toasts, setToasts] = useState([]);

    // IoT
    const [iotSimRunning, setIotSimRunning] = useState(false);
    const [iotAlerts, setIotAlerts] = useState([]);
    const [emergencyReplanningNeeded, setEmergencyReplanningNeeded] = useState(false);
    const iotTimerRef = useRef(null);

    // Fleet
    const [fleetTrucks, setFleetTrucks] = useState([]);

    // Benchmark
    const [benchRunning, setBenchRunning] = useState(false);
    const [benchResult, setBenchResult] = useState(null);

    // ── Helpers ──────────────────────────────────────────────────────
    const addLog = (msg, type = 'info') => {
        setLogs(prev => [{ id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    };
    const addToast = (msg, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    // ── Map Init ────────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/mapbox/token')
            .then(r => r.json())
            .then(data => {
                mapboxgl.accessToken = data.token || '';
                initMap();
                loadData();
            })
            .catch(() => { mapboxgl.accessToken = ''; initMap(); loadData(); });
        return () => { };
    }, []);

    const initMap = () => {
        if (!mapContainerRef.current || mapRef.current) return;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-9.5981, 30.4278],
            zoom: 13,
            pitch: 60,
            bearing: -20,
            antialias: true
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right');
        map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        mapRef.current = map;
        map.on('style.load', () => {
            setMapStyleLoaded(true);

            // Insert 3D buildings layer beneath symbol layers
            const layers = map.getStyle().layers;
            let labelLayerId;
            for (let i = 0; i < layers.length; i++) {
                if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                    labelLayerId = layers[i].id;
                    break;
                }
            }

            map.addLayer(
                {
                    'id': '3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 11,
                    'paint': {
                        'fill-extrusion-color': '#0d1b2a',
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.8
                    }
                },
                labelLayerId
            );
        });
    };

    // ── Data Loading ─────────────────────────────────────────────────
    const loadData = async () => {
        // Only show skeleton on very first load, not on IoT-triggered refreshes
        const isFirst = !initialLoadDoneRef.current;
        if (isFirst) setLoading(true);
        try {
            const [pRes, tRes] = await Promise.all([
                fetch('/api/points').then(r => r.json()),
                fetch('/api/trucks').then(r => r.json()),
            ]);
            // API returns plain array or { data: [...] } — handle both
            const pData = Array.isArray(pRes) ? pRes : (pRes.data || []);
            const tData = Array.isArray(tRes) ? tRes : (tRes.data || []);
            setPts(pData);
            setTrucks(Array.isArray(tData) ? tData : []);
            if (isFirst) addLog(`✓ ${pData.length} points + ${tData.length} camions chargés`, 'ok');
            initialLoadDoneRef.current = true;
        } catch (e) { addLog('Erreur chargement données', 'err'); }
        finally { if (isFirst) setLoading(false); }
    };

    // Sync depot ref
    useEffect(() => { depotRef.current = pts.find(p => p.is_depot) || null; }, [pts]);

    // Heatmap layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;
        const sourceId = 'heatmap-source', layerId = 'heatmap-layer';
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        if (!lyHeat || pts.length === 0) return;
        const features = pts.filter(p => !p.is_depot && !collectedPoints.has(p.id) && (wasteFilters[p.waste_category || 'general']))
            .map(p => ({ type: 'Feature', properties: { fill_level: p.fill_level || 0 }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }));
        map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.addLayer({ id: layerId, type: 'heatmap', source: sourceId, maxzoom: 16, paint: { 'heatmap-weight': ['interpolate', ['linear'], ['get', 'fill_level'], 0, 0, 100, 1], 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 3], 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, '#00e5b8', 0.4, '#fbbf24', 0.6, '#f97316', 0.8, '#ef4444', 1, '#991b1b'], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 20, 16, 60], 'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 16, 0] } });
    }, [pts, lyHeat, wasteFilters, collectedPoints]);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.code === 'Space' && routes.length > 0) { e.preventDefault(); playRoute(playbackRouteIndex !== null ? null : 0); }
            if (e.key >= '1' && e.key <= '9') { const i = parseInt(e.key) - 1; if (i < routes.length) setHighlightRoute(i); }
            if (e.key === 'Escape') { setSidebarCollapsed(false); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [routes, playbackRouteIndex]);

    // ── OSRM ────────────────────────────────────────────────────────
    const fetchOsrmGeometry = async (points, depot) => {
        try {
            const coords = [[depot.lng, depot.lat], ...points.map(p => [p.lng, p.lat]), [depot.lng, depot.lat]];
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords.map(c => c.join(',')).join(';')}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes?.[0]?.geometry) return data.routes[0].geometry;
        } catch { }
        return null;
    };

    // ── VRP ─────────────────────────────────────────────────────────
    const runVRP = async () => {
        if (!isAdmin) return;
        setVrpRunning(true);
        addLog(`▶ Optimisation ${algorithm.toUpperCase()} en cours...`, 'info');
        try {
            const res = await fetch('/api/vrp/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ num_trucks: numTrucks, capacity, algorithm, iterations, waste_filter: wasteFilter }),
            });
            const data = await res.json();
            if (data.error) { addLog(`✗ ${data.error}`, 'err'); return; }
            addLog(`🗺️ Calcul routes routières réelles (OSRM)...`, 'info');
            const depot = pts.find(p => p.is_depot);
            const enriched = await Promise.all(data.routes.map(async r => {
                const geo = depot ? await fetchOsrmGeometry(r.points, depot) : null;
                return { ...r, osrm_geometry: geo };
            }));
            setVrpResult({ ...data, routes: enriched });
            setRoutes(enriched);
            addLog(`✓ ${enriched.length} routes · ${data.total_km}km · ${data.computation_ms}ms`, 'ok');
            addToast(`✅ ${enriched.length} routes optimisées!`, 'ok');
            setActiveTab('carte');
        } catch (e) { addLog(`✗ Erreur VRP: ${e.message}`, 'err'); }
        finally { setVrpRunning(false); }
    };

    // ── Export ───────────────────────────────────────────────────────
    const exportPdf = async () => {
        if (!vrpResult || !routes.length) return;
        try {
            addLog('📄 Génération PDF...', 'info');
            const res = await fetch('/api/export/vrp-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content }, body: JSON.stringify({ routes: vrpResult.routes, stats: vrpResult.stats || [], algorithm: vrpResult.algorithm, total_km: vrpResult.total_km, time_ms: vrpResult.computation_ms }) });
            if (!res.ok) throw new Error('Erreur serveur');
            const blob = await res.blob();
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `rapport-vrp-${new Date().toISOString().slice(0, 10)}.pdf`);
            document.body.appendChild(link); link.click(); link.remove();
            addLog('✅ PDF exporté', 'ok'); addToast('PDF exporté', 'ok');
        } catch (e) { addLog(`✗ PDF: ${e.message}`, 'err'); }
    };

    const exportCSV = () => {
        let csv = 'Route,ID,Nom,Lat,Lng,Remplissage\n';
        routes.forEach((r, i) => r.points.forEach(p => csv += `${i + 1},${p.id},"${p.name}",${p.lat},${p.lng},${p.fill_level}\n`));
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        link.setAttribute('download', 'vrp-routes.csv'); document.body.appendChild(link); link.click(); link.remove();
    };

    // ── Fleet ────────────────────────────────────────────────────────
    const addTruck = async (size) => {
        try {
            const res = await fetch('/api/trucks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content }, body: JSON.stringify({ name: `Camion ${Math.floor(Math.random() * 1000)}`, size, waste_type: 'general' }) });
            if (res.ok) { addLog(`Camion ${size} ajouté`, 'ok'); loadData(); }
        } catch (e) { addLog('Erreur ajout camion', 'err'); }
    };
    const removeTruck = async (id) => {
        try {
            const res = await fetch(`/api/trucks/${id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content } });
            if (res.ok) { addLog(`Camion #${id} retiré`, 'info'); loadData(); }
        } catch (e) { }
    };

    // ── Animation ────────────────────────────────────────────────────
    // routesData: optional — pass fresh routes when state hasn't updated yet (e.g. after replan)
    const playRoute = (index, routesData) => {
        const routesList = routesData || routes;
        if (index === null || (playbackRouteIndex === index && !routesData)) {
            if (animationRef.current?.cancelled !== undefined) animationRef.current.cancelled = true;
            if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
            setPlaybackRouteIndex(null);
            return;
        }
        const route = routesList[index];
        if (!route?.points?.length) return;
        const depot = pts.find(p => p.is_depot);
        if (!depot) { addLog('✗ Dépôt non trouvé', 'err'); return; }

        setActiveTab('carte');
        setPlaybackRouteIndex(index);
        setPlaybackProgress(0);
        setCollectedPoints(new Set());
        setHighlightRoute(index);
        const isReplan = !!routesData;
        addLog(`${isReplan ? '🔄 Replanifié' : '🚛 Départ'} Route ${index + 1} — ${route.points.length} bennes`, 'info');

        const routeColor = RC[index % RC.length];
        const osrmCoords = route.osrm_geometry?.coordinates;

        // Start from truck's last position if replanning, otherwise from depot
        const startPos = (isReplan && truckPositionRef.current)
            ? truckPositionRef.current
            : [Number(depot.lng), Number(depot.lat)];

        if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
        const truckContainer = document.createElement('div');
        truckContainer.style.cssText = 'width:44px;height:44px;display:flex;align-items:center;justify-content:center;pointer-events:none;';
        const truckEl = document.createElement('div');
        truckEl.innerHTML = routesData ? '🚒' : '🚛'; // fire truck emoji for replanned routes
        truckEl.style.cssText = `font-size:30px;line-height:1;filter:drop-shadow(0 0 10px ${routeColor}) drop-shadow(0 0 20px ${routeColor});animation:truck-bounce .4s ease-in-out infinite alternate;`;
        truckContainer.appendChild(truckEl);

        const dLng = startPos[0], dLat = startPos[1];
        truckMarkerRef.current = new mapboxgl.Marker({ element: truckContainer, anchor: 'center' })
            .setLngLat([dLng, dLat]).addTo(mapRef.current);
        mapRef.current.flyTo({ center: [dLng, dLat], zoom: 14, duration: 800 });

        const cancelRef = { cancelled: false };
        animationRef.current = cancelRef;
        const collected = new Set();

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
                truckPositionRef.current = [lng, lat]; // track live position
                if (truckMarkerRef.current) truckMarkerRef.current.setLngLat([lng, lat]);
                if (mapRef.current) mapRef.current.easeTo({ center: [lng, lat], duration: 150 });
                if (t < 1) requestAnimationFrame(tick); else resolve();
            };
            requestAnimationFrame(tick);
        });

        const animatePath = async (coords, msPerDeg) => {
            if (!coords || coords.length < 2) return;
            for (let i = 0; i < coords.length - 1 && !cancelRef.cancelled; i++) {
                const dist = Math.hypot(coords[i + 1][0] - coords[i][0], coords[i + 1][1] - coords[i][1]);
                await animateSegment(coords[i], coords[i + 1], Math.max(dist * msPerDeg, 25));
            }
        };

        const closestIdx = (coords, pt) => {
            let best = 0, bestD = Infinity;
            coords.forEach(([lng, lat], i) => { const d = Math.hypot(lng - pt.lng, lat - pt.lat); if (d < bestD) { bestD = d; best = i; } });
            return best;
        };

        const waypoints = [depot, ...route.points, depot];
        const totalSegs = waypoints.length - 1;

        let segmentPaths;
        if (osrmCoords?.length >= 2) {
            const indices = waypoints.map(wp => closestIdx(osrmCoords, wp));
            segmentPaths = Array.from({ length: totalSegs }, (_, si) => {
                const s = Math.min(indices[si], osrmCoords.length - 2);
                const e = Math.min(indices[si + 1] + 1, osrmCoords.length);
                return (e > s + 1) ? osrmCoords.slice(s, e) : [[waypoints[si].lng, waypoints[si].lat], [waypoints[si + 1].lng, waypoints[si + 1].lat]];
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

        const totalLen = segmentPaths.reduce((sum, path) => {
            for (let i = 0; i < path.length - 1; i++) sum += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
            return sum;
        }, 0);
        const msPerDeg = totalLen > 0 ? 25000 / totalLen : 8000;

        (async () => {
            for (let seg = 0; seg < totalSegs && !cancelRef.cancelled; seg++) {
                await animatePath(segmentPaths[seg], msPerDeg);
                if (cancelRef.cancelled) break;
                const arrivalWp = waypoints[seg + 1];
                if (truckMarkerRef.current) truckMarkerRef.current.setLngLat([arrivalWp.lng, arrivalWp.lat]);
                setPlaybackProgress((seg + 1) / totalSegs);

                const binPoint = route.points[seg];
                if (binPoint) {
                    truckEl.innerHTML = '🚛💨';
                    addLog(`♻️ Collecte: ${binPoint.name} (${binPoint.fill_level}% → 0%)`, 'ok');
                    collected.add(binPoint.id);
                    setCollectedPoints(new Set(collected));
                    setPts(prev => prev.map(p => p.id === binPoint.id ? { ...p, fill_level: 0 } : p));
                    await new Promise(r => setTimeout(r, 550));
                    truckEl.innerHTML = '🚛';
                }
            }
            if (!cancelRef.cancelled) {
                addLog(`✅ Route ${index + 1} terminée — ${route.points.length} bennes collectées!`, 'ok');
                addToast(`Route ${index + 1} terminée ✅`, 'ok');
                fetch('/api/points/collect', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content }, body: JSON.stringify({ point_ids: Array.from(collected) }) }).catch(() => { });
                setTimeout(() => {
                    setPlaybackRouteIndex(null);
                    if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
                }, 1500);
            }
        })();
    };

    // ── Dynamic Replanning (Panne Simulation) ────────────────────────
    const triggerBreakdown = async () => {
        if (playbackRouteIndex === null || replanningActive) return;
        const currentRoute = routes[playbackRouteIndex];
        if (!currentRoute) return;

        // 1) Stop current animation
        if (animationRef.current) animationRef.current.cancelled = true;
        setPlaybackRouteIndex(null);

        // 2) Identify remaining (uncollected) stops
        const remaining = currentRoute.points.filter(p => !collectedPoints.has(p.id));
        if (remaining.length === 0) {
            addToast('Tous les arrêts déjà collectés!', 'info');
            return;
        }

        // 3) Use truck's current GPS as a temporary extra depot
        const truckPos = truckPositionRef.current;
        const truckPosPoint = truckPos
            ? { id: 'truck_pos', name: '🚛 Position Actuelle', lat: truckPos[1], lng: truckPos[0], is_depot: false, fill_level: 0, waste_category: 'general' }
            : null;

        addLog(`💥 PANNE SIMULÉE — ${remaining.length} arrêts à redistribuer`, 'err');
        addToast(`💥 Panne! Replanification de ${remaining.length} arrêts...`, 'err');
        setReplanningActive(true);
        setActiveTab('carte');

        try {
            // 4) Re-optimize with only remaining points
            const res = await fetch('/api/vrp/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({
                    num_trucks: Math.max(1, Math.ceil(remaining.length / Math.max(1, capacity))),
                    capacity,
                    algorithm,
                    iterations: 40, // faster replan
                    points_override: remaining,
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // 5) Fetch OSRM geometry for replanned routes
            const depot = pts.find(p => p.is_depot);
            const enriched = await Promise.all(data.routes.map(async r => {
                const geo = depot ? await fetchOsrmGeometry(r.points, depot) : null;
                return { ...r, osrm_geometry: geo, replanned: true };
            }));

            setRoutes(enriched);
            setVrpResult(prev => ({ ...prev, routes: enriched, replanned: true, total_km: data.total_km }));
            setCollectedPoints(new Set());

            addLog(`🔄 Replanification: ${enriched.length} nouvelles routes · ${data.total_km}km · ${data.computation_ms}ms`, 'ok');
            addToast(`✅ ${enriched.length} routes replanifiées — animation →`, 'ok');

            // Fly to truck position first, then start animation on first replanned route
            if (truckPos && mapRef.current) {
                mapRef.current.flyTo({ center: truckPos, zoom: 14, duration: 800 });
            }

            // ⭐ Immediately animate first replanned route using fresh enriched data
            // We pass enriched directly so we don't wait for setRoutes() to settle
            setTimeout(() => playRoute(0, enriched), 900);
        } catch (e) {
            addLog(`✗ Replanification échouée: ${e.message}`, 'err');
            addToast('Erreur de replanification', 'err');
        } finally {
            // Remove stuck truck marker
            if (truckMarkerRef.current) { truckMarkerRef.current.remove(); truckMarkerRef.current = null; }
            setReplanningActive(false);
        }
    };

    // ── Memos ────────────────────────────────────────────────────────
    const statsChart = useMemo(() => {
        const counts = { organic: 0, medical: 0, recyclable: 0, paper: 0, general: 0 };
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

    // ── Render ──────────────────────────────────────────────────────
    return (
        <>
            <Head>
                <title>CLEAN AGADIR — Système VRP · Agadir</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
            </Head>

            {/* AUTO DEMO — PFE guided tour */}
            {showDemo && (
                <AutoDemo
                    pts={pts}
                    routes={routes}
                    runVRP={runVRP}
                    playRoute={playRoute}
                    triggerBreakdown={triggerBreakdown}
                    playbackRouteIndex={playbackRouteIndex}
                    replanningActive={replanningActive}
                    onClose={() => setShowDemo(false)}
                    setActiveTab={setActiveTab}
                    addLog={addLog}
                    addToast={addToast}
                    vrpResult={vrpResult}
                />
            )}

            <div id="vp-app" className="vp-app">
                {/* ── TOP BAR ── */}
                <div className="vp-topbar">
                    <div className="vp-brand">
                        <div className="vp-brand-icon">♻️</div>
                        CLEAN AGADIR
                        <span className="vp-badge">v4 BETA</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginLeft: 20 }}>
                        <div className="vp-tabs">
                            {TABS.map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`vp-tab ${activeTab === t.id ? 'active' : ''}`}>
                                    <span className="tab-icon">{t.icon}</span> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="vp-topbar-right">
                        <span className="pulse" />
                        {!isAdmin && (
                            <a href="/driver" style={{ padding: '4px 10px', background: 'rgba(0,229,184,.1)', border: '1px solid rgba(0,229,184,.3)', color: '#00e5b8', borderRadius: 12, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                                🚛 Vue Chauffeur
                            </a>
                        )}
                        <a href="/analytics" style={{ padding: '4px 10px', background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.3)', color: '#38bdf8', borderRadius: 12, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                            📊 Analytics
                        </a>
                        <button onClick={() => setShowDemo(true)} style={{ padding: '4px 10px', background: 'rgba(0,229,184,.1)', border: '1px solid rgba(0,229,184,.3)', color: '#00e5b8', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            🎓 Démo
                        </button>
                        <span>Pts:<b style={{ color: '#00e5b8', marginLeft: 4 }}>{pts.length}</b></span>
                        <span>Km:<b style={{ color: '#00e5b8', marginLeft: 4 }}>{vrpResult?.total_km || '—'}</b></span>
                        <span>Routes:<b style={{ color: '#00e5b8', marginLeft: 4 }}>{routes.length}</b></span>
                        {auth.user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10, borderLeft: '1px solid #1a2e42' }}>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: isAdmin ? 'rgba(244,63,94,.1)' : 'rgba(34,197,94,.1)', color: isAdmin ? '#f43f5e' : '#22c55e', border: isAdmin ? '1px solid rgba(244,63,94,.2)' : '1px solid rgba(34,197,94,.2)' }}>
                                    {isAdmin ? 'ADMIN' : 'CHAUFFEUR'}
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 500, color: '#dde6f4' }}>{auth.user.name}</span>
                                <Link href={route('logout')} method="post" as="button" style={{ background: 'transparent', border: 'none', color: '#f43f5e', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>[Sortie]</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── BODY ── */}
                <div className="vp-body">
                    {/* SIDEBAR */}
                    <div className={`vp-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                        {loading ? <LoadingSkeleton rows={6} /> : (<>
                            {/* CARTE tab content */}
                            {activeTab === 'carte' && (
                                <div className="fade-in">
                                    <Sec title="Métriques Temps Réel">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                            <div className="kpi"><div className="kv" style={{ color: '#00e5b8' }}><AnimatedCounter value={pts.length} /></div><div className="kl">Points</div></div>
                                            <div className="kpi"><div className="kv" style={{ color: '#00e5b8' }}>{routes.length}</div><div className="kl">Routes</div></div>
                                            <div className="kpi"><div className="kv" style={{ color: '#38bdf8' }}>{vrpResult?.total_km || '—'}km</div><div className="kl">Distance</div></div>
                                            <div className="kpi"><div className="kv" style={{ color: '#10b981' }}>{avgFill}%</div><div className="kl">Remplissage Moy</div></div>
                                        </div>
                                        {criticalCount > 0 && (
                                            <div style={{ background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                🚨 <b>{criticalCount}</b> bennes critiques (&gt;85%)
                                            </div>
                                        )}
                                    </Sec>
                                    <Sec title="Filtres Déchets">
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                            {Object.entries({ medical: 'Medical', organic: 'Organic', recyclable: 'Recyclable', paper: 'Paper', general: 'General' }).map(([k, label]) => (
                                                <div key={k} onClick={() => toggleWaste(k)} className={`chip ${wasteFilters[k] ? 'on' : 'off'}`}
                                                    style={{ border: wasteFilters[k] ? `1px solid ${WC[k]}` : '1px solid #1a2e42', color: wasteFilters[k] ? WC[k] : '#7a92aa' }}>
                                                    {label}
                                                </div>
                                            ))}
                                        </div>
                                    </Sec>
                                    <Sec title="Couches & Options">
                                        <label className="ly-row"><input type="checkbox" checked={lyPts} onChange={e => setLyPts(e.target.checked)} /> Points collecte</label>
                                        <label className="ly-row"><input type="checkbox" checked={lyRt} onChange={e => setLyRt(e.target.checked)} /> Tracés routes</label>
                                        <label className="ly-row"><input type="checkbox" checked={lyHeat} onChange={e => setLyHeat(e.target.checked)} /> Heatmap densité</label>
                                        <label className="ly-row"><input type="checkbox" checked={lyZones} onChange={e => setLyZones(e.target.checked)} /> Zones (Contours)</label>
                                        <label className="ly-row"><input type="checkbox" checked={ly3D} onChange={e => setLy3D(e.target.checked)} /> Bâtiments 3D</label>
                                    </Sec>
                                    <RouteList
                                        routes={routes}
                                        highlightRoute={highlightRoute}
                                        setHighlightRoute={setHighlightRoute}
                                        playbackRouteIndex={playbackRouteIndex}
                                        playRoute={playRoute}
                                        vrpResult={vrpResult}
                                        playbackProgress={playbackProgress}
                                        collectedPoints={collectedPoints}
                                        triggerBreakdown={isAdmin ? triggerBreakdown : null}
                                        replanningActive={replanningActive}
                                    />
                                </div>
                            )}

                            {/* VRP tab */}
                            {activeTab === 'vrp' && (
                                <VrpControls
                                    isAdmin={isAdmin}
                                    algorithm={algorithm} setAlgorithm={setAlgorithm}
                                    iterations={iterations} setIterations={setIterations}
                                    numTrucks={numTrucks} setNumTrucks={setNumTrucks}
                                    capacity={capacity} setCapacity={setCapacity}
                                    wasteFilter={wasteFilter} setWasteFilter={setWasteFilter}
                                    vrpRunning={vrpRunning} runVRP={runVRP}
                                    routes={routes} setRoutes={setRoutes} setVrpResult={setVrpResult}
                                    vrpResult={vrpResult} logs={logs}
                                    exportPdf={exportPdf} exportCSV={exportCSV}
                                />
                            )}

                            {/* IoT / Fleet / Stats / Bench handled by StatsPanel */}
                            {['iot', 'fleet', 'stats', 'bench'].includes(activeTab) && (
                                <StatsPanel
                                    activeTab={activeTab}
                                    pts={pts} routes={routes}
                                    statsChart={statsChart} avgFill={avgFill} criticalCount={criticalCount}
                                    iotSimRunning={iotSimRunning} setIotSimRunning={setIotSimRunning}
                                    iotTimerRef={iotTimerRef} iotAlerts={iotAlerts} setIotAlerts={setIotAlerts}
                                    emergencyReplanningNeeded={emergencyReplanningNeeded}
                                    setEmergencyReplanningNeeded={setEmergencyReplanningNeeded}
                                    trucks={trucks} addTruck={addTruck} removeTruck={removeTruck}
                                    capacity={capacity} numTrucks={numTrucks}
                                    benchRunning={benchRunning} benchResult={benchResult}
                                    setBenchResult={setBenchResult} setBenchRunning={setBenchRunning}
                                    addLog={addLog} addToast={addToast}
                                    runVRP={runVRP} setActiveTab={setActiveTab} loadData={loadData}
                                />
                            )}

                            {/* Terminal always visible at bottom */}
                            <div style={{ marginTop: 'auto', borderTop: '1px solid #1a2e42', background: '#07111e' }}>
                                <div style={{ padding: '6px 13px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#374e64' }}>Core IA Terminal</div>
                                <div className="log" style={{ height: 130 }}>{logs.map(l => <div key={l.id} className={`ll ${l.type}`}>[{l.time}] {l.msg}</div>)}</div>
                            </div>
                        </>)}
                    </div>

                    {/* MAP */}
                    <MapContainer
                        mapContainerRef={mapContainerRef}
                        mapRef={mapRef}
                        markersRef={markersRef}
                        routesLayerIds={routesLayerIds}
                        pts={pts}
                        wasteFilters={wasteFilters}
                        collectedPoints={collectedPoints}
                        lyPts={lyPts} lyDep={lyDep} lyRt={lyRt} lyHeat={lyHeat} lyZones={lyZones} ly3D={ly3D}
                        routes={routes}
                        highlightRoute={highlightRoute}
                        playbackRouteIndex={playbackRouteIndex}
                        mapStyleLoaded={mapStyleLoaded}
                        setMapStyleLoaded={setMapStyleLoaded}
                        toasts={toasts}
                        vrpResult={vrpResult}
                        truckMarkerRef={truckMarkerRef}
                        playbackProgress={playbackProgress}
                        sidebarCollapsed={sidebarCollapsed}
                        setSidebarCollapsed={setSidebarCollapsed}
                    />
                </div>
            </div >
        </>
    );
}
