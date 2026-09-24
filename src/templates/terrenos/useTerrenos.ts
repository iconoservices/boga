'use client';

import { useMemo, useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import { useCatalogo } from '../shared/useCatalogo';
import { soles, type Producto } from '../shared/tokens';

/** Área si el nombre o la descripción la traen ("200 m²", "1 hectárea"); si no, null. */
export function areaDe(p: Producto): string | null {
  if (p.extra?.area?.trim()) return p.extra.area.trim();
  const m = `${p.name} ${p.desc}`.match(/(\d[\d.,]*)\s*(m²|m2|ha\b|hect[aá]reas?)/i);
  if (!m) return null;
  const unidad = /^m/i.test(m[2]) ? 'm²' : /^h/i.test(m[2]) && m[1] === '1' ? 'hectárea' : 'hectáreas';
  return `${m[1]} ${unidad}`;
}

// Ubicación del terreno. Si quien publica pega un link de Google Maps en la descripción, se usa
// ese (la ubicación exacta); si no, se busca la zona en Maps (el nombre del terreno metería ruido en la búsqueda). El link no se muestra
// dentro del texto de la descripción.
const RE_LINK_MAPA = /https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s)]*/i;

/** Descripción sin el link de mapa (para mostrarla en la tarjeta). */
export const descripcionLimpia = (p: Producto) => p.desc.replace(RE_LINK_MAPA, '').replace(/\s{2,}/g, ' ').trim();

/** "S/ 45,000": sin decimales, como se publican los terrenos. */
export const precioTerreno = (n: number) => `S/ ${Math.round(n).toLocaleString('en-US')}`;

/**
 * Motor común de las dos plantillas de terrenos (Terreno 1 y Terreno 2). Cada terreno es un "producto" del catálogo y la categoría es la zona.
 * No hay carrito: en un terreno no se agrega y paga, se consulta. Por eso el
 * botón de cada tarjeta abre WhatsApp con el terreno ya nombrado.
 */
export function useTerrenos(store: StoreConfig) {
  const c = useCatalogo(store);
  const [busqueda, setBusqueda] = useState('');
  const [zona, setZona] = useState('all');

  const zonas = c.categoriasEfectivas;

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return c.products.filter(
      (p) =>
        (zona === 'all' || p.category === zona) &&
        (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)),
    );
  }, [c.products, busqueda, zona]);

  const nombreDeZona = (id: string) => zonas.find((z) => z.id === id)?.label ?? '';

  /** Link para ver el terreno en Google Maps: el exacto si lo publicaron, o la búsqueda por zona. */
  const ubicacionUrl = (p: Producto) => {
    const exacto = p.desc.match(RE_LINK_MAPA)?.[0];
    if (exacto) return exacto;
    const consulta = `${nombreDeZona(p.category)} ${store.zona || ''}`.replace(/\s+/g, ' ').trim();
    return `https://www.google.com/maps/search/${encodeURIComponent(consulta)}`;
  };

  const consultar = (p?: Producto) => {
    const mensaje = p
      ? `Hola ${store.name}, me interesa el terreno "${p.name}" (${soles(p.price)}). ¿Sigue disponible? ¿Me das más información?`
      : `Hola ${store.name}, estoy buscando un terreno. ¿Qué opciones tienen disponibles?`;
    enviarPedidoPorWhatsApp(store, mensaje);
  };

  return { ...c, busqueda, setBusqueda, zona, setZona, zonas, resultados, nombreDeZona, consultar, ubicacionUrl };
}
