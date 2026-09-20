import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { sortear } from '@/lib/sorteoServer';

// Acciones de administración de sorteos. Solo superadmin (se valida con is_superadmin()
// usando el token de quien llama) y se ejecutan con la llave del servidor.
//
//  { accion: 'ticket',  raffle_id, nombre, whatsapp?, nota?, cantidad? }
//      Registra 1..50 tickets a nombre de una persona. Si el sorteo tiene meta y con eso
//      se llega a ella, el sorteo se hace SOLO, al momento. Sin meta, no hay tope ni
//      sorteo automático: se sortea a mano con { accion: 'sortear' }.
//  { accion: 'sortear', raffle_id }
//      Sortea ahora (para cuando se quiera cerrar antes de llegar a la meta).
//  { accion: 'borrar_ticket', ticket_id }
//      Borra un ticket, solo mientras el sorteo siga abierto.

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const comoUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: esSuperadmin, error: authError } = await comoUsuario.rpc('is_superadmin');
  if (authError || esSuperadmin !== true) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let body: Record<string, any> = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 }); }

  const refrescar = () => { try { revalidatePath('/api/sorteos'); } catch { /* sin caché que refrescar */ } };

  // ---- sortear ahora
  if (body.accion === 'sortear') {
    const r = await sortear(admin, String(body.raffle_id || ''));
    refrescar();
    return r.ok ? NextResponse.json({ ok: true, ganador: { numero: r.numero, nombre: r.nombre } })
                : NextResponse.json({ error: r.error }, { status: 400 });
  }

  // ---- borrar ticket
  if (body.accion === 'borrar_ticket') {
    const { data: t } = await admin.from('raffle_tickets').select('id,raffle_id').eq('id', String(body.ticket_id || '')).single();
    if (!t) return NextResponse.json({ error: 'No se encontró el ticket' }, { status: 404 });
    const { data: rifa } = await admin.from('raffles').select('status').eq('id', t.raffle_id).single();
    if (rifa?.status !== 'abierto') return NextResponse.json({ error: 'Solo se pueden borrar tickets de un sorteo abierto' }, { status: 400 });
    const { error } = await admin.from('raffle_tickets').delete().eq('id', t.id);
    refrescar();
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  // ---- registrar tickets
  if (body.accion === 'ticket') {
    const raffleId = String(body.raffle_id || '');
    const nombre = String(body.nombre || '').trim();
    const cantidad = Math.max(1, Math.min(50, Number(body.cantidad) || 1));
    if (!raffleId || !nombre) return NextResponse.json({ error: 'Falta el sorteo o el nombre' }, { status: 400 });

    const { data: rifa } = await admin.from('raffles').select('id,status,meta_tickets').eq('id', raffleId).single();
    if (!rifa) return NextResponse.json({ error: 'No se encontró el sorteo' }, { status: 404 });
    if (rifa.status !== 'abierto') return NextResponse.json({ error: 'El sorteo no está abierto' }, { status: 400 });

    const { count } = await admin.from('raffle_tickets').select('id', { count: 'exact', head: true }).eq('raffle_id', raffleId);
    const actuales = count ?? 0;
    // Meta vacía = sorteo sin tope de tickets: no hay límite ni sorteo automático.
    const tieneMeta = typeof rifa.meta_tickets === 'number' && rifa.meta_tickets > 0;
    const disponibles = tieneMeta ? rifa.meta_tickets - actuales : Infinity;
    if (disponibles <= 0) return NextResponse.json({ error: 'El sorteo ya está lleno' }, { status: 400 });
    const n = Math.min(cantidad, disponibles); // con meta, nunca se pasa de ella

    const { data: ultimo } = await admin.from('raffle_tickets').select('numero').eq('raffle_id', raffleId).order('numero', { ascending: false }).limit(1);
    const desde = (ultimo?.[0]?.numero ?? 0) + 1;
    const filas = Array.from({ length: n }, (_, i) => ({
      raffle_id: raffleId, numero: desde + i, nombre,
      whatsapp: String(body.whatsapp || '').replace(/\D/g, '') || null,
      nota: String(body.nota || '').trim() || null,
    }));
    const { error } = await admin.from('raffle_tickets').insert(filas);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ¿Se llenó? Entonces se sortea solo.
    let ganador: { numero: number; nombre: string } | undefined;
    if (tieneMeta && actuales + n >= rifa.meta_tickets) {
      const r = await sortear(admin, raffleId);
      if (r.ok) ganador = { numero: r.numero, nombre: r.nombre };
    }
    refrescar();
    return NextResponse.json({ ok: true, agregados: n, numeros: filas.map((f) => f.numero), sorteado: Boolean(ganador), ganador });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}
