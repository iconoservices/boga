'use client';

import { useState, useEffect } from 'react';

interface PWAStats {
    visitCount: number;
    lastVisit: number;
    isInstalled: boolean;
    lastDismissed?: number;
}

export default function PWAInstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    // Recuperar o inicializar estadísticas
    const getStats = (): PWAStats => {
        const saved = localStorage.getItem('delva_pwa_stats');
        if (saved) return JSON.parse(saved);
        return { visitCount: 0, lastVisit: Date.now(), isInstalled: false, lastDismissed: 0 };
    };

    const saveStats = (stats: PWAStats) => {
        localStorage.setItem('delva_pwa_stats', JSON.stringify(stats));
    };

    useEffect(() => {
        // 1. Detectar si ya es PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        if (isPWA) {
            localStorage.removeItem('delva_pwa_stats');
            return;
        }

        // 2. Determinar si es iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const iosMatch = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(iosMatch);

        const stats = getStats();
        const now = Date.now();
        const hoursSinceLastVisit = (now - stats.lastVisit) / (1000 * 60 * 60);

        // Actualizar estadísticas de visita
        const newStats: PWAStats = {
            visitCount: stats.visitCount + 1,
            lastVisit: now,
            isInstalled: false
        };
        saveStats(newStats);

        const triggerBanner = () => {
            // No mostrar si fue descartado hace menos de 24 horas
            const stats = getStats();
            const now = Date.now();
            const hoursSinceDismiss = (now - (stats.lastDismissed || 0)) / (1000 * 60 * 60);

            if (hoursSinceDismiss < 24) {
                console.log("PWA: Silenciado por 24h (hace " + hoursSinceDismiss.toFixed(1) + "h)");
                return;
            }

            if (!showIOSGuide) setShowBanner(true);
        };

        const setupLogic = () => {
            // --- ALGORITMO ASIMÉTRICO (Visita 4+: Cada 2 visitas) ---
            if (newStats.visitCount === 1) {
                setTimeout(triggerBanner, 3000);
            } else if (newStats.visitCount === 2) {
                const checkScroll = () => {
                    const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
                    if (scrollPercent >= 0.5) {
                        triggerBanner();
                        window.removeEventListener('scroll', checkScroll);
                    }
                };
                window.addEventListener('scroll', checkScroll);
                return () => window.removeEventListener('scroll', checkScroll);
            } else if (newStats.visitCount === 3) {
                setTimeout(triggerBanner, 18000);
            } else {
                // El Loop: Una visita sí, una visita no (Ej: 4, 6, 8...) o > 48h
                const shouldShowByLoop = newStats.visitCount % 2 === 0;
                const shouldShowByInactivity = hoursSinceLastVisit >= 48;
                if (shouldShowByLoop || shouldShowByInactivity) {
                    setTimeout(triggerBanner, 10000);
                }
            }
        };

        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
            setupLogic();
        };

        // En iOS 'beforeinstallprompt' no existe, lo disparamos directo
        if (iosMatch) {
            setupLogic();
        } else {
            window.addEventListener('beforeinstallprompt', handler);
        }

        window.addEventListener('appinstalled', () => {
            setShowBanner(false);
            localStorage.removeItem('delva_pwa_stats');
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [showIOSGuide]);

    const handleActionClick = async () => {
        if (isIOS) {
            setShowIOSGuide(true);
            setShowBanner(false);
        } else if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') setShowBanner(false);
        }
    };

    // --- RENDERIZADO DEL BANNER ---
    if (!showBanner && !showIOSGuide) return null;

    return (
        <>
            {showBanner && (
                <div className="pwa-banner fade-in">
                    <div className="pwa-content">
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(26,60,52,0.2)' }}>
                            🌿
                        </div>
                        <div>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>Instala la App de DELVA</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6, fontWeight: 600 }}>Mejor experiencia y compras rápidas</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                            onClick={() => {
                                const stats = getStats();
                                saveStats({ ...stats, lastDismissed: Date.now() });
                                setShowBanner(false);
                            }} 
                            style={{ background: 'transparent', color: 'rgba(0,0,0,0.3)', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                            AHORA NO
                        </button>
                        <button onClick={handleActionClick} className="btn-vibrant" style={{ padding: '10px 18px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900 }}>INSTALAR ✨</button>
                    </div>
                </div>
            )}

            {/* --- GUÍA VISUAL PARA iOS --- */}
            {showIOSGuide && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="fade-in" style={{ background: 'white', maxWidth: '340px', width: '100%', borderRadius: '35px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
                        <span style={{ fontSize: '2.5rem' }}>🍎</span>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '15px', marginBottom: '10px', color: 'var(--primary)' }}>Instalar en iPhone</h2>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7, lineHeight: 1.6, marginBottom: '25px' }}>
                            Para instalar <b>DELVA</b> en tu pantalla de inicio:
                        </p>
                        <div style={{ textAlign: 'left', background: '#f5f5f5', padding: '20px', borderRadius: '20px', fontSize: '0.85rem', marginBottom: '30px' }}>
                            <p style={{ margin: '8px 0' }}>1. Toca el botón <b>Compartir</b> (el cuadrito con la flecha ↑ abajo).</p>
                            <p style={{ margin: '8px 0' }}>2. Desliza hacia abajo y elige <b>"Agregar a inicio"</b> (+).</p>
                        </div>
                        <button onClick={() => setShowIOSGuide(false)} className="btn-vibrant" style={{ width: '100%', padding: '15px', borderRadius: '18px', fontWeight: 900 }}>ENTENDIDO 🌿</button>
                    </div>
                </div>
            )}
        </>
    );
}
