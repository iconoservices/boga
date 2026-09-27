'use client';

// Las tiendas con subdominio propio (<tienda>.bogahub.app) se abren en SU dirección, fuera de BogaHub (target="_blank"):
// así se diferencian de las que solo tienen ruta y se pueden instalar como app propia (ver lib/tiendaUrl.ts).
//
// Problema: en el iPhone, dentro de la app instalada y en Chrome/Firefox, un enlace con target="_blank" a otro dominio a veces
// no abre nada. Ahí se abre la tienda en la MISMA ventana. Safari y el escritorio siguen con la pestaña nueva de siempre.
// Solo se toca esto (direcciones propias de tiendas); los demás enlaces externos (WhatsApp, mapas…) no cambian.

import { useEffect } from 'react';

export default function AbrirTiendasPropias() {
  useEffect(() => {
    const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').host;

    const necesitaMismaVentana = () => {
      const ua = navigator.userAgent;
      const enApp = !!(navigator as unknown as { standalone?: boolean }).standalone || window.matchMedia('(display-mode: standalone)').matches;
      return enApp || /CriOS|FxiOS|EdgiOS/i.test(ua);
    };

    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[target="_blank"]') as HTMLAnchorElement | null;
      if (!a?.href) return;
      let u: URL;
      try { u = new URL(a.href); } catch { return; }
      if (u.origin === window.location.origin || !u.host.endsWith('.' + base)) return;   // solo <tienda>.bogahub.app
      if (!necesitaMismaVentana()) return;
      e.preventDefault();
      window.location.assign(a.href);
    };

    document.addEventListener('click', alTocar, true);
    return () => document.removeEventListener('click', alTocar, true);
  }, []);

  return null;
}
