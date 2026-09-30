import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Servidor no configurado' }, { status: 500 });
  }

  let body: { event_id?: string; nombre?: string; telefono?: string; promotor?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const event_id = (body?.event_id || '').trim();
  const nombre = (body?.nombre || '').trim();
  const telefono = (body?.telefono || '').trim();
  const promotor = (body?.promotor || '').trim().toLowerCase();

  if (!event_id || !nombre) {
    return NextResponse.json({ ok: false, error: 'Nombre y evento requeridos' }, { status: 400 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Llamar a reservar_ticket RPC
  const { data, error } = await supabase.rpc('reservar_ticket', {
    p: { event_id, nombre, telefono: telefono || null },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila?.id) {
    return NextResponse.json({ ok: false, error: 'No se pudo generar la reserva' }, { status: 500 });
  }

  // Si vino con código de promotor, asociarlo al ticket
  if (promotor) {
    try {
      await supabase
        .from('tickets')
        .update({ promotor_codigo: promotor })
        .eq('id', fila.id);
    } catch {
      // Ignorar si la columna no existe aún
    }
  }

  return NextResponse.json({
    ok: true,
    id: fila.id,
    token: fila.token,
    created_at: fila.created_at,
    promotor: promotor || null,
  });
}
