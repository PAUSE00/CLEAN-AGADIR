import React from 'react';
import { EmptyState } from '../UI/Shared';

const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];

export default function RouteList({
    routes, highlightRoute, setHighlightRoute,
    playbackRouteIndex, playRoute,
    vrpResult, playbackProgress, collectedPoints,
    triggerBreakdown, replanningActive,
}) {
    if (!routes.length) return (
        <EmptyState icon="🗺️" msg="Aucune route calculée — Lance l'optimisation VRP" />
    );

    const animatingRoute = playbackRouteIndex !== null ? routes[playbackRouteIndex] : null;
    const remainingCount = animatingRoute
        ? animatingRoute.points.filter(p => !collectedPoints.has(p.id)).length
        : 0;

    return (
        <div style={{ padding: '0 0 8px 0' }}>
            {/* Global live progress bar when animating */}
            {playbackRouteIndex !== null && (
                <div style={{ padding: '8px 13px 10px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 5 }}>
                        <span>🚛 Route {playbackRouteIndex + 1} en cours</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#00e5b8' }}>
                            {Math.round(playbackProgress * 100)}%
                        </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${playbackProgress * 100}%`,
                            background: 'linear-gradient(90deg, #00e5b8, #38bdf8)',
                            borderRadius: 99, transition: 'width .3s ease'
                        }} />
                    </div>

                    {/* 💥 Dynamic Replanning Button */}
                    {triggerBreakdown && !replanningActive && remainingCount > 0 && (
                        <button
                            onClick={triggerBreakdown}
                            title="Simule une panne: arrête le camion et replanifie les arrêts restants"
                            style={{
                                marginTop: 8, width: '100%',
                                padding: '7px 0', borderRadius: 8,
                                background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)',
                                color: '#f43f5e', fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: '.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(244,63,94,.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(244,63,94,.1)'}
                        >
                            💥 Simuler Panne ({remainingCount} arrêts restants)
                        </button>
                    )}
                    {replanningActive && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#fbbf24', justifyContent: 'center' }}>
                            <span className="spin" style={{ width: 14, height: 14, borderColor: '#fbbf2430', borderTopColor: '#fbbf24', borderWidth: 2 }} />
                            Replanification en cours...
                        </div>
                    )}
                </div>
            )}

            {/* Section title */}
            <div style={{ padding: '0 13px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)' }}>
                Routes Actives — {routes.length} route{routes.length > 1 ? 's' : ''}
                {vrpResult && (
                    <span style={{ float: 'right', color: '#00e5b8', fontFamily: "'JetBrains Mono',monospace" }}>
                        {vrpResult.total_km}km · {vrpResult.computation_ms}ms
                    </span>
                )}
            </div>

            {routes.map((r, i) => {
                const color = RC[i % RC.length];
                const isActive = playbackRouteIndex === i;
                const isHighlighted = highlightRoute === i;
                const collected = r.points.filter(p => collectedPoints.has(p.id)).length;
                const pct = r.points.length ? Math.round((collected / r.points.length) * 100) : 0;

                return (
                    <div key={i}
                        onClick={() => setHighlightRoute(isHighlighted ? null : i)}
                        style={{
                            margin: '4px 8px', padding: '10px 12px', borderRadius: 10,
                            border: `1px solid ${isActive ? color : isHighlighted ? `${color}66` : 'var(--border)'}`,
                            background: isActive ? `${color}10` : isHighlighted ? `${color}08` : 'var(--bg-card)',
                            cursor: 'pointer', transition: '.2s',
                            boxShadow: isActive ? `0 0 12px ${color}33` : 'none',
                        }}
                    >
                        {/* Route header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: isActive ? `0 0 8px ${color}` : 'none', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                                    Route {i + 1}
                                    {isActive && <span style={{ marginLeft: 6, fontSize: 9, background: `${color}20`, color, padding: '1px 6px', borderRadius: 10, fontFamily: "'JetBrains Mono',monospace" }}>● EN COURS</span>}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono',monospace" }}>
                                    {r.points.length} arrêts · {r.distance_km}km · {r.waste_type || 'général'}
                                </div>
                            </div>
                        </div>

                        {/* Per-route progress bar */}
                        {collected > 0 && (
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-secondary)', marginBottom: 3 }}>
                                    <span>Collectés: {collected}/{r.points.length}</span>
                                    <span style={{ color: '#00e5b8', fontFamily: "'JetBrains Mono',monospace" }}>{pct}%</span>
                                </div>
                                <div style={{ height: 3, background: 'var(--border)', borderRadius: 99 }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .4s ease' }} />
                                </div>
                            </div>
                        )}

                        {/* Animate button */}
                        <button
                            onClick={e => { e.stopPropagation(); playRoute(i); }}
                            disabled={playbackRouteIndex !== null && !isActive}
                            style={{
                                width: '100%', padding: '5px 0', borderRadius: 7,
                                background: isActive ? 'rgba(244,63,94,.15)' : `${color}18`,
                                border: `1px solid ${isActive ? 'rgba(244,63,94,.3)' : `${color}44`}`,
                                color: isActive ? '#f43f5e' : color,
                                fontSize: 11, fontWeight: 700, cursor: playbackRouteIndex !== null && !isActive ? 'not-allowed' : 'pointer',
                                opacity: playbackRouteIndex !== null && !isActive ? 0.4 : 1,
                                transition: '.2s',
                            }}
                        >
                            {isActive ? '■ Stopper' : '▶ Animer'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
