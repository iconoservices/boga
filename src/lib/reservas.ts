// Reservas de servicios (ver src/app/api/reservas/route.ts y /admin/reservas).
//
// Horas fijas por ahora (una silla: una reserva por hora). Cuando haya horario por tienda,
// solo cambia esta lista.

export const HORAS_RESERVA = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'] as const;

/** "13:00" → "1:00 PM" */
export function horaLegible(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  return `${h % 12 === 0 ? 12 : h % 12}:${hhmm.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`;
}

export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'atendida';

// Código corto sin letras que se confunden, para que la clienta lo dicte por WhatsApp.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generarCodigoReserva(largo = 6): string {
  const b = new Uint8Array(largo);
  crypto.getRandomValues(b);
  return Array.from(b, (n) => ALFABETO[n % ALFABETO.length]).join('');
}
