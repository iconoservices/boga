// Fechas en hora de Perú (America/Lima, UTC-5, sin horario de verano).
//
// El servidor y Supabase guardan las horas en UTC, que en Perú va 5 horas
// adelantada: a las 7 p. m. en Pucallpa ya es "mañana" en UTC. Por eso comparar o
// cortar con `toISOString().slice(0, 10)` da el día equivocado por las noches.
// Estas funciones devuelven siempre AAAA-MM-DD según el reloj de Perú.

const ZONA = 'America/Lima';

/** Fecha de un instante (Date, ISO o timestamp) en hora de Perú: "2026-09-19". */
export function fechaLima(instante: Date | string | number = new Date()): string {
  const d = instante instanceof Date ? instante : new Date(instante);
  if (Number.isNaN(d.getTime())) return '';
  // en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Hoy en hora de Perú. */
export const hoyLima = () => fechaLima(new Date());

/** Hoy + N días, en hora de Perú. */
export function hoyLimaMas(dias: number): string {
  const [y, m, d] = hoyLima().split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
