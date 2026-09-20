import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nombreCorto, sortear } from '@/lib/sorteoServer';
import { hoyLima } from '@/lib/fechaLima';

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

  // Sorteos POR FECHA (sin meta de tickets): el día indicado se sortean solos. No hay
  // reloj/cron en este proyecto, así que se revisa aquí, la primera vez que se abre la
  // página ese día (la copia de esta respuesta dura 60 s). Solo sortea si ya hay tickets
  // y solo una vez (sortear() exige que siga 'abierto').
  const hoy = hoyLima();
  let huboSorteo = false;
  for (const r of lista) {
    if (r.status === 'abierto' && !r.meta_tickets && r.cierra_el && r.cierra_el <= hoy) {
      const res = await sortear(admin, r.id);
      if (res.ok) huboSorteo = true;
    }
  }
  if (huboSorteo) {
    const { data: deNuevo } = await admin
      .from('raffles')
      .select('id,titulo,descripcion,img,patrocinador,como_participar,precio_ticket,meta_tickets,cierra_el,status,ganador_ticket_id,sorteado_el,orden,created_at')
      .in('status', ['abierto', 'sorteado'])
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });
    lista.splice(0, lista.length, ...(deNuevo ?? []));
  }

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
    // Los sorteos por fecha no muestran contador: el número de tickets no sale al público.
    vendidos: r.meta_tickets ? (conteo[r.id] || 0) : 0,
    ganador: ganador_ticket_id ? ganadores[ganador_ticket_id] : undefined,
  }));

  return NextResponse.json(
    { raffles },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
  );
}
