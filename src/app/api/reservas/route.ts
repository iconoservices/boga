import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HORAS_RESERVA, generarCodigoReserva } from '@/lib/reservas';
import { hoyLima, hoyLimaMas } from '@/lib/fechaLima';

// Reservas de servicios. Los visitantes no tienen sesión, así que escribe el servidor con la llave de servicio.
//   GET  ?store=<slug>&fecha=AAAA-MM-DD  → horas ya ocupadas ese día (solo horas, nunca datos de otras clientas).
//   POST { store, servicioId, fecha, hora, nombre, telefono, nota } → crea la reserva.
// El nombre y el precio del servicio se leen de la base, no del cliente. La doble reserva la frena el
// índice único (store, fecha, hora) de supabase_setup.sql.

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,80}$/;
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIAS_MAX = 60;

const VENTANA_MS = 10 * 60_000;
const MAX_POR_VENTANA = 6;
const visitas = new Map<string, { n: number; desde: number }>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const v = visitas.get(ip);
  if (!v || ahora - v.desde > VENTANA_MS) { visitas.set(ip, { n: 1, desde: ahora }); return false; }
  v.n += 1;
  return v.n > MAX_POR_VENTANA;
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

export async function GET(request: Request) {
  const db = cliente();
  if (!db) return NextResponse.json({ ocupadas: [] });
  const { searchParams } = new URL(request.url);
  const store = texto(searchParams.get('store'), 80);
  const fecha = texto(searchParams.get('fecha'), 10);
  if (!SLUG.test(store) || !FECHA.test(fecha)) return NextResponse.json({ ocupadas: [] }, { status: 400 });

  const { data, error } = await db.from('reservas').select('hora').eq('store', store).eq('fecha', fecha).neq('estado', 'cancelada');
  // Sin la tabla (SQL sin correr) no hay nada ocupado: la reserva igual se manda por WhatsApp.
  if (error) return NextResponse.json({ ocupadas: [] });
  return NextResponse.json({ ocupadas: (data ?? []).map((r: { hora: string }) => r.hora) });
}

export async function POST(request: Request) {
  const db = cliente();
  if (!db) return NextResponse.json({ ok: false, motivo: 'sin_servicio' });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';
  if (excedeLimite(ip)) return NextResponse.json({ ok: false, motivo: 'limite' }, { status: 429 });

  let body: Record<string, unknown> | null;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, motivo: 'json' }, { status: 400 }); }

  const store = texto(body?.store, 80);
  const servicioId = texto(body?.servicioId, 64);
  const fecha = texto(body?.fecha, 10);
  const hora = texto(body?.hora, 5);
  const nombre = texto(body?.nombre, 80);
  const telefono = texto(body?.telefono, 30);
  const nota = texto(body?.nota, 300);

  if (!SLUG.test(store) || !ID_VALIDO.test(servicioId)) return NextResponse.json({ ok: false, motivo: 'datos' }, { status: 400 });
  if (!FECHA.test(fecha) || fecha < hoyLima() || fecha > hoyLimaMas(DIAS_MAX)) return NextResponse.json({ ok: false, motivo: 'fecha' }, { status: 400 });
  if (!(HORAS_RESERVA as readonly string[]).includes(hora)) return NextResponse.json({ ok: false, motivo: 'hora' }, { status: 400 });
  if (!nombre || telefono.replace(/\D/g, '').length < 7) return NextResponse.json({ ok: false, motivo: 'contacto' }, { status: 400 });

  const { data: tienda } = await db.from('stores').select('slug,status').eq('slug', store).maybeSingle();
  if (!tienda || tienda.status !== 'active') return NextResponse.json({ ok: false, motivo: 'tienda' }, { status: 404 });

  const { data: servicio } = await db.from('products').select('id,name,price').eq('store', store).eq('id', servicioId).maybeSingle();
  if (!servicio) return NextResponse.json({ ok: false, motivo: 'servicio' }, { status: 404 });

  const codigo = generarCodigoReserva();
  const { error } = await db.from('reservas').insert({
    store, codigo, servicio_id: String(servicio.id), servicio: servicio.name, precio: Number(servicio.price) || null,
    fecha, hora, nombre, telefono, nota: nota || null,
  });
  if (error) {
    // 23505 = el índice único: otra clienta tomó esa hora hace un instante.
    if ((error as { code?: string }).code === '23505') return NextResponse.json({ ok: false, motivo: 'ocupada' }, { status: 409 });
    // Sin la tabla (SQL sin correr) no es un error para la clienta: la reserva sigue por WhatsApp.
    return NextResponse.json({ ok: false, motivo: 'sin_servicio' });
  }
  return NextResponse.json({ ok: true, codigo });
}
