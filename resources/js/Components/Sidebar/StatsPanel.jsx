import React from 'react';
import { Sec } from '../UI/Shared';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const RC = ['#00e5b8', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#22c55e', '#fbbf24', '#e879f9', '#4ade80', '#f97316'];
const WC = { medical: '#f43f5e', organic: '#22c55e', recyclable: '#38bdf8', paper: '#fbbf24', general: '#a78bfa' };

const ALGO_ROWS = [
    ['Glouton', 'O(n²)', 'greedy'],
    ['2-opt', 'O(n²·k)', '2opt'],
    ['Tabou', 'O(n²·I)', 'tabu'],
    ['K-Means', 'O(k·n·i)', 'kmeans'],
    ['NSGA-II', 'O(n²·G)', 'nsga'],
];

function BenchTab({ capacity, numTrucks, pts, benchRunning, benchResult, setBenchResult, setBenchRunning, addLog, addToast }) {
    const runBenchmark = async () => {
        setBenchRunning(true);
        addLog('⚡ Benchmark en cours...', 'info');
        try {
            const res = await fetch('/api/vrp/benchmark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                },
                body: JSON.stringify({ capacity, num_trucks: numTrucks, points_count: Math.min(pts.length, 100) })
            });
            const data = await res.json();
            setBenchResult(data);
            addLog(`✓ Benchmark: ${data.points_tested} pts testés sur 5 algos`, 'ok');
            addToast(`Benchmark terminé: ${data.points_tested} points`, 'ok');
        } catch (e) { addLog(`✗ Bench: ${e.message}`, 'err'); }
        setBenchRunning(false);
    };

    return (
        <div className="fade-in">
            <Sec title="Stress Test Algorithmes">
                <button className="btn ba" disabled={benchRunning} onClick={runBenchmark}>
                    {benchRunning ? <><span className="spin" /> Benchmark...</> : '⚡ Benchmark Complet (5 algos)'}
                </button>
            </Sec>
            <Sec title="Comparaison Performance">
                {benchResult ? (
                    <div>
                        {benchResult.benchmark.map((b, i) => {
                            const maxDist = Math.max(...benchResult.benchmark.map(x => x.distance));
                            return (
                                <div key={i} className="abar">
                                    <div className="abar-h"><b>{b.algorithm.toUpperCase()}</b><span>{b.time_ms}ms · {b.distance}km</span></div>
                                    <div className="abar-t"><div className="abar-f" style={{ width: `${(b.distance / maxDist) * 100}%`, background: RC[i % RC.length] }} /></div>
                                </div>
                            );
                        })}
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>{benchResult.points_tested} points testés</div>
                    </div>
                ) : <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 10, textAlign: 'center' }}>Lance le benchmark pour voir les résultats</div>}
            </Sec>
            <Sec title="Complexité Temporelle">
                <table className="bt">
                    <thead><tr><th>Algo</th><th>Big-O</th><th>Mesuré</th><th>km</th></tr></thead>
                    <tbody>
                        {ALGO_ROWS.map(([name, cx, key]) => {
                            const r = benchResult?.benchmark?.find(b => b.algorithm === key);
                            return (
                                <tr key={key}>
                                    <td>{name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{cx}</td>
                                    <td style={{ color: '#00e5b8' }}>{r ? r.time_ms + 'ms' : '—'}</td>
                                    <td>{r ? r.distance + 'km' : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Sec>
        </div>
    );
}

export default function StatsPanel({
    activeTab, pts, routes, statsChart, avgFill, criticalCount,
    iotSimRunning, setIotSimRunning, iotTimerRef, iotAlerts, setIotAlerts,
    emergencyReplanningNeeded, setEmergencyReplanningNeeded,
    trucks, addTruck, removeTruck,
    capacity, numTrucks,
    benchRunning, benchResult, setBenchResult, setBenchRunning,
    addLog, addToast, runVRP, setActiveTab,
    loadData
}) {
    const tooltipStyle = { background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 11 };

    if (activeTab === 'stats') return (
        <div className="fade-in">
            <Sec title="Répartition Types de Déchets">
                <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={statsChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} stroke="none" label>
                                {statsChart.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {statsChart.map(s => (
                        <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.fill }} />
                            {s.name} ({s.value})
                        </div>
                    ))}
                </div>
            </Sec>
            {routes.length > 0 && (
                <Sec title="Distances par Route">
                    <div style={{ height: 150 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={routes.map((r, i) => ({ name: `R${i + 1}`, km: r.distance_km }))}>
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="km" fill="#00e5b8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Sec>
            )}
            <Sec title="Complexité Temporelle">
                <table className="bt">
                    <thead><tr><th>Algo</th><th>Complexité</th></tr></thead>
                    <tbody>
                        {ALGO_ROWS.map(([name, cx]) => <tr key={name}><td>{name}</td><td style={{ color: 'var(--text-secondary)' }}>{cx}</td></tr>)}
                    </tbody>
                </table>
            </Sec>
        </div>
    );

    if (activeTab === 'iot') return (
        <div className="fade-in">
            <Sec title="Simulation Capteurs IoT">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
                    <div className="kpi"><div className="kv" style={{ color: '#f43f5e' }}>{criticalCount}</div><div className="kl">Alertes critiques</div></div>
                    <div className="kpi"><div className="kv" style={{ color: '#fbbf24' }}>{avgFill}%</div><div className="kl">Niveau moyen</div></div>
                    <div className="kpi"><div className="kv">{pts.filter(p => (p.fill_level || 0) >= 80).length}</div><div className="kl">Haute priorité</div></div>
                    <div className="kpi"><div className="kv" style={{ color: '#22c55e' }}>{pts.filter(p => (p.fill_level || 0) < 50).length}</div><div className="kl">Normal (&lt;50%)</div></div>
                </div>
                <button className={`btn ${iotSimRunning ? 'bb' : 'ba'}`}
                    style={iotSimRunning ? { borderColor: '#f43f5e', color: '#f43f5e' } : {}}
                    onClick={async () => {
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
                                const res = await fetch('/api/iot/simulate', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json',
                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                                    }
                                });
                                const data = await res.json();
                                if (data.alerts?.length) {
                                    setIotAlerts(prev => [...data.alerts, ...prev].slice(0, 20));
                                    data.alerts.forEach(a => {
                                        addLog(`🚨 ${a.name} → ${a.fill_level}% ${a.fire_alert ? '🔥 INCENDIE!' : ''}`, a.fire_alert ? 'err' : 'info');
                                        if (a.fill_level >= 90) { addToast(`Alerte: ${a.name} → ${a.fill_level}%`, 'err'); setEmergencyReplanningNeeded(true); }
                                    });
                                }
                                addLog(`✓ IoT: ${data.updated} capteurs, ${data.critical_count} critiques, moy ${data.avg_fill}%`, 'ok');
                                loadData();
                            } catch (e) { addLog(`✗ IoT: ${e.message}`, 'err'); }
                        };
                        runSim();
                        iotTimerRef.current = setInterval(runSim, 4000);
                    }}>
                    {iotSimRunning ? '■ Arrêter Simulation' : '▶ Démarrer Simulation IoT'}
                </button>
                <button className="btn bb" onClick={async () => {
                    try {
                        await fetch('/api/iot/reset', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                            }
                        });
                        addLog('↺ Niveaux réinitialisés', 'ok'); setIotAlerts([]); loadData();
                    } catch (e) { addLog(`✗ Reset: ${e.message}`, 'err'); }
                }}>↺ Réinitialiser Niveaux</button>
                {emergencyReplanningNeeded && (
                    <button className="btn ba" style={{ background: '#f43f5e', borderColor: '#f43f5e', color: 'white', marginTop: 10, fontSize: 13, padding: 10 }}
                        onClick={() => { setEmergencyReplanningNeeded(false); setActiveTab('vrp'); runVRP(); }}>
                        🚨 Replannification d'Urgence (VRP)
                    </button>
                )}
            </Sec>
            <Sec title="Top 10 — Niveaux Critiques">
                {[...pts].sort((a, b) => (b.fill_level || 0) - (a.fill_level || 0)).slice(0, 10).map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: (p.fill_level || 0) >= 85 ? '#f43f5e' : (p.fill_level || 0) >= 60 ? '#fbbf24' : 'var(--text-primary)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name?.substring(0, 30)}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#00e5b8', marginLeft: 8 }}>{p.fill_level || 0}%</span>
                    </div>
                ))}
            </Sec>
            <Sec title="Alertes Actives">
                {iotAlerts.length === 0
                    ? <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 10 }}>Aucune alerte — Lance la simulation</div>
                    : <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                        {iotAlerts.map((a, i) => (
                            <div key={i} className="ri" style={{ borderColor: a.fire_alert ? '#f43f5e' : '#fbbf24' }}>
                                <div style={{ fontSize: 14 }}>{a.fire_alert ? '🔥' : '⚠️'}</div>
                                <div className="ri-info">
                                    <div className="ri-name" style={{ color: a.fire_alert ? '#f43f5e' : '#fbbf24' }}>{a.name?.substring(0, 25)}</div>
                                    <div className="ri-sub">{a.category} · {a.fill_level}%</div>
                                </div>
                            </div>
                        ))}
                    </div>}
            </Sec>
        </div>
    );

    if (activeTab === 'fleet') return (
        <div className="fade-in">
            <Sec title="Gestion de la Flotte">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <button className="btn bb" onClick={() => addTruck('small')} style={{ fontSize: 10, padding: '6px' }}>+ Petit</button>
                    <button className="btn bb" onClick={() => addTruck('medium')} style={{ fontSize: 10, padding: '6px' }}>+ Moyen</button>
                    <button className="btn bb" onClick={() => addTruck('large')} style={{ fontSize: 10, padding: '6px' }}>+ Grand</button>
                </div>
            </Sec>
            <Sec title="Flotte Active">
                {trucks.length === 0
                    ? <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: 12, textAlign: 'center' }}>Aucun véhicule</div>
                    : <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {trucks.map((t, i) => (
                            <div key={i} className="fi" style={{ justifyContent: 'space-between', paddingRight: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.status === 'active' ? '#00e5b8' : '#f43f5e' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 11 }}>{t.name || `Camion ${i + 1}`}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>{t.capacity || 500}L · {t.size?.toUpperCase() || 'STD'}</div>
                                    </div>
                                </div>
                                <button onClick={() => removeTruck(t.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 4 }}>×</button>
                            </div>
                        ))}
                    </div>}
            </Sec>
            <Sec title="Statistiques">
                <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Capacité totale</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{trucks.reduce((s, t) => s + (t.capacity || 500), 0)} L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Camions actifs</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#00e5b8' }}>{trucks.length}</span>
                    </div>
                </div>
            </Sec>
        </div>
    );

    if (activeTab === 'bench') return (
        <BenchTab
            capacity={capacity} numTrucks={numTrucks} pts={pts}
            benchRunning={benchRunning} benchResult={benchResult}
            setBenchResult={setBenchResult} setBenchRunning={setBenchRunning}
            addLog={addLog} addToast={addToast}
        />
    );

    return null;
}
