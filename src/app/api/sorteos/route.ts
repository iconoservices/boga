import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nombreCorto } from '@/lib/sorteoServer';

// Sorteos públicos (abiertos y ya sorteados) con el CONTADOR de tickets, en UN
// endpoint cacheado. Cuenta los tickets con la llave del servidor porque la tabla
// de tickets no es de lectura pública (lleva nombres y WhatsApp); aquí solo salen
// números y, del ganador, el nombre abreviado y el número de ticket.

export const revalidate = 60;

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: rifas, error } = await admin
    .from('raffles')
    .select('id,titulo,descripcion,img,patrocinador,como_participar,precio_ticket,meta_tickets,cierra_el,status,ganador_ticket_id,sorteado_el,orden,created_at')
    .in('status', ['abierto', 'sorteado'])
    .order('orden', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) console.error('[api/sorteos]', error.message);
  const lista = rifas ?? [];

  // Conteo de tickets por sorteo (una sola consulta, solo la columna raffle_id).
  const ids = lista.map((r) => r.id);
  const conteo: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: filas } = await admin.from('raffle_tickets').select('raffle_id').in('raffle_id', ids);
    (filas ?? []).forEach((f) => { conteo[f.raffle_id] = (conteo[f.raffle_id] || 0) + 1; });
  }

  // Ganadores (solo nombre abreviado + número).
  const idsGanadores = lista.map((r) => r.ganador_ticket_id).filter(Boolean) as string[];
  const ganadores: Record<string, { nombre: string; numero: number }> = {};
  if (idsGanadores.length > 0) {
    const { data: g } = await admin.from('raffle_tickets').select('id,numero,nombre').in('id', idsGanadores);
    (g ?? []).forEach((t) => { ganadores[t.id] = { nombre: nombreCorto(t.nombre), numero: t.numero }; });
  }

  const raffles = lista.map(({ ganador_ticket_id, orden, created_at, ...r }) => ({
    ...r,
    vendidos: conteo[r.id] || 0,
    ganador: ganador_ticket_id ? ganadores[ganador_ticket_id] : undefined,
  }));

  return NextResponse.json(
    { raffles },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
