'use client';

import { useState, useEffect } from 'react';
import type { StoreConfig } from '@/lib/stores.config';

interface StoreFloatingActionsProps {
  store: Pick<StoreConfig, 'slug' | 'name' | 'tagline' | 'theme'>;
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
 *
 * `absolute`, no `fixed`: vive dentro del contenedor del banner (el padre debe
 * ser `relative`), asi que se va con el banner al hacer scroll en vez de
 * quedar flotando encima de toda la pagina.
 */
export default function StoreFloatingActions({ store }: StoreFloatingActionsProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  // null = todavía no se sabe: el botón no se dibuja hasta comprobarlo (evita el parpadeo)
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

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

    // Solo cuenta como instalada ESTA tienda, no "estamos dentro de alguna PWA":
    // todas las tiendas viven en el mismo dominio, así que estar en standalone
    // puede significar que estás dentro de BogaHub o de otra tienda, y ahí el
    // botón sí tiene que aparecer (con el aviso de abrirlo en el navegador).
    // En iOS no existe el evento `appinstalled`, así que no hay forma de saber
    // cuál app se instaló: si está en standalone se asume que es esta.
    //
    // En su dirección propia (<tienda>.bogahub.app) el origen es distinto al de BogaHub:
    // si se abrió desde la app de BogaHub instalada, el navegador dice "modo app" aunque
    // ESTA tienda no esté instalada. Se considera instalada si está en modo app Y (consta que
    // se instaló —`appinstalled` o el arranque en `/?source=pwa` del manifiesto— o NO llegó
    // desde otro origen: abierta desde su ícono o navegando dentro de sí misma). Esto último
    // cubre también las apps instaladas antes de existir la marca; por eso los links a tiendas
    // NO llevan `noreferrer` (se perdería de dónde vienes). Fuera del modo app el botón sale siempre.
    const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').host;
    const h = window.location.hostname;
    const enDireccionPropia = h.endsWith('.' + base) && h.split('.')[0] !== 'www';
    if (enDireccionPropia) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('source') === 'pwa') {
        localStorage.setItem(installKey, 'true');
        params.delete('source');
        const q = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
      }
    }
    const llegoDeOtroOrigen = (() => {
      try { return !!document.referrer && new URL(document.referrer).origin !== window.location.origin; } catch { return false; }
    })();
    const checkInstalled = () => {
      const enModoApp = !!((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches);
      if (enDireccionPropia) return enModoApp && (localStorage.getItem(installKey) === 'true' || !llegoDeOtroOrigen);
      return localStorage.getItem(installKey) === 'true' || !!(window.navigator as any).standalone;
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

    // Ya estamos dentro de OTRA app instalada (BogaHub, o la de otra
    // tienda) — el navegador no ofrece instalar una segunda PWA desde acá
    // adentro (no hay chrome del navegador). Hay que sacar el link afuera.
    const yaEnStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (yaEnStandalone) {
      // iPhone: la tienda se abrió dentro del navegador integrado de otra app (BogaHub) y ese
      // navegador tiene su PROPIO botón de compartir (barra de abajo) con "Agregar a Inicio".
      // La hoja de `navigator.share` NO trae esa opción, así que se guía al de la barra.
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        alert('Para instalar:\n\n1. Toca el botón Compartir (📤) de la barra de abajo\n2. Desliza y toca "Agregar a Inicio"\n3. Toca "Agregar"');
        return;
      }
      const url = window.location.href;
      navigator.clipboard?.writeText(url).catch(() => {});
      if (navigator.share) {
        navigator.share({ title: store.name, text: `Instalá la app de ${store.name}`, url }).catch(() => {});
      } else {
        alert(`Para instalar "${store.name}" como app aparte, abrí este link en tu navegador (Chrome o Safari), no desde acá adentro. Se copió el link:\n\n${url}`);
      }
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
    <div className="absolute top-3 right-3 z-30 flex flex-col gap-2">
      <button
        onClick={compartir}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
        style={{ color: t.onBackground }}
        aria-label="Compartir"
        title="Compartir"
      >
        <span className="material-symbols-outlined text-[20px]">share</span>
      </button>
      {isInstalled === false && (
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
