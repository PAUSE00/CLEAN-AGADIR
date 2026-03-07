import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * AutoDemo — guided PFE jury demonstration
 * Runs automatically: loads data → VRP → animate → panne → replan
 */
const STEPS = [
    { icon: '🗺️', title: 'Chargement de la carte', desc: '834 points de collecte réels d\'Agadir chargés depuis la base de données.' },
    { icon: '🧠', title: 'Optimisation VRP NSGA-II', desc: 'Algorithme évolutionnaire multi-objectif calcule les routes optimales (distance + priorité).' },
    { icon: '🛣️', title: 'Routage réel OSRM', desc: 'Routes tracées sur les vraies rues d\'Agadir via l\'API OpenStreetMap OSRM.' },
    { icon: '🚛', title: 'Animation camion temps réel', desc: 'Simulation du trajet stop-par-stop avec collecte et mise à jour des niveaux.' },
    { icon: '💥', title: 'Panne simulée!', desc: 'Un camion tombe en panne en pleine route. Le système détecte les arrêts restants.' },
    { icon: '🔄', title: 'Replanification dynamique', desc: 'VRP relancé en temps réel sur les points non collectés. Nouvelles routes en < 1s.' },
    { icon: '📊', title: 'Analytics & IoT', desc: 'Capteurs IoT surveillent les niveaux en temps réel. Analytics historiques disponibles.' },
];

