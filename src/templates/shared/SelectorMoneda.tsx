'use client';

import React from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { useMonedas } from '@/lib/useMoneda';

/**
 * Selector chico de moneda: `S/ · US$ · MX$`. Solo sale si la tienda activó otras monedas (y vende con precio).
 * Los precios se guardan en soles; elegir otra moneda solo los muestra convertidos con "≈". El pedido va en soles.
 */
export default function SelectorMoneda({ store, compacto = false }: { store: StoreConfig; compacto?: boolean }) {
  const t = store.theme;
  const { monedas, activa, elegir } = useMonedas(store.slug, store.monedas);
  // Empresas y distribuidoras de gas no muestran precios: ahí no hay nada que convertir.
  if (monedas.length === 0 || store.template === 'gas' || store.template === 'empresa') return null;

  const opciones = [{ codigo: null as string | null, simbolo: 'S/' }, ...monedas.map((m) => ({ codigo: m.codigo as string | null, simbolo: m.simbolo }))];

  return (
    <div
      role="group"
      aria-label="Moneda de los precios"
      className="inline-flex items-center rounded-full p-0.5 shrink-0"
      style={{ background: `${t.primary}15`, border: `1px solid ${t.primary}25` }}
    >
      {opciones.map((o) => {
        const esta = (activa?.codigo ?? null) === o.codigo;
        return (
          <button
            key={o.codigo ?? 'PEN'}
            type="button"
            onClick={() => elegir(o.codigo)}
            aria-pressed={esta}
            className={`rounded-full font-extrabold transition-all active:scale-95 ${compacto ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
            style={esta ? { background: t.primary, color: t.onPrimary } : { color: t.primary }}
          >
            {o.simbolo}
          </button>
        );
      })}
    </div>
  );
}
