'use client';

// Editor de presentaciones (100 g / 250 g / 1 kg…) para el formulario de productos del superadmin.
// El del panel del dueño (/admin) tiene el mismo comportamiento con su propio estilo. Ver lib/presentaciones.ts.

import { useState } from 'react';
import { presentacionesSugeridas, textosPresentacion, type FilaPresentacion } from '@/lib/presentaciones';

export default function PresentacionesEditor({
  filas, onChange, ayuda, categoria, template, precioBase,
}: {
  filas: FilaPresentacion[];
  onChange: (filas: FilaPresentacion[]) => void;
  ayuda?: string;
  categoria?: string;
  template?: string;
  precioBase?: string;
}) {
  const info = textosPresentacion(categoria, template);
  // Fila recién agregada: el cursor cae en lo que falta por escribir (el precio, o el nombre en "+ Otra").
  const [foco, setFoco] = useState<{ i: number; campo: 'label' | 'price' } | null>(null);
  const agregar = (label: string) => {
    setFoco({ i: filas.length, campo: label ? 'price' : 'label' });
    const precioSugerido = precioBase || (filas[0]?.price ?? '');
    onChange([...filas, { label, price: precioSugerido }]);
  };
  const cambiar = (i: number, campo: keyof FilaPresentacion, valor: string) =>
    onChange(filas.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const usadas = new Set(filas.map((f) => f.label.trim().toLowerCase()));
  const precios = filas.map((f) => parseFloat(f.price)).filter((n) => n > 0);

  return (
    <div className="rounded-lg border border-dashed border-[#c2c6d6] bg-[#f8fafc] p-3 space-y-2">
      <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-[#727785]">{info.icono}</span>
        {info.titulo.replace(' (opcional)', '')}
      </p>
      <p className="text-[10px] text-[#727785] font-semibold">{ayuda || info.subtitulo}</p>

      {filas.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={f.label}
            maxLength={30}
            onChange={(e) => cambiar(i, 'label', e.target.value)}
            autoFocus={foco?.i === i && foco.campo === 'label'}
            placeholder={info.ejemploLabel}
            className="flex-1 min-w-0 bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
          />
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#727785]">S/</span>
            <input
              type="number" min={0} step={0.1}
              value={f.price}
              onChange={(e) => cambiar(i, 'price', e.target.value)}
              autoFocus={foco?.i === i && foco.campo === 'price'}
              placeholder="0.00"
              className="w-full bg-white border border-[#ecedf7] rounded-md pl-7 pr-2 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
            />
          </div>
          <button
            type="button"
            aria-label="Quitar presentación"
            onClick={() => onChange(filas.filter((_, j) => j !== i))}
            className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-[#727785] hover:text-[#dc2626] hover:bg-[#fef2f2]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5">
        {presentacionesSugeridas(categoria, template).filter((l) => !usadas.has(l.toLowerCase())).map((l) => (
          <button
            key={l} type="button"
            onClick={() => agregar(l)}
            className="px-2.5 py-1 rounded-full bg-white border border-[#ecedf7] text-[10px] font-bold text-[#424754] hover:border-[#0058be]"
          >
            + {l}
          </button>
        ))}
        <button
          type="button"
          onClick={() => agregar('')}
          className="px-2.5 py-1 rounded-full bg-white border border-[#ecedf7] text-[10px] font-bold text-[#424754] hover:border-[#0058be]"
        >
          + Otra
        </button>
      </div>

      {filas.length > 0 && (
        <p className="text-[10px] font-semibold text-[#545f73]">
          El cliente verá «Desde S/ {precios.length ? Math.min(...precios).toFixed(2) : '0.00'}» y elegirá la medida al pedir.
        </p>
      )}
    </div>
  );
}
