'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import StorePushBell from '@/components/StorePushBell';
import type { StoreConfig } from '@/lib/stores.config';

interface StoreFloatingActionsProps {
  store: Pick<StoreConfig, 'slug' | 'name' | 'tagline' | 'theme' | 'pushActivo' | 'latitud' | 'longitud' | 'mostrarUbicacion' | 'appPropia' | 'heroImage' | 'logoImage'>;
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
  // Guía de instalación para iPhone (Apple no deja instalar por código: hay que indicar el botón Compartir)
  const [guiaIOS, setGuiaIOS] = useState(false);

  const t = store.theme;
  // Con clave fija, instalar UNA tienda escondia el boton de instalar en TODAS
  // las demas (todas viven bajo el mismo dominio, y localStorage es por origen).
  const installKey = `boga_pwa_installed_${store.slug}`;

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Sin subdominio propio lo que se instala es BogaHub (el mismo desde cualquier tienda): se recuerda con la marca
    // compartida de BogaHub, así el botón no reaparece en cada tienda pidiendo instalar lo que ya está instalado.
    const instalaBoga = !store.appPropia;
    const handleInstalled = () => {
      localStorage.setItem(installKey, 'true');
      if (instalaBoga) localStorage.setItem('boga_pwa_installed', 'true');
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
      return localStorage.getItem(installKey) === 'true' || (instalaBoga && localStorage.getItem('boga_pwa_installed') === 'true') || !!(window.navigator as any).standalone;
    };

