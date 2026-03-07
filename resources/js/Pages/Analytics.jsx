import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../../css/dashboard.css';

const WC_COLOR = {
    medical: '#f43f5e', organic: '#22c55e',
    recyclable: '#38bdf8', paper: '#fbbf24', general: '#a78bfa'
};
const WC_LABEL = {
    medical: 'Médical', organic: 'Organique',
    recyclable: 'Recyclable', paper: 'Papier', general: 'Général'
};

const TOOLTIP_STYLE = {
    background: '#0d1b2a', border: '1px solid #1a2e42',
    borderRadius: 8, color: '#dde6f4', fontSize: 11
};

function KpiCard({ value, label, color = '#00e5b8', icon, sub }) {
    return (
        <div className="kpi" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon && <div style={{ fontSize: 22 }}>{icon}</div>}
                <div>
                    <div className="kv" style={{ color, fontSize: 22 }}>{value ?? '—'}</div>
                    <div className="kl">{label}</div>
                    {sub && <div style={{ fontSize: 9, color: '#374e64', marginTop: 2 }}>{sub}</div>}
                </div>
            </div>
        </div>
    );
}

function SectionCard({ title, children, style }) {
    return (
        <div style={{
            background: '#08101f', border: '1px solid #1a2e42',
            borderRadius: 12, padding: '18px 20px', ...style
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#374e64', marginBottom: 14 }}>
                {title}
            </div>
            {children}
        </div>
    );
}

export default function Analytics({ auth }) {
    const [overview, setOverview] = useState(null);
    const [history, setHistory] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyHours, setHistoryHours] = useState(24);
    const [error, setError] = useState(null);

    const load = async (hours = historyHours) => {
        try {
            setLoading(true);
            const [ov, hi, st] = await Promise.all([
                fetch('/api/analytics/overview').then(r => r.json()),
                fetch(`/api/analytics/fill-history?hours=${hours}`).then(r => r.json()),
                fetch('/api/analytics/collection-stats').then(r => r.json()),
            ]);
            setOverview(ov);
            setHistory(hi);
            setStats(st);
        } catch (e) {
            setError('Erreur chargement analytics: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { if (!loading) load(historyHours); }, [historyHours]);

    const pieData = useMemo(() =>
        overview?.by_category?.map(c => ({
            name: WC_LABEL[c.category] || c.category,
            value: c.count,
            avg: c.avg_fill,
            fill: WC_COLOR[c.category] || '#a78bfa'
        })) || [], [overview]);

    const formatHour = (h) => {
        if (!h) return '';
        const d = new Date(h);
        return `${d.getHours()}:00`;
    };

    if (error) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#07111e', color: '#f43f5e', fontFamily: "'Space Grotesk',sans-serif" }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div>{error}</div>
            <button onClick={() => { setError(null); load(); }} style={{ padding: '8px 20px', background: '#00e5b8', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Réessayer</button>
        </div>
    );

    return (
        <>
            <Head>
                <title>CLEAN AGADIR — Analytics</title>
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
            </Head>

            <div style={{ minHeight: '100vh', background: '#07111e', color: '#dde6f4', fontFamily: "'Space Grotesk',sans-serif" }}>
                {/* Top bar */}
                <div style={{ background: 'rgba(7,17,30,.97)', borderBottom: '1px solid #1a2e42', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#00e5b8' }}>
                        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#00e5b8,#00a88a)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>♻️</div>
                        CLEAN AGADIR
                        <span style={{ fontSize: 9, background: 'rgba(0,229,184,.12)', color: '#00e5b8', border: '1px solid rgba(0,229,184,.2)', padding: '1px 6px', borderRadius: 3, fontFamily: "'JetBrains Mono',monospace" }}>Analytics</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 10 }}>
                        {[
                            { href: '/dashboard', label: '🗺️ Dashboard' },
                            { href: '/driver', label: '🚛 Chauffeur' },
                            { href: '/analytics', label: '📊 Analytics', active: true },
                        ].map(l => (
                            <a key={l.href} href={l.href} style={{
                                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: l.active ? 700 : 500,
                                background: l.active ? '#00e5b8' : 'transparent',
                                color: l.active ? '#06101c' : '#7a92aa',
                                border: l.active ? 'none' : '1px solid transparent',
                                textDecoration: 'none', transition: '.2s'
                            }}>{l.label}</a>
                        ))}
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#7a92aa', fontFamily: "'JetBrains Mono',monospace" }}>
                        {loading && <><span className="spin" /> Chargement...</>}
                        {!loading && <><span className="pulse" /> Mise à jour: {new Date().toLocaleTimeString()}</>}
                        <button onClick={() => load(historyHours)} style={{ padding: '4px 10px', background: 'rgba(0,229,184,.1)', border: '1px solid rgba(0,229,184,.2)', color: '#00e5b8', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}>↻ Actualiser</button>
                    </div>
                </div>

                {loading && !overview ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px)', flexDirection: 'column', gap: 12 }}>
                        <span className="spin" style={{ width: 30, height: 30, borderWidth: 3 }} />
                        <div style={{ color: '#7a92aa', fontSize: 13 }}>Chargement des données analytiques...</div>
                    </div>
                ) : (
                    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

                        {/* ── KPI Row ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 24 }}>
                            <KpiCard icon="🗑️" value={overview?.total_points} label="Points actifs" />
                            <KpiCard icon="🚨" value={overview?.critical_count} label="Critiques" color="#f43f5e" />
                            <KpiCard icon="⚠️" value={overview?.high_count} label="Haute priorité" color="#fbbf24" />
                            <KpiCard icon="📊" value={`${overview?.avg_fill}%`} label="Remplissage moy." color="#38bdf8" />
                            <KpiCard icon="✅" value={overview?.collected_today} label="Collectés auj." color="#22c55e" />
                            <KpiCard icon="📡" value={overview?.recent_readings} label="Lectures 24h" color="#a78bfa" />
                            <KpiCard icon="🔥" value={overview?.fire_alerts_24h} label="Alertes feu 24h" color="#f97316" />
                        </div>

                        {/* ── Charts Row 1 ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
                            {/* Fill Level History */}
                            <SectionCard title="Évolution Niveaux de Remplissage">
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    {[6, 12, 24, 48, 168].map(h => (
                                        <button key={h} onClick={() => setHistoryHours(h)} style={{
                                            padding: '3px 10px', borderRadius: 12, fontSize: 10, cursor: 'pointer',
                                            background: historyHours === h ? '#00e5b8' : 'transparent',
                                            color: historyHours === h ? '#06101c' : '#7a92aa',
                                            border: `1px solid ${historyHours === h ? '#00e5b8' : '#1a2e42'}`,
                                            fontFamily: "'JetBrains Mono',monospace"
                                        }}>{h === 168 ? '7j' : `${h}h`}</button>
                                    ))}
                                </div>
                                <div style={{ height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history?.timeline || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                {Object.entries(WC_COLOR).map(([k, c]) => (
                                                    <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <CartesianGrid stroke="#1a2e42" strokeDasharray="3 3" />
                                            <XAxis dataKey="time" stroke="#374e64" fontSize={9} tickFormatter={formatHour} tickLine={false} />
                                            <YAxis stroke="#374e64" fontSize={9} tickLine={false} domain={[0, 100]} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={v => new Date(v).toLocaleString()} />
                                            <Legend wrapperStyle={{ fontSize: 10 }} />
                                            {Object.entries(WC_COLOR).map(([k, c]) => (
                                                <Area key={k} type="monotone" dataKey={k} name={WC_LABEL[k]} stroke={c} fill={`url(#grad-${k})`} strokeWidth={2} dot={false} connectNulls />
                                            ))}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>

                            {/* Category Pie */}
                            <SectionCard title="Répartition des Types">
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={72} stroke="none">
                                                {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Pie>
                                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n, p) => [`${v} pts (moy. ${p.payload.avg}%)`, p.payload.name]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                    {pieData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: 11, color: '#dde6f4' }}>{d.name}</span>
                                            <span style={{ fontSize: 10, color: '#7a92aa', fontFamily: "'JetBrains Mono',monospace" }}>{d.value} pts</span>
                                            <span style={{ fontSize: 10, color: d.fill, fontFamily: "'JetBrains Mono',monospace" }}>{d.avg}%</span>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>
                        </div>

                        {/* ── Charts Row 2 ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                            {/* Daily Collections Bar */}
                            <SectionCard title="Collectes par Jour (7 derniers jours)">
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats?.daily_collections || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                            <CartesianGrid stroke="#1a2e42" strokeDasharray="3 3" />
                                            <XAxis dataKey="date" stroke="#374e64" fontSize={9} tickLine={false} tickFormatter={v => v?.slice(5)} />
                                            <YAxis stroke="#374e64" fontSize={9} tickLine={false} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                                            <Bar dataKey="collected" name="Collectés" fill="#00e5b8" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>

                            {/* Zone fill levels */}
                            <SectionCard title="Zones les Plus Chargées">
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={(overview?.by_zone || []).map(z => ({ name: z.zone?.substring(0, 12), value: parseFloat(z.avg_fill) }))}
                                            layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
                                            <CartesianGrid stroke="#1a2e42" strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" stroke="#374e64" fontSize={9} tickLine={false} domain={[0, 100]} />
                                            <YAxis type="category" dataKey="name" stroke="#374e64" fontSize={9} tickLine={false} width={70} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Remplissage moy.']} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {(overview?.by_zone || []).map((_, i) => {
                                                    const v = parseFloat(_.avg_fill);
                                                    return <Cell key={i} fill={v >= 80 ? '#f43f5e' : v >= 60 ? '#fbbf24' : '#00e5b8'} />;
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>

                            {/* Fire alerts trend */}
                            <SectionCard title="Alertes Incendie — 7 Jours">
                                <div style={{ height: 180 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.fire_history || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke="#1a2e42" strokeDasharray="3 3" />
                                            <XAxis dataKey="date" stroke="#374e64" fontSize={9} tickLine={false} tickFormatter={v => v?.slice(5)} />
                                            <YAxis stroke="#374e64" fontSize={9} tickLine={false} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                                            <Area type="monotone" dataKey="count" name="Alertes feu" stroke="#f43f5e" fill="url(#fireGrad)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </SectionCard>
                        </div>

                        {/* ── Hotspots Table ── */}
                        <SectionCard title="🔥 Top 10 Zones Critiques — Remplissage ≥ 80%">
                            {!stats?.hotspots?.length ? (
                                <div style={{ color: '#374e64', fontSize: 12, padding: 12, textAlign: 'center' }}>Aucune zone critique actuellement</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead>
                                        <tr>
                                            {['#', 'Nom', 'Zone', 'Catégorie', 'Remplissage', 'Priorité'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#374e64', fontWeight: 600, borderBottom: '1px solid #1a2e42', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.hotspots.map((p, i) => {
                                            const color = p.fill_level >= 90 ? '#f43f5e' : p.fill_level >= 80 ? '#fbbf24' : '#dde6f4';
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(26,46,66,.4)' }}>
                                                    <td style={{ padding: '8px 10px', color: '#374e64', fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</td>
                                                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{p.name?.substring(0, 28)}</td>
                                                    <td style={{ padding: '8px 10px', color: '#7a92aa' }}>{p.zone || '—'}</td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <span style={{ background: `${WC_COLOR[p.waste_category]}20`, color: WC_COLOR[p.waste_category], padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                                                            {WC_LABEL[p.waste_category] || p.waste_category}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 4, background: '#1a2e42', borderRadius: 99 }}>
                                                                <div style={{ height: '100%', width: `${p.fill_level}%`, background: color, borderRadius: 99 }} />
                                                            </div>
                                                            <span style={{ fontFamily: "'JetBrains Mono',monospace", color, fontWeight: 700, minWidth: 36 }}>{p.fill_level}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                                                            background: p.priority === 'critical' ? 'rgba(244,63,94,.15)' : 'rgba(251,191,36,.1)',
                                                            color: p.priority === 'critical' ? '#f43f5e' : '#fbbf24'
                                                        }}>
                                                            {p.priority?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </SectionCard>

                        {/* ── Footer stats ── */}
                        <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center', color: '#374e64', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                            <span>📡 {stats?.total_readings?.toLocaleString()} lectures IoT totales</span>
                            <span>·</span>
                            <span>🌡️ Température moy. 24h: {stats?.avg_temp_24h ?? '—'}°C</span>
                            <span>·</span>
                            <span>Données: CLEAN AGADIR · Agadir · {new Date().getFullYear()}</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
