'use client';

import { useEffect, useState } from 'react';

export interface CambioDeHoy {
  /** Soles que vale 1 unidad de cada moneda: {"USD": 3.44}. */
  tasas: Record<string, number>;
  /** Cuándo actualizó la fuente su cotización (texto de la fuente). */
  fecha: string | null;
}

/** Cotización del día de esas monedas (lib/monedas.ts). Sin lista no consulta; si falla devuelve null y el panel usa el cambio manual. */
export function useCambioDeHoy(codigos: string[]): CambioDeHoy | null {
  const llave = codigos.join(',');
  const [datos, setDatos] = useState<CambioDeHoy | null>(null);
  useEffect(() => {
    if (!llave) return;
    let vivo = true;
    fetch(`/api/cambio?monedas=${encodeURIComponent(llave)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.tasas) setDatos({ tasas: d.tasas, fecha: d.fecha ?? null }); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [llave]);
  return datos;
}
