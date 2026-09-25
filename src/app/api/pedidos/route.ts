import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { moduloActivo } from '@/lib/modulos';
import { moverStock } from '@/lib/stock';

// Guarda el pedido de la carta en la base ANTES de que el cliente abra WhatsApp.
//
// Antes el pedido salía directo por WhatsApp y no quedaba registrado en ningún lado: por eso no aparecía
// en el panel del dueño, no descontaba stock ni sumaba a las ventas. Esto es un registro extra: el pedido
// por WhatsApp sigue saliendo igual aunque esto falle (el cliente nunca se entera).
//
// El cliente solo manda qué productos y cuántos; los precios y nombres se leen de la base, así nadie
// puede inventar un total. Usa la llave de servicio porque los visitantes no tienen sesión.

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,80}$/;

// Freno simple por IP (en memoria; sirve de defensa básica contra el spam, no es infalible).
const VENTANA_MS = 10 * 60_000;
const MAX_POR_VENTANA = 12;
const visitas = new Map<string, { n: number; desde: number }>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const v = visitas.get(ip);
  if (!v || ahora - v.desde > VENTANA_MS) { visitas.set(ip, { n: 1, desde: ahora }); return false; }
  v.n += 1;
  return v.n > MAX_POR_VENTANA;
}

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Sin llave de servicio no se puede guardar: no es un error para el cliente.
  if (!url || !key) return NextResponse.json({ ok: false, motivo: 'sin_servicio' });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';
  if (excedeLimite(ip)) return NextResponse.json({ ok: false, motivo: 'limite' }, { status: 429 });

  let body: { store?: unknown; items?: unknown; cliente?: Record<string, unknown> } | null;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, motivo: 'json' }, { status: 400 }); }

  const slug = texto(body?.store, 80);
  if (!SLUG.test(slug)) return NextResponse.json({ ok: false, motivo: 'tienda' }, { status: 400 });

  // Solo ids válidos, cantidades de 1 a 99 y hasta 60 líneas; los repetidos se suman.
  const pedidas = new Map<string, number>();
  for (const l of (Array.isArray(body?.items) ? body.items.slice(0, 60) : []) as { id?: unknown; quantity?: unknown }[]) {
    const id = texto(l?.id, 60);
    const q = Math.floor(Number(l?.quantity));
    if (!UUID.test(id) || !(q >= 1)) continue;
    pedidas.set(id, Math.min(99, (pedidas.get(id) ?? 0) + Math.min(q, 99)));
  }
  if (pedidas.size === 0) return NextResponse.json({ ok: false, motivo: 'sin_productos' });

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: tienda } = await db.from('stores').select('slug,status,modulos').eq('slug', slug).maybeSingle();
  if (!tienda || tienda.status !== 'active') return NextResponse.json({ ok: false, motivo: 'tienda' }, { status: 404 });

  const { data: productos } = await db
    .from('products')
    .select('id,name,price,stock,status')
    .eq('store', slug)
    .in('id', Array.from(pedidas.keys()));

  const lineas = (productos ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    price: Number(p.price) || 0,
    quantity: pedidas.get(p.id as string) ?? 1,
  }));
  if (lineas.length === 0) return NextResponse.json({ ok: false, motivo: 'sin_productos' });

  const cliente = body?.cliente ?? {};
  const entrega = cliente?.entrega === 'delivery' ? 'delivery' : 'recojo';
  const direccion = texto(cliente?.direccion, 200);

  const { data: pedido, error } = await db
    .from('orders')
    .insert({
      store: slug,
      customer_name: texto(cliente?.nombre, 80) || 'Cliente de la carta',
      customer_phone: texto(cliente?.telefono, 30) || null,
      customer_address: entrega === 'delivery' ? (direccion || 'Delivery (sin dirección)') : 'Recojo en tienda',
      items: lineas.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
      total_amount: lineas.reduce((s, l) => s + l.price * l.quantity, 0),
      status: 'Pendiente',
      order_source: 'Carta',
    })
    .select('id')
    .single();

  if (error || !pedido) {
    console.error('Error guardando el pedido de la carta:', error?.message);
    return NextResponse.json({ ok: false, motivo: 'db' });
  }

  // Con inventario, el pedido descuenta stock (si se cancela, el panel lo devuelve).
  if (moduloActivo(tienda.modulos, 'inventario')) {
    await moverStock(db, {
      store: slug,
      motivo: 'venta_carta',
      pedidoId: pedido.id,
      lineas: lineas.map((l) => ({ id: l.id, name: l.name, delta: -l.quantity })),
    });
  }

  return NextResponse.json({ ok: true, id: pedido.id });
}
