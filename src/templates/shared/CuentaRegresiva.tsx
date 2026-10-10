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
  const partes: [string, string][] = [...(dias > 0 ? [[String(dias), 'Día' + (dias === 1 ? '' : 's')] as [string, string]] : []), [dos(horas), 'Hra'], [dos(min), 'Min'], [dos(seg), 'Seg']];
  return (
    <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums" style={{ background: t.secondary, color: '#fff' }} aria-label="Tiempo que queda de la oferta">
      {partes.map(([n, u], i) => (
        <React.Fragment key={u}>
          {i > 0 && <span className="opacity-60">:</span>}
          <span>{n} <span className="font-medium opacity-70">{u}</span></span>
        </React.Fragment>
      ))}
    </div>
  );
}
