'use client';

import React, { useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { TXT, ICON } from './tokens';
import { textoLegible } from '@/lib/paleta';

// Piezas de pantalla que comparten las plantillas Bazar y Tecnología: la fila de tarjetas que se desliza de lado (con flechas en
// escritorio solo si desborda) y los botones de categoría (ícono en un circulito, fijos bajo el encabezado al bajar).

/** Fila que se desliza de lado. En escritorio lleva flechas, porque con el mouse no siempre se puede deslizar. */
export function FilaDeslizable({ t, children }: { t: StoreConfig['theme']; children: React.ReactNode }) {
  const caja = React.useRef<HTMLDivElement>(null);
  const [desborda, setDesborda] = useState(false);
  // La fila que se desliza es el primer hijo (ProductGrid en modo carrusel). Las flechas solo salen si hay más tarjetas de las que caben.
  const fila = () => caja.current?.firstElementChild as HTMLElement | null;
  React.useEffect(() => {
    const el = fila();
    if (!el) return;
    const medir = () => setDesborda(el.scrollWidth > el.clientWidth + 4);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);
  const mover = (dir: number) => fila()?.scrollBy({ left: dir * 340, behavior: 'smooth' });
  const flecha = (dir: number, icono: string, lado: string) => (
    <button
      type="button"
      onClick={() => mover(dir)}
      aria-label={dir < 0 ? 'Anterior' : 'Siguiente'}
      className={`hidden md:flex absolute top-1/3 ${lado} z-10 w-9 h-9 rounded-full items-center justify-center shadow-lg active:scale-95 transition-transform`}
      style={{ background: t.surface, color: t.primary, border: `1px solid ${t.outlineVariant}` }}
    >
      <span className="material-symbols-outlined text-[20px]">{icono}</span>
    </button>
  );
  return (
    <div className="relative">
      {desborda && flecha(-1, 'chevron_left', 'left-2')}
      <div ref={caja} className="px-5 md:px-6">{children}</div>
      {desborda && flecha(1, 'chevron_right', 'right-2')}
    </div>
  );
}

/** Categorías: botones pequeños con el ícono en un circulito. Quedan fijos bajo el encabezado al bajar, y se deslizan de lado si no caben. */
export function ChipsCategoria({ t, tabs, active, onSelect }: { t: StoreConfig['theme']; tabs: { id: string; label: string; icon?: string }[]; active: string; onSelect: (id: string) => void }) {
  return (
    <nav
      className="hide-scrollbar px-5 md:px-6 overflow-x-auto flex gap-2 whitespace-nowrap sticky top-16 md:top-[60px] py-3 z-40"
      style={{ background: `${t.background}F0`, backdropFilter: 'blur(12px)' }}
    >
      {tabs.map((tab) => {
        const activa = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className="group shrink-0 inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            style={{
              background: activa ? t.primary : t.primaryContainer,
              border: `1px solid ${activa ? 'transparent' : t.outlineVariant}`,
              boxShadow: activa ? `0 4px 12px ${t.primary}40` : 'none',
            }}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ background: activa ? t.onPrimary : t.primary, color: activa ? t.primary : t.onPrimary }}
            >
              <span className={`material-symbols-outlined ${ICON.sm}`}>{tab.icon || 'sell'}</span>
            </span>
            <span className={`${TXT.small} font-extrabold`} style={{ color: activa ? t.onPrimary : textoLegible(t.primaryContainer, t.onSurface), fontFamily: t.fontHeadline }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

