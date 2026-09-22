"use client";

import React, { useRef } from 'react';
import { type Sorteo } from '@/lib/sorteos';
import { hoyLima } from '@/lib/fechaLima';

// Tarjetas y carrusel de sorteos, compartidos por /sorteos y el inicio. Mismo formato que
// "Lo que se pide en Market": tarjetas blancas de tamaño fijo, foto cuadrada arriba, y la
// siguiente tarjeta se asoma al costado. Los datos son SIEMPRE los reales de /api/sorteos.

export const LIMA = '#c9f24a';
const WHATSAPP_BOGAHUB = '51961000000';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function fechaCorta(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d} ${MESES[m - 1]}` : '';
}

// Días que faltan hasta una fecha AAAA-MM-DD (hora de Perú). null si no hay fecha.
function diasHasta(iso?: string): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const [hy, hm, hd] = hoyLima().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(hy, hm - 1, hd)) / 86400000);
}

function waParticipar(titulo: string) {
  const texto = `Hola BogaHub, quiero participar en el sorteo «${titulo}».`;
  return `https://wa.me/${WHATSAPP_BOGAHUB}?text=${encodeURIComponent(texto)}`;
}

const MORADO = '#7c3aed';

export function Barra({ vendidos, meta, fechaSorteo, grande = false, claro = false }: { vendidos: number; meta: number | null; fechaSorteo?: string; grande?: boolean; claro?: boolean }) {
  const texto = claro ? 'text-secondary' : 'text-white/70';
  const fuerte = claro ? 'text-on-surface' : 'text-white';
  const acento = claro ? MORADO : LIMA;
  // Sin meta = sorteo por fecha: no hay contador de tickets, solo la cuenta regresiva.
  if (!meta) {
    const dias = diasHasta(fechaSorteo);
    return (
      <div className={`flex items-center gap-1.5 font-label-md ${texto} ${grande ? 'text-xs' : 'text-[11px]'}`}>
        <span className="material-symbols-outlined text-[16px]" style={{ color: acento }}>event</span>
        <span>
          Se sortea el <b className={fuerte}>{fechaCorta(fechaSorteo)}</b>
          {dias !== null && (dias <= 0 ? ' · ¡hoy!' : dias === 1 ? ' · ¡mañana!' : ` · faltan ${dias} días`)}
        </span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((vendidos / meta) * 100));
  const faltan = Math.max(0, meta - vendidos);
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${grande ? 'h-3' : 'h-2'} rounded-full ${claro ? 'bg-[#ede9fe]' : 'bg-white/15'} overflow-hidden`}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: acento }} />
      </div>
      <div className={`flex items-center justify-between font-label-md ${texto}`}>
        <span className={grande ? 'text-xs' : 'text-[11px]'}><b className={fuerte}>{vendidos}</b> de {meta} tickets</span>
        <span className={grande ? 'text-xs' : 'text-[11px]'} style={{ color: acento }}>
          {faltan === 0 ? '¡Lleno!' : faltan <= Math.max(3, Math.round(meta * 0.1)) ? `¡Faltan solo ${faltan}!` : `${pct}%`}
        </span>
      </div>
    </div>
  );
}

function formatoTicket(precio?: string): string {
  if (!precio) return '';
  const p = precio.trim();
  if (/^s\/?\.?\s*/i.test(p)) {
    const num = p.replace(/^s\/?\.?\s*/i, '').trim();
    return `Ticket: S/ ${num}`;
  }
  if (!isNaN(Number(p))) return `Ticket: S/ ${p}`;
  return `Ticket: ${p}`;
}

// Tarjeta de sorteo: mismo formato que las tarjetas del inicio (tamaño fijo, foto arriba).
function TarjetaSorteo({ s }: { s: Sorteo }) {
  return (
    <article className="group snap-start shrink-0 w-[168px] sm:w-[186px] lg:w-[204px] bg-[#4f2d8c] text-white border border-white/15 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="aspect-square bg-gradient-to-br from-[#5b21b6] to-[#312e81] overflow-hidden relative">
        {s.img
          ? <img src={s.img} alt={s.titulo} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center text-white/30"><span className="material-symbols-outlined text-[48px]">casino</span></div>}
        <span className="absolute top-2 left-2 bg-black/55 backdrop-blur-sm text-white text-[9px] font-label-md uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[11px]">casino</span>Sorteo
        </span>
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        {s.patrocinador && (
          <span className="w-fit max-w-full truncate text-[9px] font-label-md uppercase tracking-wide px-2 py-0.5 rounded-full text-[#2a1155]" style={{ backgroundColor: LIMA }}>
            Patrocina {s.patrocinador}
          </span>
        )}
        <h3 className="font-headline-sm text-[13px] leading-tight line-clamp-2 mt-0.5">{s.titulo}</h3>
        {s.precioTicket && <span className="font-price-lg text-sm" style={{ color: LIMA }}>{formatoTicket(s.precioTicket)}</span>}
        <div className="mt-1.5"><Barra vendidos={s.vendidos} meta={s.meta} fechaSorteo={s.cierraEl} /></div>
        {s.comoParticipar && <p className="text-white/65 font-body-md text-[10px] leading-snug line-clamp-2 mt-1">{s.comoParticipar}</p>}
        <a href={waParticipar(s.titulo)} target="_blank" rel="noopener noreferrer" className="mt-auto pt-2">
          <span className="flex items-center justify-center gap-1 font-headline-sm text-[12px] text-[#2a1155] py-2 rounded-full active:scale-95 transition-transform" style={{ backgroundColor: LIMA }}>
            ¡Quiero participar!
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </a>
      </div>
    </article>
  );
}

// Carrusel como el de las tarjetas del inicio: tarjetas de tamaño fijo en una fila que
// se desliza (la siguiente se asoma al costado). En pantalla grande hay flechas.
export function CarruselSorteos({ items }: { items: Sorteo[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const mover = (dir: 1 | -1) => pista.current?.scrollBy({ left: dir * 216, behavior: 'smooth' });

  return (
    <div className="relative">
      <div
        ref={pista}
        className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x scroll-pl-container-margin lg:scroll-pl-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((s) => <TarjetaSorteo key={s.id} s={s} />)}
      </div>
      {items.length > 3 && (
        <>
          <button type="button" aria-label="Anterior" onClick={() => mover(-1)} className="hidden lg:flex absolute -left-4 top-[85px] w-9 h-9 rounded-full bg-white/90 text-[#3a1a6e] items-center justify-center shadow-lg active:scale-90 transition">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => mover(1)} className="hidden lg:flex absolute -right-4 top-[85px] w-9 h-9 rounded-full bg-white/90 text-[#3a1a6e] items-center justify-center shadow-lg active:scale-90 transition">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      )}
    </div>
  );
}