    setIsInstalled(checkInstalled());

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [installKey, store.appPropia]);

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
        setGuiaIOS(true);
        return;
      }
      const url = window.location.href;
      navigator.clipboard?.writeText(url).catch(() => {});
      if (navigator.share) {
        navigator.share({ title: store.name, text: `Instala la app de ${store.name}`, url }).catch(() => {});
      } else {
        alert(`Para instalar "${store.name}" como app aparte, abre este link en tu navegador (Chrome o Safari), no desde acá adentro. Se copió el link:\n\n${url}`);
      }
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (/iphone|ipad|ipod/.test(ua) && isSafari) {
      setGuiaIOS(true);
    } else {
      alert('Para instalar:\n\n1. Abre el menú del navegador (⋯)\n2. Busca "Agregar a pantalla de inicio"\n3. Confirma la instalación');
    }
  };

  // Foto de la tienda lista para compartir (se prepara en segundo plano: en iPhone `navigator.share` solo funciona
  // pegado al toque del usuario y no admite esperar una descarga).
  const fotoCompartir = useRef<File | null>(null);
  useEffect(() => {
    const src = store.heroImage || store.logoImage;
    if (!src || typeof navigator === 'undefined' || !navigator.share || typeof navigator.canShare !== 'function') return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;   // solo celulares y tabletas
    let cancelado = false;
    const preparar = async () => {
      try {
        // La foto vive en otro dominio sin CORS: se pide por /api/img-proxy (mismo dominio) para poder leerla.
        const remota = /^https?:\/\//i.test(src) && new URL(src).origin !== window.location.origin;
        const r = await fetch(remota ? `/api/img-proxy?u=${encodeURIComponent(src)}` : src);
        if (!r.ok) return;
        const blob = await r.blob();
        const img = await new Promise<HTMLImageElement>((ok, fallo) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.onerror = fallo;
          i.src = URL.createObjectURL(blob);
        });
        // JPEG de hasta 900 px: liviano y lo aceptan todas las apps (WhatsApp en iPhone no maneja bien webp).
        const escala = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * escala);
        c.height = Math.round(img.naturalHeight * escala);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const jpeg: Blob | null = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.75));
        if (!jpeg || cancelado) return;
        const archivo = new File([jpeg], `${store.slug}.jpg`, { type: 'image/jpeg' });
        if (navigator.canShare({ files: [archivo] })) fotoCompartir.current = archivo;
      } catch { /* sin foto: se comparte solo el enlace, como antes */ }
    };
    const t = setTimeout(preparar, 2500);   // después de que la tienda ya cargó
    return () => { cancelado = true; clearTimeout(t); };
  }, [store.heroImage, store.logoImage, store.slug]);

  const compartir = () => {
    if (navigator.share) {
      const url = `${window.location.origin}${window.location.pathname}`;
      const foto = fotoCompartir.current;
      if (foto && navigator.canShare?.({ files: [foto] })) {
        // Con foto: la imagen de la tienda + nombre y enlace en el texto (así se ve la foto en cualquier app, incluida la
        // app instalada de iPhone, que solo mostraba "BogaHub").
        navigator.share({ files: [foto], title: store.name, text: `${store.name}${store.tagline ? ` — ${store.tagline}` : ''}\n${url}` }).catch(() => {});
      } else {
        navigator.share({ title: store.name, text: store.tagline, url }).catch(() => {});
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  // En iPhone, Chrome y Firefox tienen el botón Compartir ARRIBA (barra de direcciones); Safari y el
  // navegador integrado de otras apps lo tienen ABAJO. La guía apunta al lado que corresponde.
  const compartirArriba = typeof navigator !== 'undefined' && /CriOS|FxiOS/i.test(navigator.userAgent);

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
      {store.pushActivo && <StorePushBell slug={store.slug} nombre={store.name} color={t.primary} />}
      {store.mostrarUbicacion && store.latitud != null && store.longitud != null && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitud},${store.longitud}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-lg active:scale-90 hover:bg-white/60 transition-all"
          style={{ color: t.primary }}
          aria-label="Cómo llegar"
          title="Cómo llegar"
        >
          <span className="material-symbols-outlined text-[20px]">directions</span>
        </a>
      )}
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
      {guiaIOS && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center ${compartirArriba ? 'justify-start' : 'justify-end'} bg-black/55 backdrop-blur-[2px] px-5`}
          style={compartirArriba ? { paddingTop: 'max(12px, env(safe-area-inset-top))' } : { paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          onClick={() => setGuiaIOS(false)}
          role="dialog"
          aria-label="Cómo instalar la app"
        >
          {compartirArriba && (
            <div className="mb-3 flex flex-col items-center text-white animate-bounce" aria-hidden>
              <span className="material-symbols-outlined text-[36px] leading-none">arrow_upward</span>
              <span className="text-xs font-bold tracking-wide">Compartir está aquí arriba</span>
            </div>
          )}
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-extrabold text-neutral-900">Instala {store.name}</p>
            <p className="mt-1 text-xs text-neutral-500">Agrégala a tu pantalla de inicio en 3 toques</p>
            <ol className="mt-4 space-y-2.5 text-left text-sm text-neutral-800">
              <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">1</span><span>Toca el botón <b>Compartir</b> <svg className="inline-block align-[-3px] text-blue-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="símbolo de compartir"><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg> {compartirArriba ? 'de la barra de arriba, junto a la dirección' : 'de la barra de abajo'}</span></li>
              <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">2</span><span>Desliza y elige <b>&quot;Agregar a Inicio&quot;</b></span></li>
              <li className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">3</span><span>Toca <b>&quot;Agregar&quot;</b></span></li>
            </ol>
            <button
              onClick={() => setGuiaIOS(false)}
              className="mt-5 w-full rounded-2xl py-3 text-sm font-extrabold text-white active:scale-95 transition-transform"
              style={{ backgroundColor: t.primary }}
            >
              Entendido
            </button>
          </div>
          {!compartirArriba && (
            <div className="mt-3 flex flex-col items-center text-white animate-bounce" aria-hidden>
              <span className="text-xs font-bold tracking-wide">Compartir está aquí abajo</span>
              <span className="material-symbols-outlined text-[36px] leading-none">arrow_downward</span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
