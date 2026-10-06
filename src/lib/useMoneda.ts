'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getMonedaActiva, setMonedaActiva, suscribirMoneda, type Moneda } from '@/lib/monedas';

const clave = (slug: string) => `boga_moneda_${slug}`;

/** La moneda elegida ahora; hace que el componente se vuelva a pintar cuando cambia. */
export function useMonedaActiva(): Moneda | null {
  return useSyncExternalStore(suscribirMoneda, getMonedaActiva, () => null);
}

/**
 * Monedas de una tienda y la que el cliente tiene elegida. Se recuerda por tienda en el celular del cliente.
 * Sin monedas cargadas no hace nada (todo sigue en soles). Al salir de la tienda vuelve a soles.
 */
export function useMonedas(slug: string, monedas?: Moneda[]) {
  const lista = monedas ?? [];
  const llave = lista.map((m) => `${m.codigo}:${m.tasa}`).join(',');
  const activa = useMonedaActiva();

  useEffect(() => {
    let guardada: string | null = null;
    try { guardada = localStorage.getItem(clave(slug)); } catch { /* sin almacenamiento: queda en soles */ }
    setMonedaActiva(lista.find((m) => m.codigo === guardada) ?? null);
    return () => setMonedaActiva(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, llave]);

  const elegir = useCallback((codigo: string | null) => {
    setMonedaActiva(lista.find((m) => m.codigo === codigo) ?? null);
    try {
      if (codigo) localStorage.setItem(clave(slug), codigo);
      else localStorage.removeItem(clave(slug));
    } catch { /* ignorar */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, llave]);

  return { monedas: lista, activa, elegir };
}