export default function AutoDemo({
    pts, routes, runVRP, playRoute, triggerBreakdown,
    playbackRouteIndex, replanningActive,
    onClose, setActiveTab, addLog, addToast,
    vrpResult,
}) {
    const [step, setStep] = useState(0);
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const [done, setDone] = useState(false);
    const timerRef = useRef(null);
    const pausedRef = useRef(false);

    const wait = (ms) => new Promise(resolve => {
        timerRef.current = setTimeout(resolve, ms);
    });

    const waitWhile = async (condFn, maxMs = 30000, intervalMs = 400) => {
        const start = Date.now();
        while (condFn() && Date.now() - start < maxMs) {
            if (pausedRef.current) await new Promise(r => setTimeout(r, 200));
            await new Promise(r => setTimeout(r, intervalMs));
        }
    };

    const advance = useCallback(async () => {
        if (running) return;
        setRunning(true);
        pausedRef.current = false;

        try {
            // ── Step 0: Show map ──────────────────────────────
            setStep(0);
            setActiveTab('carte');
            addLog('🎬 Démo jury PFE démarrée', 'ok');
            addToast('🎬 Démo automatique lancée!', 'ok');
            await wait(2500);

            // ── Step 1: Run VRP ───────────────────────────────
            setStep(1);
            setActiveTab('vrp');
            await wait(1000);
            runVRP();
            // Wait until routes appear (VRP finishes)
            await waitWhile(() => routes.length === 0, 45000, 600);
            await wait(1500);
            addToast('✅ Optimisation terminée!', 'ok');

            // ── Step 2: Show OSRM routes ──────────────────────
            setStep(2);
            setActiveTab('carte');
            await wait(2000);

            // ── Step 3: Animate truck ─────────────────────────
            setStep(3);
            if (routes.length > 0) {
                playRoute(0);
                await wait(1200);
                addLog('🚛 Animation route 1 démarrée pour démo', 'ok');
                // Let it animate for 8 seconds then trigger breakdown
                await wait(8000);
            }

            // ── Step 4: Panne ─────────────────────────────────
            setStep(4);
            if (playbackRouteIndex !== null) {
                triggerBreakdown();
                await wait(600);
            }

            // ── Step 5: Replan ────────────────────────────────
            setStep(5);
            await waitWhile(() => replanningActive, 30000, 500);
            await wait(1500);

            // ── Step 6: IoT / Analytics ───────────────────────
            setStep(6);
            setActiveTab('iot');
            await wait(2500);
            setActiveTab('stats');
            await wait(2000);

            setDone(true);
            addLog('🎉 Démo PFE terminée avec succès!', 'ok');
            addToast('🎉 Démo complète!', 'ok');
        } catch (e) {
            addLog(`✗ Démo interrompue: ${e.message}`, 'err');
        } finally {
            setRunning(false);
        }
    }, [routes, playbackRouteIndex, replanningActive]);

    const togglePause = () => {
        pausedRef.current = !pausedRef.current;
        setPaused(p => !p);
    };

    const handleClose = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        pausedRef.current = true;
        setRunning(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 8000, minWidth: 520, maxWidth: 680,
            animation: 'fadeIn .4s ease',
        }}>
            {/* Main panel */}
            <div style={{
                background: 'rgba(5,11,20,.92)',
                border: '1px solid rgba(0,229,184,.25)',
                borderRadius: 18, padding: '20px 24px',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 16px 60px rgba(0,0,0,.7), 0 0 0 1px rgba(0,229,184,.06), inset 0 1px 0 rgba(255,255,255,.05)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2,
                        color: '#00e5b8', background: 'rgba(0,229,184,.12)',
                        padding: '3px 10px', borderRadius: 20,
                        border: '1px solid rgba(0,229,184,.2)',
                        fontFamily: "'JetBrains Mono',monospace",
                    }}>🎓 Démo PFE — Mode Auto</div>
                    <div style={{ flex: 1 }} />
                    {!running && !done && (
                        <button onClick={advance} style={{
                            padding: '6px 18px', borderRadius: 20,
                            background: 'linear-gradient(135deg,#00e5b8,#00a88a)',
                            border: 'none', color: '#06101c', fontWeight: 700,
                            fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
                            boxShadow: '0 4px 14px rgba(0,229,184,.4)',
                            transition: '.2s',
                        }}>▶ Lancer la Démo</button>
                    )}
                    {running && (
                        <button onClick={togglePause} style={{
                            padding: '6px 16px', borderRadius: 20,
                            background: paused ? 'rgba(0,229,184,.15)' : 'rgba(251,191,36,.1)',
                            border: `1px solid ${paused ? 'rgba(0,229,184,.3)' : 'rgba(251,191,36,.3)'}`,
                            color: paused ? '#00e5b8' : '#fbbf24',
                            fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif",
                        }}>{paused ? '▶ Reprendre' : '⏸ Pause'}</button>
                    )}
                    <button onClick={handleClose} style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.2)',
                        color: '#f43f5e', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                </div>

                {/* Current step */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                        background: done
                            ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                            : 'linear-gradient(135deg,#00e5b8,#00a88a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, boxShadow: `0 0 20px ${done ? 'rgba(34,197,94,.5)' : 'rgba(0,229,184,.5)'}`,
                        animation: running && !paused ? 'glow-pulse 2s infinite' : 'none',
                    }}>
                        {done ? '✅' : STEPS[step]?.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#dde6f4', marginBottom: 4 }}>
                            {done ? '🎉 Démonstration Complète!' : STEPS[step]?.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#7a92aa', lineHeight: 1.6 }}>
                            {done
                                ? 'Le système VillePropre a démontré: collecte IoT, optimisation VRP multi-algorithme, routage réel OSRM, animation temps réel et replanification dynamique sur panne.'
                                : STEPS[step]?.desc}
                        </div>
                        {paused && (
                            <div style={{ marginTop: 6, fontSize: 10, color: '#fbbf24', fontFamily: "'JetBrains Mono',monospace" }}>
                                ⏸ En pause — cliquez ▶ pour reprendre
                            </div>
                        )}
                    </div>
                </div>

                {/* Steps progress dots */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {STEPS.map((s, i) => (
                        <div key={i} title={s.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%', transition: 'all .4s',
                                background: done || i < step ? '#374e64' : i === step ? '#00e5b8' : '#1a2e42',
                                boxShadow: i === step && !done ? '0 0 8px #00e5b8' : 'none',
                                transform: i === step && !done ? 'scale(1.4)' : 'scale(1)',
                            }} />
                            <div style={{
                                height: 2, width: '100%', borderRadius: 99,
                                background: done || i < step ? '#374e64' : i === step ? 'linear-gradient(90deg,#00e5b8,#374e64)' : '#1a2e42',
                                transition: 'background .4s',
                            }} />
                        </div>
                    ))}
                    <div style={{
                        fontSize: 10, color: '#374e64', fontFamily: "'JetBrains Mono',monospace",
                        minWidth: 40, textAlign: 'right',
                    }}>
                        {done ? '7/7' : `${step + 1}/7`}
                    </div>
                </div>
            </div>
        </div>
    );
}
