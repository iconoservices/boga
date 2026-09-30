import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Validación rápida de entradas en puerta para porteros y staff.
// Usa service role para permitir validación atómica y registrar fecha/hora de ingreso.

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'Servidor no configurado' }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let body: { token?: string; pin?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'Petición inválida' }, { status: 400 });
  }

  const token = (body?.token || '').trim();
  if (!token) {
    return NextResponse.json({ ok: false, resultado: 'no_encontrado', mensaje: 'Código QR vacío' }, { status: 400 });
  }

  // Buscar el ticket por su token único
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, event_id, nombre, telefono, token, estado, usado_at, promotor_codigo')
    .eq('token', token)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ ok: false, resultado: 'no_encontrado', mensaje: 'Entrada no encontrada' });
  }

  // Obtener datos del evento
  const { data: evento } = await supabase
    .from('events')
    .select('titulo, dia, mes, precio, organizer_id')
    .eq('id', ticket.event_id)
    .maybeSingle();

  const eventoTitulo = evento?.titulo || 'Evento';

  // Si ya fue usado
  if (ticket.estado === 'usado') {
    return NextResponse.json({
      ok: false,
      resultado: 'ya_usado',
      nombre: ticket.nombre,
      evento: eventoTitulo,
      usado_at: ticket.usado_at,
      promotor: ticket.promotor_codigo || null,
      mensaje: `Ya fue usado ${ticket.usado_at ? new Date(ticket.usado_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : 'anteriormente'}`,
    });
  }

  // Marcar como usado
  const ahora = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ estado: 'usado', usado_at: ahora })
    .eq('id', ticket.id);

  if (updateError) {
    return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'No se pudo actualizar el ticket' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    resultado: 'valido',
    nombre: ticket.nombre,
    telefono: ticket.telefono,
    evento: eventoTitulo,
    usado_at: ahora,
    promotor: ticket.promotor_codigo || null,
    mensaje: 'Entrada válida · Pase autorizado',
  });
}
