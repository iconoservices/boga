'use client';

import React from 'react';
import Link from 'next/link';

// Encabezado común de Viajes: banner + botones por medio (Todos · Fluvial · Terrestre · Vuelos).
// Lo usan /viajes (los botones filtran ahí mismo) y /viajes/vuelos (los botones llevan de vuelta a
// /viajes). Así, al tocar "Vuelos" la dirección cambia pero se siente la misma pantalla: solo cambia
// el contenido de abajo, como cuando cambias de categoría.

export type MedioViaje = 'todos' | 'fluvial' | 'terrestre' | 'aereo';

const MEDIOS: { id: MedioViaje; label: string; icon: string }[] = [
  { id: 'todos',     label: 'Todos',     icon: 'travel_explore' },
  { id: 'fluvial',   label: 'Fluvial',   icon: 'directions_boat' },
  { id: 'terrestre', label: 'Terrestre', icon: 'directions_bus' },
  { id: 'aereo',     label: 'Vuelos',    icon: 'flight' },
];

const BASE = 'flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95';
const ACTIVO = 'bg-primary text-white border border-primary shadow-md';
const INACTIVO = 'bg-white border border-surface-container-highest text-secondary hover:shadow-md';

interface Props {
  activo: MedioViaje;
  titulo?: string;
  subtitulo?: string;
  /** Si viene, Todos/Fluvial/Terrestre filtran en la misma página (sin navegar). Si no, son enlaces a /viajes. */
  onSelect?: (m: MedioViaje) => void;
  /** Cantidad de rutas por medio; el número solo se muestra si es mayor que 0. */
  conteo?: Partial<Record<MedioViaje, number>>;
}

export default function ViajesCabecera({ activo, titulo, subtitulo, onSelect, conteo }: Props) {
  return (
    <>
      {/* Encabezado */}
      {titulo && (
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">{titulo}</h1>
          {subtitulo && <p className="font-body-md text-secondary text-xs">{subtitulo}</p>}
        </div>
      )}

      {/* Botones por medio */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
        {MEDIOS.map((m) => {
          const clase = `${BASE} ${activo === m.id ? ACTIVO : INACTIVO}`;
          const n = conteo?.[m.id];
          const contenido = (
            <>
              <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
              {m.label}
              {m.id !== 'todos' && m.id !== 'aereo' && typeof n === 'number' && n > 0 && (
                <span className="text-[10px] font-bold opacity-70">{n}</span>
              )}
            </>
          );

          // Vuelos siempre es su propia dirección.
          if (m.id === 'aereo') {
            return activo === 'aereo'
              ? <span key={m.id} className={clase} aria-current="page">{contenido}</span>
              : <Link key={m.id} href="/viajes/vuelos" className={clase}>{contenido}</Link>;
          }
          // Los otros filtran en /viajes; desde /viajes/vuelos llevan de vuelta ahí.
          if (onSelect) {
            return <button key={m.id} onClick={() => onSelect(m.id)} className={clase}>{contenido}</button>;
          }
          return (
            <Link key={m.id} href={m.id === 'todos' ? '/viajes' : `/viajes?medio=${m.id}`} className={clase}>
              {contenido}
            </Link>
          );
        })}
      </div>
    </>
  );
}
