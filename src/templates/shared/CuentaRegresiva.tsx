'use client';

import React, { useEffect, useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';

/** Cuenta regresiva hasta el fin de una oferta (último día, hora de Perú). Se arma ya en el navegador (usa la hora actual). */
export default function CuentaRegresiva({ t, hasta }: { t: StoreConfig['theme']; hasta: string }) {
  const [resta, setResta] = useState<number | null>(null);
  useEffect(() => {
    const fin = new Date(`${hasta}T23:59:59-05:00`).getTime();
    const tick = () => setResta(Math.max(0, fin - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasta]);
  if (resta === null || resta <= 0) return null;
  const dias = Math.floor(resta / 86400000);
  const horas = Math.floor((resta % 86400000) / 3600000);
  const min = Math.floor((resta % 3600000) / 60000);
  const seg = Math.floor((resta % 60000) / 1000);
  const dos = (n: number) => String(n).padStart(2, '0');
  const partes: [string, string][] = [...(dias > 0 ? [[String(dias), 'd'] as [string, string]] : []), [dos(horas), 'h'], [dos(min), 'm'], [dos(seg), 's']];
  return (
    <div className="inline-flex items-center gap-2 rounded-full pl-2.5 pr-3 py-1 text-xs font-bold tabular-nums shadow-sm" style={{ background: t.secondary, color: '#fff' }} aria-label="Tiempo que queda de la oferta">
      <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
      <span className="font-semibold opacity-80">Termina en</span>
      <span className="flex items-baseline gap-1.5">
        {partes.map(([n, u]) => (
          <span key={u}>{n}<span className="text-[10px] font-medium opacity-70 ml-px">{u}</span></span>
        ))}
      </span>
    </div>
  );
}
