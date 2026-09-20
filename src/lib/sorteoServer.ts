import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// SOLO servidor. Elige el ganador de un sorteo al azar y lo guarda.
//
// - Solo sortea si el sorteo está 'abierto' (nunca dos veces).
// - El azar sale de crypto.randomInt (no de Math.random) sobre la lista de tickets.
// - El resultado queda guardado (ticket ganador + fecha): nadie lo puede escoger.

export type ResultadoSorteo =
  | { ok: true; numero: number; nombre: string }
  | { ok: false; error: string };

export async function sortear(admin: SupabaseClient, raffleId: string): Promise<ResultadoSorteo> {
  const { data: rifa, error: e1 } = await admin.from('raffles').select('id,status').eq('id', raffleId).single();
  if (e1 || !rifa) return { ok: false, error: 'No se encontró el sorteo' };
  if (rifa.status !== 'abierto') return { ok: false, error: 'Este sorteo no está abierto (ya se sorteó o está en borrador)' };

  const { data: tickets, error: e2 } = await admin
    .from('raffle_tickets').select('id,numero,nombre').eq('raffle_id', raffleId).order('numero', { ascending: true });
  if (e2) return { ok: false, error: e2.message };
  if (!tickets || tickets.length === 0) return { ok: false, error: 'No hay tickets para sortear' };

  const ganador = tickets[randomInt(0, tickets.length)];

  // Solo pasa de 'abierto' a 'sorteado' una vez (si otra petición ganó la carrera, no actualiza nada).
  const { data: actualizado, error: e3 } = await admin
    .from('raffles')
    .update({ status: 'sorteado', ganador_ticket_id: ganador.id, sorteado_el: new Date().toISOString() })
    .eq('id', raffleId)
    .eq('status', 'abierto')
    .select('id');
  if (e3) return { ok: false, error: e3.message };
  if (!actualizado || actualizado.length === 0) return { ok: false, error: 'El sorteo ya se había realizado' };

  return { ok: true, numero: ganador.numero, nombre: ganador.nombre };
}

/** "maría quispe ramos" -> "María R." (nombre + inicial del último apellido) */
export function nombreCorto(raw: string): string {
  const w = (raw || '').trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return 'Ganador';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return w.length === 1 ? cap(w[0]) : `${cap(w[0])} ${w[w.length - 1].charAt(0).toUpperCase()}.`;
}
