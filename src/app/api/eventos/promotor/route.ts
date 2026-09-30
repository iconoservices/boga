import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, mensaje: 'Servidor no configurado' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = (searchParams.get('codigo') || '').trim().toLowerCase();

  if (!codigo) {
    return NextResponse.json({ ok: false, mensaje: 'Código de promotor requerido' }, { status: 400 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Buscar todos los tickets generados con el código de este promotor
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, event_id, nombre, created_at, estado, usado_at')
    .ilike('promotor_codigo', codigo);

  if (ticketsError) {
    // Si la columna promotor_codigo todavía no existe en una base vieja, no rompemos
    return NextResponse.json({
      ok: true,
      promotor: codigo,
      totalReservas: 0,
      ingresadosPuerta: 0,
      comisionEstimada: 0,
      eventos: [],
    });
  }

  const lista = tickets || [];
  const totalReservas = lista.length;
  const ingresadosPuerta = lista.filter((t) => t.estado === 'usado').length;
  // Comisión ejemplo por asistente en puerta: S/ 5 por persona
  const comisionPorPersona = 5;
  const comisionEstimada = ingresadosPuerta * comisionPorPersona;

  // Obtener nombres de los eventos vinculados
  const eventIds = Array.from(new Set(lista.map((t) => t.event_id).filter(Boolean)));
  let eventosInfo: any[] = [];
  if (eventIds.length > 0) {
    const { data: eventos } = await supabase
      .from('events')
      .select('id, titulo, dia, mes, precio, organizer_id')
      .in('id', eventIds);
    eventosInfo = eventos || [];
  }

  return NextResponse.json({
    ok: true,
    promotor: codigo,
    totalReservas,
    ingresadosPuerta,
    pendientes: totalReservas - ingresadosPuerta,
    comisionPorPersona,
    comisionEstimada,
    tickets: lista.slice(0, 50),
    eventos: eventosInfo,
  });
}
