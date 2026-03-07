import React from 'react';
import { Sec, EmptyState } from '../UI/Shared';

const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];

export default function VrpControls({
    isAdmin,
    algorithm, setAlgorithm,
    iterations, setIterations,
    numTrucks, setNumTrucks,
    capacity, setCapacity,
    wasteFilter, setWasteFilter,
    vrpRunning, runVRP,
    routes, setRoutes, setVrpResult,
    vrpResult, logs,
    exportPdf, exportCSV
}) {
    if (!isAdmin) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: '#7a92aa', fontSize: 13, background: 'rgba(244,63,94,.05)', borderRadius: 8, border: '1px solid rgba(244,63,94,.2)', margin: 12 }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>🔒</div>
                <div style={{ color: '#f43f5e', fontWeight: 600, marginBottom: 8 }}>Accès Restreint</div>
                Seul un Administrateur peut générer des plans VRP.
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Algorithm params */}
            <Sec title="Paramètres Algorithmiques">
                <select value={algorithm} onChange={e => setAlgorithm(e.target.value)} className="vp-input">
                    <option value="greedy">🟢 Glouton — O(n²)</option>
                    <option value="2opt">🔵 2-opt — O(n²·k)</option>
                    <option value="tabu">🟠 Tabou — O(n²·iter)</option>
                    <option value="kmeans">🟣 K-Means+NN — O(k·n·i)</option>
                    <option value="nsga">⭐ NSGA-II Multi-obj — O(n²·G)</option>
                </select>

                <div className="rr">
                    <div className="rr-lbl"><span>Itérations Tabou/NSGA</span><b>{iterations}</b></div>
                    <input type="range" min="10" max="300" value={iterations} onChange={e => setIterations(+e.target.value)} className="vp-slider" />
                </div>
                <div className="rr">
                    <div className="rr-lbl"><span>Camions</span><b>{numTrucks === 0 ? 'Auto' : numTrucks}</b></div>
                    <input type="range" min="0" max="20" value={numTrucks} onChange={e => setNumTrucks(+e.target.value)} className="vp-slider" />
                </div>
                <div className="rr">
                    <div className="rr-lbl"><span>Capacité (L/camion)</span><b>{capacity}</b></div>
                    <input type="range" min="100" max="2000" step="50" value={capacity} onChange={e => setCapacity(+e.target.value)} className="vp-slider" />
                </div>
                <div className="rr-lbl" style={{ marginBottom: 5 }}><span>Type Déchet</span></div>
                <select value={wasteFilter} onChange={e => setWasteFilter(e.target.value)} className="vp-input" style={{ marginBottom: 0 }}>
                    <option value="all">Tous types de déchets</option>
                    <option value="medical">💊 Médical uniquement</option>
                    <option value="organic">🥗 Organique uniquement</option>
                    <option value="recyclable">♻️ Recyclable uniquement</option>
                </select>
            </Sec>

            {/* Action buttons */}
            <Sec title="">
                <button className="btn ba" onClick={runVRP} disabled={vrpRunning}
                    style={{ padding: '10px', fontSize: 13, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {vrpRunning ? <><span className="spin" /> Calcul en cours...</> : '▶ Lancer Optimisation'}
                </button>
                {routes.length > 0 && (<>
                    <button className="btn bb" style={{ color: '#f43f5e', borderColor: '#f43f5e', padding: '8px 12px' }}
                        onClick={() => { setRoutes([]); setVrpResult(null); }}>
                        ✕ Effacer Routes
                    </button>
                    <button className="btn bb" style={{ padding: '8px 12px' }} onClick={exportPdf}>
                        📄 Exporter PDF
                    </button>
                    <button className="btn bb" style={{ padding: '8px 12px' }} onClick={exportCSV}>
                        📊 Exporter CSV
                    </button>
                </>)}
            </Sec>

            {/* VRP results summary */}
            {vrpResult && (
                <Sec title="Résultats Phase Base">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <div className="kpi">
                            <div className="kv" style={{ color: '#00e5b8' }}>{vrpResult.total_km}</div>
                            <div className="kl">km total</div>
                        </div>
                        <div className="kpi">
                            <div className="kv" style={{ color: '#a78bfa' }}>{vrpResult.computation_ms}ms</div>
                            <div className="kl">temps calcul</div>
                        </div>
                    </div>
                    {vrpResult.routes.map((r, i) => (
                        <div key={i} className="abar">
                            <div className="abar-h"><b>Route {i + 1}</b><span>{r.distance_km} km · {r.points.length} pts</span></div>
                            <div className="abar-t">
                                <div className="abar-f" style={{
                                    width: `${Math.min(100, (r.distance_km / ((vrpResult.total_km || 1) / vrpResult.routes.length)) * 50)}%`,
                                    background: RC[i % RC.length]
                                }} />
                            </div>
                        </div>
                    ))}
                </Sec>
            )}

            {/* Console */}
            <Sec title="Terminal Console">
                <div className="log">
                    {logs.map(l => <div key={l.id} className={`ll ${l.type}`}>[{l.time}] {l.msg}</div>)}
                </div>
            </Sec>
        </div>
    );
}
