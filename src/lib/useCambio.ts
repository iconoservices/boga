'use client';

import { useEffect, useState } from 'react';

export interface CambioDeHoy {
  /** Soles que vale 1 unidad de cada moneda: {"USD": 3.44}. */
  tasas: Record<string, number>;
  /** Cuándo actualizó la fuente su cotización (texto de la fuente). */
  fecha: string | null;
}

// Lo ya consultado en esta sesión del panel: abrir otro producto no vuelve a pedirla.
const memoria = new Map<string, CambioDeHoy>();

/**
 * Cotización del día de esas monedas (lib/monedas.ts). SOLO consulta cuando `activo` es true (el dueño tocó un campo de
 * precio en otra moneda o el botón "Traer cambio de hoy"), no cada vez que se abre un formulario. Si falla devuelve null y el
 * panel usa el cambio escrito a mano.
 */
export function useCambioDeHoy(codigos: string[], activo: boolean): CambioDeHoy | null {
  const llave = codigos.join(',');
  const [datos, setDatos] = useState<CambioDeHoy | null>(() => memoria.get(llave) ?? null);
  useEffect(() => {
    if (!activo || !llave) return;
    const guardado = memoria.get(llave);
    if (guardado) { setDatos(guardado); return; }
    let vivo = true;
    fetch(`/api/cambio?monedas=${encodeURIComponent(llave)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.tasas) return;
        const nuevo: CambioDeHoy = { tasas: d.tasas, fecha: d.fecha ?? null };
        memoria.set(llave, nuevo);
        if (vivo) setDatos(nuevo);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [llave, activo]);
  return datos;
}
