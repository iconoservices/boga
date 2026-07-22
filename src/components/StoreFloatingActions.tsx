'use client';

import { useState, useEffect } from 'react';
import type { StoreConfig } from '@/lib/stores.config';

interface StoreFloatingActionsProps {
  store: Pick<StoreConfig, 'slug' | 'name' | 'tagline' | 'theme'>;
  /**
   * Separacion desde arriba, en clases de Tailwind. Cada plantilla tiene su
   * header con distinta altura, asi que el default no le sirve a todas.
   */
  top?: string;
}

/**
 * Botones flotantes de compartir e instalar (PWA) de una tienda.
 *
 * Vive en un componente y no copiado en cada plantilla porque la logica de
 * instalacion (beforeinstallprompt, deteccion de standalone, instructivo de
 * iOS) son ~50 lineas que estaban duplicadas y que se desincronizaban: la
 * pollería, por ejemplo, no limpiaba bien su listener de `appinstalled`.
 *
 * Se muestran tambien en escritorio: `beforeinstallprompt` dispara en Chrome
 * y Edge de escritorio, asi que ahi la instalacion funciona igual que en el
 * celular. Compartir cae al portapapeles cuando no hay `navigator.share`,
 * que es justamente el caso de la mayoria de los navegadores de escritorio.
 */
export default function StoreFloatingActions({ store, top = 'top-20' }: StoreFloatingActionsProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const t = store.theme;
  // Con clave fija, instalar UNA tienda escondia el boton de instalar en TODAS
  // las demas (todas viven bajo el mismo dominio, y localStorage es por origen).
  const installKey = `boga_pwa_installed_${store.slug}`;

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleInstalled = () => {
      localStorage.setItem(installKey, 'true');
      setIsInstalled(true);
    };

    const checkInstalled = () => {
      if (localStorage.getItem(installKey) === 'true') return true;
      if ((window.navigator as any).standalone) return true;
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      return false;
    };

    setIsInstalled(checkInstalled());

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [installKey]);

  const instalar = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
      return;
    }
    const ua = navigator.userAgent.toLowerCase();
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (/iphone|ipad|ipod/.test(ua) && isSafari) {
      alert('Para instalar:\n\n1. Tocá el icono Compartir (📤) abajo\n2. Deslizá y tocá "Agregar a pantalla de inicio"\n3. Tocá "Agregar"');
    } else {
      alert('Para instalar:\n\n1. Abrí el menú del navegador (⋯)\n2. Buscá "Agregar a pantalla de inicio"\n3. Confirmá la instalación');
    }
  };

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  return (
    <div className={`fixed ${top} right-3 z-50 flex flex-col gap-2`}>
      <button
        onClick={compartir}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
        style={{ color: t.onBackground }}
        aria-label="Compartir"
        title="Compartir"
      >
        <span className="material-symbols-outlined text-[20px]">share</span>
      </button>
      {!isInstalled && (
        <button
          onClick={instalar}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
          style={{ color: t.primary }}
          aria-label="Instalar aplicación"
          title="Instalar"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
        </button>
      )}
    </div>
  );
}
