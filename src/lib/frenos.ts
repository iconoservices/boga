// Frenos contra el spam y contra adivinar PINs/códigos, COMPARTIDOS entre todas las instancias del servidor (solo servidor).
//
// Los frenos en memoria (excedeLimite de lib/transporteServidor.ts) viven en cada instancia de Vercel: con tráfico
// se abren varias y cada una tiene su propia cuenta, así que alguien insistente se los saltaba. Estos se cuentan en
// la base (función public.frenar de supabase_seguridad.sql). Si ese SQL todavía no se corrió, o la base no responde,
// caen al freno en memoria: nunca dejan a un cliente sin poder pedir por culpa del freno.
//
// Para lo que se consulta cada pocos segundos (la app del chofer, el estado de un taxi) se sigue usando el de memoria:
// una consulta a la base por cada refresco sería gasto de más.

import { clienteServicio } from '@/lib/pushServidor';

const memoria = new Map<string, { n: number; desde: number }>();
function enMemoria(clave: string, max: number, ventanaMs: number, sumar: boolean): boolean {
  const ahora = Date.now();
  let v = memoria.get(clave);
  if (!v || ahora - v.desde > ventanaMs) {
    if (!sumar) return false;
    v = { n: 0, desde: ahora };
    memoria.set(clave, v);
  }
  if (!sumar) return v.n >= max;
  v.n += 1;
  return v.n > max;
}

/**
 * Suma un intento a `clave` y dice si ya pasó de `max` en la ventana. Con `sumar = false` solo mira, sin sumar
 * (para "¿está bloqueado?" antes de revisar un PIN, y sumar solo los fallos).
 */
export async function frenar(clave: string, max: number, ventanaMs: number, sumar = true): Promise<boolean> {
  const db = clienteServicio();
  if (db) {
    const { data, error } = await db.rpc('frenar', { p_clave: clave.slice(0, 200), p_max: max, p_ventana_seg: Math.round(ventanaMs / 1000), p_sumar: sumar });
    if (!error && typeof data === 'boolean') return data;
  }
  return enMemoria(clave, max, ventanaMs, sumar);
}
