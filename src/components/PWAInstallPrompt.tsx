'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface PWAStats {
    visitCount: number;
    lastVisit: number;
    isInstalled: boolean;
    lastDismissed?: number;
}

export default function PWAInstallPrompt() {
    const pathname = usePathname();
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    const getStats = (): PWAStats => {
        const saved = localStorage.getItem('bogadash_pwa_stats');
        if (saved) return JSON.parse(saved);
        return { visitCount: 0, lastVisit: Date.now(), isInstalled: false, lastDismissed: 0 };
    };

    const saveStats = (stats: PWAStats) => {
        localStorage.setItem('bogadash_pwa_stats', JSON.stringify(stats));
    };

    useEffect(() => {
        if (!pathname?.startsWith('/dashboard')) return;

        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        if (isPWA) {
            localStorage.removeItem('bogadash_pwa_stats');
            return;
        }

        const userAgent = window.navigator.userAgent.toLowerCase();
        const iosMatch = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(iosMatch);

        const stats = getStats();
        const now = Date.now();
        const hoursSinceLastVisit = (now - stats.lastVisit) / (1000 * 60 * 60);

        const newStats: PWAStats = {
            visitCount: stats.visitCount + 1,
            lastVisit: now,
            isInstalled: false
        };
        saveStats(newStats);

        const triggerBanner = () => {
            const stats = getStats();
            const now = Date.now();
            const hoursSinceDismiss = (now - (stats.lastDismissed || 0)) / (1000 * 60 * 60);

            if (hoursSinceDismiss < 24) return;
            if (!showIOSGuide) setShowBanner(true);
        };

        const setupLogic = () => {
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

        if (iosMatch) {
            setupLogic();
        } else {
            window.addEventListener('beforeinstallprompt', handler);
        }

        window.addEventListener('appinstalled', () => {
            setShowBanner(false);
            localStorage.removeItem('bogadash_pwa_stats');
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [showIOSGuide, pathname]);

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

    if (!pathname?.startsWith('/dashboard')) return null;
    if (!showBanner && !showIOSGuide) return null;

    return (
        <>
            {showBanner && (
                <div className="fixed top-4 left-4 right-4 z-[9999] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-4 flex items-center justify-between animate-[slideDown_0.3s_ease-out]">
                    <button
                        onClick={() => {
                            const stats = getStats();
                            saveStats({ ...stats, lastDismissed: Date.now() });
                            setShowBanner(false);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <img src="/pwa-icon.png" alt="Boga Dash" className="w-12 h-12 rounded-xl shadow-sm" />
                        <div>
                            <p className="font-extrabold text-[#5244e1] text-sm leading-tight">Boga Dash</p>
                            <p className="text-xs text-gray-500 font-medium leading-tight mt-0.5">Instala la app para administrar</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleActionClick} 
                        className="bg-[#5244e1] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#5244e1]/30 hover:shadow-[#5244e1]/50 transition-shadow ml-2 whitespace-nowrap"
                    >
                        INSTALAR
                    </button>
                </div>
            )}

            {showIOSGuide && (
                <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-5">
                    <div className="bg-white max-w-[340px] w-full rounded-[35px] p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.2)] animate-[scaleIn_0.3s_ease-out]">
                        <span className="text-4xl">🍎</span>
                        <h2 className="text-xl font-extrabold mt-4 mb-2 text-[#5244e1]">Instalar en iPhone</h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            Para instalar <b>Boga Dash</b> en tu pantalla de inicio:
                        </p>
                        <div className="text-left bg-gray-50 p-5 rounded-2xl text-sm mb-8 border border-gray-100">
                            <p className="my-2 flex items-center gap-2">
                                <span className="font-bold text-gray-900">1.</span> Toca el botón <b>Compartir</b> <span className="material-symbols-outlined text-[16px]">ios_share</span> abajo.
                            </p>
                            <p className="my-2 flex items-center gap-2">
                                <span className="font-bold text-gray-900">2.</span> Elige <b>"Agregar a inicio"</b> <span className="material-symbols-outlined text-[16px]">add_box</span>.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowIOSGuide(false)} 
                            className="w-full py-4 rounded-2xl bg-gray-900 text-white font-extrabold tracking-wide hover:bg-black transition-colors"
                        >
                            ENTENDIDO
                        </button>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </>
    );
}
