import React from 'react';
import { Sec, EmptyState } from '../UI/Shared';

const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];
const WC = { medical: '#f43f5e', organic: '#22c55e', recyclable: '#38bdf8', paper: '#fbbf24', general: '#a78bfa' };

export default function RouteList({
    routes, highlightRoute, setHighlightRoute,
    playbackRouteIndex, playRoute,
    vrpResult, playbackProgress, collectedPoints
}) {
    const animatingRoute = playbackRouteIndex !== null ? routes[playbackRouteIndex] : null;
    const collectedCount = animatingRoute ? animatingRoute.points.filter(p => collectedPoints.has(p.id)).length : 0;

    return (
        <Sec title="Routes Actives">
            {routes.length === 0 ? (
                <EmptyState icon="🗺️" text="Aucune route calculée — Lance l'optimisation VRP" />
            ) : (<>
                {/* Live progress bar during animation */}
                {playbackRouteIndex !== null && (
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7a92aa', marginBottom: 4 }}>
                            <span>🚛 Route {playbackRouteIndex + 1} en cours</span>
                            <span style={{ color: '#00e5b8', fontFamily: "'JetBrains Mono',monospace" }}>
                                {collectedCount}/{animatingRoute?.points?.length || 0} bennes
                            </span>
                        </div>
                        <div style={{ height: 6, background: '#1a2e42', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${(playbackProgress * 100).toFixed(1)}%`,
                                background: RC[playbackRouteIndex % RC.length],
                                borderRadius: 99,
                                transition: 'width .3s ease'
                            }} />
                        </div>
                    </div>
                )}

                <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                    {routes.map((r, i) => {
                        const isActive = playbackRouteIndex === i;
                        const color = RC[i % RC.length];
                        return (
                            <div
                                key={i}
                                className={`ri ${highlightRoute === i ? 'hl' : ''}`}
                                onClick={() => setHighlightRoute(i)}
                                style={{ flexDirection: 'column', gap: 6, marginBottom: 8, padding: 10, borderRadius: 8, background: '#0a1424', border: `1px solid ${isActive ? color : '#1a2e42'}`, transition: '.2s' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: isActive ? `0 0 8px ${color}` : 'none' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#dde6f4', fontSize: 11, fontWeight: 600 }}>Route {i + 1}</div>
                                        <div style={{ fontSize: 9, color: '#7a92aa', fontFamily: "'JetBrains Mono',monospace" }}>
                                            {r.points.length} pts · {r.distance_km}km · {(r.distance_km * 0.21).toFixed(2)}kg CO₂
                                        </div>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); playRoute(i); }}
                                        style={{
                                            background: isActive ? 'rgba(244,63,94,.1)' : color,
                                            color: isActive ? '#f43f5e' : '#06101c',
                                            border: isActive ? '1px solid #f43f5e' : 'none',
                                            padding: '5px 12px', borderRadius: 4,
                                            fontSize: 10, fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            transition: '.15s',
                                            boxShadow: isActive ? 'none' : `0 0 12px ${color}60`
                                        }}
                                    >
                                        {isActive ? '⏹ Stop' : '▶ Animer'}
                                    </button>
                                </div>

                                {/* Mini progress for this specific route during animation */}
                                {isActive && (
                                    <div style={{ height: 3, background: '#1a2e42', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(playbackProgress * 100).toFixed(1)}%`, background: color, borderRadius: 99, transition: 'width .3s ease' }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </>)}
        </Sec>
    );
}
