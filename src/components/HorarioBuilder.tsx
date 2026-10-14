'use client';

import React, { useState } from 'react';

// Constructor de "Horario de atención": arma el texto (ej. "Lun a Vie: 9:00 am – 6:00 pm") a partir de los días marcados y la hora
// elegida. En la base `horario` sigue siendo un texto libre. Mismo diseño que el del panel del dueño (/admin).
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatHora12(hhmm: string): string {
  const [hStr, m] = hhmm.split(':');
  let h = parseInt(hStr, 10) % 24;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDias(seleccionados: string[]): string {
  const idx = DIAS_SEMANA.map((d, i) => (seleccionados.includes(d) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return '';
  if (idx.length === 7) return 'Todos los días';
  const grupos: number[][] = [];
  let actual: number[] = [idx[0]];
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] === idx[i - 1] + 1) actual.push(idx[i]);
    else { grupos.push(actual); actual = [idx[i]]; }
  }
  grupos.push(actual);
  const partes = grupos.map((g) =>
    g.length === 1 ? DIAS_SEMANA[g[0]]
    : g.length === 2 ? `${DIAS_SEMANA[g[0]]} y ${DIAS_SEMANA[g[1]]}`
    : `${DIAS_SEMANA[g[0]]} a ${DIAS_SEMANA[g[g.length - 1]]}`,
  );
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

const formatearBloque = (dias: string[], desde: string, hasta: string) => {
  const d = formatDias(dias);
  return d ? `${d}: ${formatHora12(desde)} – ${formatHora12(hasta)}` : '';
};

type Bloque = { dias: string[]; desde: string; hasta: string };
const BLOQUE_VACIO: Bloque = { dias: [], desde: '09:00', hasta: '18:00' };

export default function HorarioBuilder({ value, onChange }: { value: string; onChange: (texto: string) => void }) {
  const [bloques, setBloques] = useState<Bloque[]>([BLOQUE_VACIO]);

  // Un mismo día no puede estar en dos bloques a la vez (¿cuál horario valdría?).
  const actualizar = (nuevos: Bloque[]) => {
    setBloques(nuevos);
    const texto = nuevos.map((b) => formatearBloque(b.dias, b.desde, b.hasta)).filter(Boolean).join(' · ');
    onChange(texto || value);
  };

  return (
    <div className="space-y-2">
      {bloques.map((bloque, idx) => {
        const usadosEnOtros = new Set(bloques.flatMap((b, j) => (j === idx ? [] : b.dias)));
        return (
          <div key={idx} className="p-3 bg-[#f8fafc] border border-[#ecedf7] rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((dia) => {
                  const activo = bloque.dias.includes(dia);
                  const usado = usadosEnOtros.has(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      disabled={usado}
                      onClick={() => actualizar(bloques.map((b, j) => (j === idx ? { ...b, dias: activo ? b.dias.filter((d) => d !== dia) : [...b.dias, dia] } : b)))}
                      className={`w-9 h-8 rounded-lg text-[11px] font-bold transition-colors ${
                        usado ? 'bg-[#f2f3fd] text-[#c2c6d6] cursor-not-allowed' : activo ? 'bg-[#0058be] text-white' : 'bg-white border border-[#c2c6d6]/70 text-[#424754] hover:bg-[#f2f3fd]'
                      }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
              {bloques.length > 1 && (
                <button
                  type="button"
                  onClick={() => actualizar(bloques.filter((_, j) => j !== idx))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#727785] hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  aria-label="Quitar este horario"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={bloque.desde}
                onChange={(e) => actualizar(bloques.map((b, j) => (j === idx ? { ...b, desde: e.target.value } : b)))}
                className="flex-1 bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
              />
              <span className="text-[10px] font-bold text-[#727785] shrink-0">a</span>
              <input
                type="time"
                value={bloque.hasta}
                onChange={(e) => actualizar(bloques.map((b, j) => (j === idx ? { ...b, hasta: e.target.value } : b)))}
                className="flex-1 bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
              />
            </div>
          </div>
        );
      })}
      {bloques.some((b) => b.dias.length) && bloques.length < 7 && (
        <button type="button" onClick={() => setBloques([...bloques, { ...BLOQUE_VACIO }])} className="text-[11px] font-bold text-[#0058be] hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">add</span>
          Agregar otro horario (ej. fin de semana distinto)
        </button>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#f8fafc] border border-[#ecedf7] rounded-md px-4 py-2.5 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be] transition-all"
        placeholder="Ej: Lun a Dom, 12pm - 11pm"
      />
      <p className="text-[10px] text-[#727785] font-semibold">Marca los días y la hora, o escribe el texto tal como quieres que se vea.</p>
    </div>
  );
}
