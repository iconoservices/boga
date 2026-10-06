'use client';

import type { StoreConfig } from '@/lib/stores.config';
import { areaDe, precioTerreno, descripcionLimpia } from './useTerrenos';
import type { Producto } from '../shared/tokens';
import OtrosPrecios from '../shared/OtrosPrecios';

interface Props {
  store: StoreConfig;
  terreno: Producto;
  nombreDeZona: (id: string) => string;
  ubicacionUrl: (p: Producto) => string;
  onConsultar: () => void;
  onClose: () => void;
}

/**
 * Ficha completa de un terreno: la tarjeta del listado corta la descripción a
 * 2 líneas, así que esto es lo que se abre para ver todo el texto (medidas,
 * papeles, referencias) sin cortar. Comparte diseño entre Terreno 1 y Terreno 2.
 */
export default function DetalleTerreno({ store, terreno: p, nombreDeZona, ubicacionUrl, onConsultar, onClose }: Props) {
  const t = store.theme;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.surface }}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center z-10 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="aspect-[4/3]">
            <img className="w-full h-full object-cover" alt={p.name} src={p.image} />
          </div>
          {areaDe(p) && (
            <span className="absolute bottom-3 right-3 rounded-xl px-3.5 py-2 text-xs font-extrabold" style={{ background: t.onSurface, color: t.surface }}>
              {areaDe(p)}
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: t.primary }}>{nombreDeZona(p.category) || 'Terreno'}</span>
          <h2 className="text-xl font-black leading-tight" style={{ color: t.onSurface }}>{p.name}</h2>
          <div>
            <p className="text-2xl font-black" style={{ color: t.primary }}>{precioTerreno(p.price)}</p>
            <OtrosPrecios precios={p.preciosMoneda} className="text-base" style={{ color: t.onSurfaceVariant }} />
          </div>

          {descripcionLimpia(p) && (
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: t.onSurfaceVariant }}>{descripcionLimpia(p)}</p>
          )}

          <a
            href={ubicacionUrl(p)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline w-fit"
            style={{ color: t.primary }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            Ver ubicación en el mapa
          </a>

          <button
            onClick={onConsultar}
            className="mt-2 w-full rounded-full py-3.5 text-sm font-extrabold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
            style={{ background: t.primary, color: t.onPrimary }}
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Consultar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
