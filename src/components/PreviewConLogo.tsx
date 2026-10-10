'use client';

// Vista previa de una plantilla (/preview/<id>). Con ?mi=1 la muestra "como se vería tu tienda": usa el logo y el
// nombre que el visitante dejó en la ficha del producto (se guardan solo en su navegador, en sessionStorage; no se
// suben a ningún lado) y toma los colores del logo. Sin ?mi=1 es la demo de siempre.

import React, { useEffect, useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { extractThemeFromImageClient } from '@/lib/extractThemeClient';
import StoreRenderer from '@/app/[slug]/StoreRenderer';

export const CLAVE_PREVIEW_MI_TIENDA = 'boga:preview-mi-tienda';

// Portada hecha con el logo cuando el visitante no subió banner: el logo ENTERO y centrado sobre un fondo suave con los
// colores del logo (si se usara el logo como foto de portada, las plantillas lo recortan).
function portadaConLogo(logo: string, tema: StoreConfig['theme']): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = 1400, H = 560;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d')!;
      const fondo = g.createLinearGradient(0, 0, W, H);
      fondo.addColorStop(0, tema.background);
      fondo.addColorStop(1, tema.primaryContainer);
      g.fillStyle = fondo;
      g.fillRect(0, 0, W, H);
      const k = Math.min((W * 0.6) / img.width, (H * 0.68) / img.height);
      const w = img.width * k, h = img.height * k;
      g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(logo);
    img.src = logo;
  });
}

export default function PreviewConLogo({ store }: { store: StoreConfig }) {
  const [propia, setPropia] = useState<StoreConfig>(store);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mi') !== '1') return;
    let datos: { logo?: string; nombre?: string; banner?: string | null } | null = null;
    try { datos = JSON.parse(sessionStorage.getItem(CLAVE_PREVIEW_MI_TIENDA) || 'null'); } catch {}
    if (!datos?.logo) return;
    let vigente = true;
    (async () => {
      const tema = await extractThemeFromImageClient(datos!.logo!);
      if (!vigente) return;
      const temaFinal = tema ? { ...tema, fontHeadline: store.theme.fontHeadline, fontBody: store.theme.fontBody, fontLabel: store.theme.fontLabel } : store.theme;
      const portada = datos!.banner || await portadaConLogo(datos!.logo!, temaFinal);
      if (!vigente) return;
      setPropia({
        ...store,
        name: datos!.nombre?.trim() || store.name,
        logoImage: datos!.logo,
        // Portada: su banner; si no subió, su logo.
        heroImage: portada,
        heroAlt: datos!.nombre?.trim() || store.heroAlt,
        // Colores del logo; las tipografías siguen siendo las de la plantilla.
        theme: temaFinal,
        // El lema de la demo («Plantilla … /preview/…») no tiene sentido en la tienda de prueba.
        tagline: 'Así se vería tu tienda en BogaHub',
      });
    })();
    return () => { vigente = false; };
  }, [store]);

  return <StoreRenderer store={propia} />;
}
