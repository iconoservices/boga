import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { quienEs } from '@/lib/pushServidor';
import { ipDe } from '@/lib/transporteServidor';
import { frenar } from '@/lib/frenos';

// Validación rápida de entradas en puerta para porteros y staff.
// Usa service role para permitir validación atómica y registrar fecha/hora de ingreso.

export const dynamic = 'force-dynamic';

// Freno contra adivinar el PIN: 8 fallos por IP cada 10 minutos, compartido entre instancias (lib/frenos.ts).
const VENTANA_MS = 10 * 60_000;
const MAX_FALLOS = 8;
const bloqueado = (ip: string) => frenar(`puerta-pin:${ip}`, MAX_FALLOS, VENTANA_MS, false);
const anotarFallo = (ip: string) => frenar(`puerta-pin:${ip}`, MAX_FALLOS, VENTANA_MS);

function pinCorrecto(pin: string): boolean {
  const esperado = (process.env.EVENTOS_PIN_PUERTA || '').trim();
  if (esperado.length < 4 || !pin) return false;   // sin PIN configurado, solo entra el superadmin
  const a = Buffer.from(pin), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

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

  // ¿Quién escanea? El superadmin con su sesión, o el portero con el PIN de puerta (EVENTOS_PIN_PUERTA en Vercel).
  // Antes no se pedía nada: cualquiera con la foto de un QR podía marcarlo como usado y ver el teléfono del cliente.
  const ip = ipDe(request);
  if (await bloqueado(ip)) {
    return NextResponse.json({ ok: false, resultado: 'sin_permiso', mensaje: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
  }
  let autorizado = false;
  if (request.headers.get('authorization')) autorizado = (await quienEs(request))?.esSuperadmin === true;
  if (!autorizado) autorizado = pinCorrecto(typeof body?.pin === 'string' ? body.pin.trim() : '');
  if (!autorizado) {
    await anotarFallo(ip);
    return NextResponse.json({ ok: false, resultado: 'sin_permiso', mensaje: 'PIN de puerta incorrecto' }, { status: 401 });
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
  // Solo si sigue sin usar: dos escaneos a la vez no pueden dejar pasar a dos personas con la misma entrada.
  const { data: marcado, error: updateError } = await supabase
    .from('tickets')
    .update({ estado: 'usado', usado_at: ahora })
    .eq('id', ticket.id)
    .neq('estado', 'usado')
    .select('id');

  if (updateError) {
    return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'No se pudo actualizar el ticket' }, { status: 500 });
  }
  if (!marcado?.length) {
    return NextResponse.json({ ok: false, resultado: 'ya_usado', nombre: ticket.nombre, evento: eventoTitulo, mensaje: 'Ya fue usado hace un instante' });
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
