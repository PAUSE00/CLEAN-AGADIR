import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import ToastContainer from '../UI/Toast';

const WC = { medical: '#f43f5e', organic: '#22c55e', recyclable: '#38bdf8', paper: '#fbbf24', general: '#a78bfa' };
const WC_ICON = { medical: '💊', organic: '🥬', recyclable: '♻️', paper: '📄', general: '🗑️' };
const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];

export default function MapContainer({
    mapContainerRef, mapRef, markersRef, routesLayerIds,
    pts, wasteFilters, collectedPoints, lyPts, lyDep, lyRt, lyHeat, lyZones, ly3D,
    routes, highlightRoute, playbackRouteIndex,
    mapStyleLoaded, setMapStyleLoaded,
    toasts, vrpResult,
    truckMarkerRef,
    playbackProgress,
    sidebarCollapsed, setSidebarCollapsed,
}) {
    // Marker rendering
    useEffect(() => {
        if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};
        if (!lyPts && !lyDep) return;

        pts.forEach(p => {
            const lat = Number(p.lat);
            const lng = Number(p.lng);
            if (!lat || !lng || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;
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
                    'background:#ffffff', 'color:#000000', 'font-size:11px',
                    'font-weight:800', 'padding:3px 6px', 'border-radius:4px',
                    'border:2px solid #000', 'box-shadow:0 4px 6px rgba(0,0,0,0.3)',
                    'display:flex;align-items:center;justify-content:center',
                    'cursor:pointer;user-select:none;z-index:50', 'transition:transform .15s'
                ].join(';');
                inner.textContent = `🏭 Dépôt`;
            } else {
                const size = 22;
                const collectedColor = '#00e5b8';
                inner.style.cssText = [
                    `width:${size}px;height:${size}px;border-radius:50%`,
                    `background:${isCollected ? '#001a14' : color + '40'}`,
                    `border:2px solid ${isCollected ? collectedColor : color}`,
                    `color:${isCollected ? collectedColor : '#ffffff'}`,
                    'font-size:10px', 'font-weight:700',
                    'display:flex;align-items:center;justify-content:center',
                    'cursor:pointer;user-select:none',
                    `box-shadow:0 0 ${isCollected ? 10 : (isCritical ? 14 : 6)}px ${isCollected ? collectedColor : color}`,
                    'transition:all .3s ease',
                    `z-index:${isCritical ? 40 : 30}`,
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
                ${p.open_time && p.close_time ? `<div style="font-size:10px;color:#a0aec0;border-top:1px dashed #1a2e42;padding-top:6px;margin-top:4px">🕒 ${p.open_time.slice(0, 5)} — ${p.close_time.slice(0, 5)}</div>` : ''}
            </div>`;

            const popup = new mapboxgl.Popup({ offset: 18, closeButton: false, className: 'vp-popup' }).setHTML(popupHTML);
            const marker = new mapboxgl.Marker(container).setLngLat([lng, lat]).setPopup(popup).addTo(mapRef.current);
            markersRef.current[p.id] = marker;
        });
    }, [pts, wasteFilters, collectedPoints, lyPts, lyDep, mapStyleLoaded]);

    // Route layers
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const renderRoutes = () => {
            if (!map.isStyleLoaded()) return;
            try {
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
                        // fallback straight lines
                        coords = r.points.map(p => [p.lng, p.lat]);
                    }
                    if (!coords || coords.length < 2) return;
                    const isActive = playbackRouteIndex === i;
                    const isOther = playbackRouteIndex !== null && !isActive;
                    const lineOpacity = isOther ? 0.2 : (highlightRoute === null || highlightRoute === i ? 1 : 0.3);
                    const lineWidth = isActive ? 6 : (highlightRoute === i ? 5 : 3);
                    try {
                        const geo = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
                        if (map.getSource(sourceId)) { map.getSource(sourceId).setData(geo); }
                        else { map.addSource(sourceId, { type: 'geojson', data: geo }); }
                        if (!map.getLayer(haloId)) {
                            map.addLayer({ id: haloId, type: 'line', source: sourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': lineWidth + 8, 'line-opacity': isOther ? 0.05 : 0.15 } });
                        } else {
                            map.setPaintProperty(haloId, 'line-opacity', isOther ? 0.05 : 0.15);
                            map.setPaintProperty(haloId, 'line-width', lineWidth + 8);
                        }
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
        if (map.isStyleLoaded()) renderRoutes();
        else map.once('styledata', renderRoutes);
    }, [routes, highlightRoute, playbackRouteIndex, lyRt]);

    // Zones rendering
    const zoneIdsRef = useRef([]);
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded() || !pts.length) return;

        const cleanupZones = () => {
            zoneIdsRef.current.forEach(id => {
                if (map.getLayer(`zone-fill-${id}`)) map.removeLayer(`zone-fill-${id}`);
                if (map.getLayer(`zone-line-${id}`)) map.removeLayer(`zone-line-${id}`);
                if (map.getLayer(`zone-label-${id}`)) map.removeLayer(`zone-label-${id}`);
                if (map.getSource(`zone-source-${id}`)) map.removeSource(`zone-source-${id}`);
            });
            zoneIdsRef.current = [];
        };

        if (!lyZones) {
            cleanupZones();
            return;
        }

        cleanupZones();

        // Group points by zone
        const zones = {};
        pts.forEach(p => {
            if (p.is_depot || !p.zone) return;
            if (!zones[p.zone]) zones[p.zone] = [];
            zones[p.zone].push([Number(p.lng), Number(p.lat)]);
        });

        Object.keys(zones).forEach((zoneName, index) => {
            if (zones[zoneName].length < 3) return; // need at least a triangle
            try {
                const color = RC[index % RC.length];
                const pointsCol = turf.featureCollection(zones[zoneName].map(c => turf.point(c)));
                const hull = turf.convex(pointsCol);

                if (hull) {
                    const id = zoneName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const sourceId = `zone-source-${id}`;
                    zoneIdsRef.current.push(id);

                    // Add label coordinate right in the center of the polygon
                    const center = turf.centerOfMass(hull);
                    const collection = turf.featureCollection([
                        hull,
                        turf.point(center.geometry.coordinates, { title: zoneName })
                    ]);

                    map.addSource(sourceId, { type: 'geojson', data: collection });

                    // Fill layer
                    map.addLayer({
                        id: `zone-fill-${id}`,
                        type: 'fill',
                        source: sourceId,
                        filter: ['==', '$type', 'Polygon'],
                        paint: {
                            'fill-color': color,
                            'fill-opacity': 0.1
                        }
                    }, 'waterway-label'); // place beneath labels if possible

                    // Outline layer
                    map.addLayer({
                        id: `zone-line-${id}`,
                        type: 'line',
                        source: sourceId,
                        filter: ['==', '$type', 'Polygon'],
                        paint: {
                            'line-color': color,
                            'line-width': 2,
                            'line-dasharray': [2, 2],
                            'line-opacity': 0.8
                        }
                    });

                    // Label layer
                    map.addLayer({
                        id: `zone-label-${id}`,
                        type: 'symbol',
                        source: sourceId,
                        filter: ['==', '$type', 'Point'],
                        layout: {
                            'text-field': ['get', 'title'],
                            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                            'text-size': 20,
                            'text-transform': 'uppercase',
                            'text-letter-spacing': 0.1,
                            'text-justify': 'center',
                            'text-anchor': 'center'
                        },
                        paint: {
                            'text-color': '#ffffff',
                            'text-halo-color': color,
                            'text-halo-width': 2,
                            'text-opacity': 0.9
                        }
                    });
                }
            } catch (e) { console.error('Error drawing zone', zoneName, e); }
        });

        return () => cleanupZones();
    }, [pts, lyZones]);

    // Handle 3D Layer toggle
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const toggle3D = () => {
            if (map.getLayer('3d-buildings')) {
                map.setPaintProperty(
                    '3d-buildings',
                    'fill-extrusion-opacity',
                    ly3D ? 0.8 : 0
                );
            }
        };

        if (map.isStyleLoaded()) toggle3D();
        else map.once('styledata', toggle3D);
    }, [ly3D, mapStyleLoaded]);

    return (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Sidebar collapse toggle */}
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(v => !v)}
                title={sidebarCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'}
            >
                {sidebarCollapsed ? '›' : '‹'}
            </button>

            {/* Map */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

            {/* Animation progress bar */}
            {playbackRouteIndex !== null && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'rgba(26,46,66,.5)', zIndex: 500 }}>
                    <div style={{
                        height: '100%',
                        width: `${(playbackProgress * 100).toFixed(1)}%`,
                        background: RC[playbackRouteIndex % RC.length],
                        borderRadius: '0 4px 4px 0',
                        transition: 'width .3s ease',
                        boxShadow: `0 0 10px ${RC[playbackRouteIndex % RC.length]}`
                    }} />
                </div>
            )}

            {/* Legend overlay */}
            <div className="mapi">
                <div className="mc">
                    <div className="mc-h">Légende</div>
                    {Object.entries({ 'Médical': '#f43f5e', 'Organique': '#22c55e', 'Recyclable': '#38bdf8', 'Papier': '#fbbf24', 'Général': '#a78bfa' }).map(([name, color]) => (
                        <div key={name} className="lr"><div className="ld" style={{ background: color }} />{name}</div>
                    ))}
                    <hr style={{ borderColor: '#1a2e42', margin: '5px 0' }} />
                    <div className="lr"><div style={{ width: 14, height: 3, background: '#00e5b8', flexShrink: 0, borderRadius: 2 }} />Route base</div>
                </div>
                {vrpResult && (
                    <div className="mc">
                        <div className="mc-h">Résultat VRP</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#00e5b8' }}>{vrpResult.total_km} km</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7a92aa' }}>{vrpResult.computation_ms}ms · {vrpResult.algorithm}</div>
                    </div>
                )}
            </div>

            {/* Toasts */}
            <ToastContainer toasts={toasts} />
        </div>
    );
}
