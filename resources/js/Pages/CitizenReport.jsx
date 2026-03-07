import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import mapboxgl from 'mapbox-gl';
import { Camera, MapPin, AlertTriangle, Trash2, CheckCircle, ChevronLeft } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── Shared UI ─────────────────────────────────────────────────────────
import { Sec } from '../Components/UI/Shared';

export default function CitizenReport() {
    const [step, setStep] = useState(1); // 1: Info, 2: Location, 3: Details, 4: Success
    const [loading, setLoading] = useState(false);

    // Form Data
    const [reportType, setReportType] = useState('overflow'); // overflow, wild, damage
    const [location, setLocation] = useState(null);
    const [description, setDescription] = useState('');

    // Mapbox
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    // Initialize Mapbox token (requires a public or shared token endpoint without auth or hardcoded here)
    useEffect(() => {
        if (step !== 2) return;

        const initMap = async () => {
            if (mapRef.current) return;
            try {
                // For a public page, your token endpoint must not be auth-protected, or we use a public one
                // Assuming /api/mapbox/token is currently protected, for now we will just use the env variable passed by Inertia if any,
                // But typically you'd open up the token route. Let's try fetching first.
                const res = await fetch('/api/mapbox/token');

                // If it fails (401), we can't load the map easily without changing the backend. Let's assume we change backend to allow token fetch.
                const data = await res.json();
                mapboxgl.accessToken = data.token || '';

                const map = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/dark-v11',
                    center: [-9.5981, 30.4278], // Agadir Center
                    zoom: 13,
                    pitch: 45
                });

                // Add Geolocate control
                const geolocate = new mapboxgl.GeolocateControl({
                    positionOptions: { enableHighAccuracy: true },
                    trackUserLocation: true,
                    showAccuracyCircle: false
                });
                map.addControl(geolocate);

                map.on('load', () => {
                    geolocate.trigger(); // Auto locate the citizen
                });

                // When user clicks map, place the pin
                map.on('click', (e) => {
                    const { lng, lat } = e.lngLat;
                    setLocation({ lat, lng });

                    if (!markerRef.current) {
                        const el = document.createElement('div');
                        el.style.width = '30px';
                        el.style.height = '30px';
                        el.style.backgroundColor = '#fbbf24';
                        el.style.borderRadius = '50%';
                        el.style.border = '3px solid #1a1b23';
                        el.style.boxShadow = '0 0 10px rgba(251,191,36,0.6)';

                        markerRef.current = new mapboxgl.Marker(el)
                            .setLngLat([lng, lat])
                            .addTo(map);
                    } else {
                        markerRef.current.setLngLat([lng, lat]);
                    }
                });

                mapRef.current = map;
            } catch (e) {
                console.error('Failed to load map data:', e);
            }
        };
        initMap();
    }, [step]);

    const handleSubmit = async () => {
        if (!location) { alert('Veuillez sélectionner un lieu sur la carte'); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                },
                body: JSON.stringify({
                    lat: location.lat,
                    lng: location.lng,
                    type: reportType,
                    description
                })
            });

            if (res.ok) {
                setStep(4);
            } else {
                throw new Error('Erreur serveur');
            }
        } catch (e) {
            alert('Erreur lors de l\'envoi du signalement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vp-app-container citizen-theme min-h-screen relative flex items-center justify-center p-4">
            <Head title="CLEAN AGADIR - Signalement Citoyen" />

            {/* Background Blob Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0,229,184,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
            </div>

            <main className="relative z-10 w-full max-w-md mx-auto">
                <Sec classN="glass-panel overflow-hidden border border-white/5 shadow-2xl relative">

                    {/* Header */}
                    <header className="px-6 py-5 border-b border-white/5 flex items-center gap-4 bg-black/20">
                        {step > 1 && step < 4 && (
                            <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-[#00e5b8] to-[#00a383] bg-clip-text text-transparent">
                                CLEAN AGADIR
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5 tracking-wide uppercase font-semibold">Portail Citoyen</p>
                        </div>
                    </header>

                    {/* Content Area */}
                    <div className="p-6">

                        {/* STEP 1: Incident Type */}
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Signaler un Incident</h2>
                                    <p className="text-slate-400 text-sm">Aidez-nous à garder Agadir propre en signalant les problèmes de collecte.</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => { setReportType('overflow'); setStep(2); }}
                                        className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#00e5b8]/30 transition-all flex items-center gap-4 group">
                                        <div className="w-12 h-12 rounded-full bg-[#00e5b8]/10 text-[#00e5b8] flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Trash2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium text-lg">Benne qui déborde</h3>
                                            <p className="text-slate-400 text-sm">Corbeille ou conteneur plein</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setReportType('wild'); setStep(2); }}
                                        className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-400/30 transition-all flex items-center gap-4 group">
                                        <div className="w-12 h-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium text-lg">Décharge sauvage</h3>
                                            <p className="text-slate-400 text-sm">Dépôt d'ordures illégal</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setReportType('damage'); setStep(2); }}
                                        className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 transition-all flex items-center gap-4 group">
                                        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Trash2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium text-lg">Équipement abîmé</h3>
                                            <p className="text-slate-400 text-sm">Benne cassée ou vandalisée</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Location */}
                        {step === 2 && (
                            <div className="space-y-4 animate-fade-in flex flex-col h-[500px]">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Localisation</h2>
                                    <p className="text-slate-400 text-sm">Touchez la carte à l'endroit exact de l'incident.</p>
                                </div>

                                <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative">
                                    <div ref={mapContainerRef} className="w-full h-full" />

                                    {/* Map Reticle Overlay */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50">
                                        <MapPin size={32} className="text-white/30" />
                                    </div>
                                </div>

                                <button
                                    disabled={!location}
                                    onClick={() => setStep(3)}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00e5b8] to-[#00a383] text-[#1a1b23] font-bold text-lg disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-[#00e5b8]/20">
                                    Confirmer la position
                                </button>
                            </div>
                        )}

                        {/* STEP 3: Submit */}
                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Détails (Optionnel)</h2>
                                    <p className="text-slate-400 text-sm">Ajoutez une description pour aider nos équipes.</p>
                                </div>

                                {/* Photo placeholder (mock UI) */}
                                <button className="w-full h-32 rounded-2xl border-2 border-dashed border-white/10 hover:border-[#00e5b8]/50 bg-white/5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#00e5b8] transition-colors group">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#00e5b8]/10">
                                        <Camera size={24} />
                                    </div>
                                    <span className="text-sm font-medium">Prendre une photo</span>
                                </button>

                                <div>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Décrivez l'incident..."
                                        className="w-full h-32 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 p-4 focus:outline-none focus:border-[#00e5b8]/50 focus:ring-1 focus:ring-[#00e5b8]/50 resize-none transition-all"
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    onClick={handleSubmit}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00e5b8] to-[#00a383] text-[#1a1b23] font-bold text-lg disabled:opacity-50 transition-all shadow-lg shadow-[#00e5b8]/20 flex items-center justify-center">
                                    {loading ? <span className="animate-spin w-6 h-6 border-2 border-[#1a1b23] border-t-transparent rounded-full" /> : 'Envoyer le signalement'}
                                </button>
                            </div>
                        )}

                        {/* STEP 4: Success */}
                        {step === 4 && (
                            <div className="space-y-6 animate-fade-in text-center py-8">
                                <div className="w-24 h-24 rounded-full bg-[#00e5b8]/10 text-[#00e5b8] flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={48} />
                                </div>

                                <h2 className="text-2xl font-bold text-white">Merci !</h2>
                                <p className="text-slate-400 text-base leading-relaxed">
                                    Votre signalement a été transmis au centre de contrôle de <strong className="text-white">CLEAN AGADIR</strong>.<br /><br />
                                    Une équipe de collecte sera automatiquement redirigée vers ce point lors de la prochaine optimisation de tournée.
                                </p>

                                <button
                                    onClick={() => { setStep(1); setLocation(null); setDescription(''); }}
                                    className="mt-8 w-full py-4 rounded-xl font-bold text-lg border border-white/10 hover:bg-white/5 text-white transition-all">
                                    Nouveau Signalement
                                </button>
                            </div>
                        )}
                    </div>
                </Sec>

                {/* Footer / Info */}
                <div className="text-center mt-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Trash2 size={12} /> CLEAN AGADIR Agadir · Initiative Smart City
                </div>
            </main>
        </div>
    );
}
