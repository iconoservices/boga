'use client';

import { useState, useEffect } from 'react';

export default function HomeFloatingActions() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const checkInstalled = () => {
      if (localStorage.getItem('boga_pwa_installed') === 'true') return true;
      if ((window.navigator as any).standalone) return true;
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      return false;
    };

    setIsInstalled(checkInstalled());

    const handleInstalled = () => {
      localStorage.setItem('boga_pwa_installed', 'true');
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    } else {
      const ua = navigator.userAgent.toLowerCase();
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (/iphone|ipad|ipod/.test(ua) && isSafari) {
        alert('Para instalar:\n\n1. Tocá el icono Compartir (📤) abajo\n2. Deslizá y tocá "Agregar a pantalla de inicio"\n3. Tocá "Agregar"');
      } else {
        alert('Para instalar:\n\n1. Abrí el menú del navegador (⋯)\n2. Buscá "Agregar a pantalla de inicio"\n3. Confirmá la instalación');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Boga Market',
        text: 'Descubre tiendas y productos cerca de ti',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  return (
    <div className="fixed top-32 lg:top-24 right-3 z-50 flex flex-col gap-2">
      <button
        onClick={handleShare}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 text-on-surface shadow-lg active:scale-90 hover:bg-white/60 transition-all"
        title="Compartir"
      >
        <span className="material-symbols-outlined text-[20px]">share</span>
      </button>
      {!isInstalled && (
        <button
          onClick={handleInstall}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 text-primary shadow-lg active:scale-90 hover:bg-white/60 transition-all"
          title="Instalar"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      )}
    </div>
  );
}
