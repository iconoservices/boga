import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { clienteServicio } from '@/lib/pushServidor';
import { tiendaCobraOnline } from '@/lib/izipay';
import { COLS_OFERTA, aplicarOferta } from '@/lib/ofertas';
import { moduloActivo } from '@/lib/modulos';
import { stockIlimitado } from '@/lib/stock';

// Crea el pedido de un cliente que va a PAGAR ONLINE (tarjeta / Yape por Izipay) y devuelve su código: el cliente sigue
// en /pagar/<código>. Igual que /api/pedidos, el cliente solo manda qué productos y cuántos; los precios (con ofertas) y
// nombres salen de la base, así nadie inventa un total. El pedido nace «pendiente de pago» y con inventario el stock
// se descuenta recién cuando el pago se confirma (lib/izipay.ts → registrarResultado), no al crear.

export const dynamic = 'force-dynamic';

const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG = /^[a-z0-9-]{1,80}$/;
const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const VENTANA_MS = 10 * 60_000;
const MAX_POR_VENTANA = 10;
const visitas = new Map<string, { n: number; desde: number }>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const v = visitas.get(ip);
  if (!v || ahora - v.desde > VENTANA_MS) { visitas.set(ip, { n: 1, desde: ahora }); return false; }
  v.n += 1;
  return v.n > MAX_POR_VENTANA;
}

const codigoNuevo = () => Array.from(randomBytes(10), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return NextResponse.json({ ok: false, motivo: 'sin_servicio' }, { status: 503 });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';
  if (excedeLimite(ip)) return NextResponse.json({ ok: false, motivo: 'limite' }, { status: 429 });

  let body: { store?: unknown; items?: unknown; cliente?: Record<string, unknown> } | null;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, motivo: 'json' }, { status: 400 }); }

  const slug = texto(body?.store, 80);
  if (!SLUG.test(slug)) return NextResponse.json({ ok: false, motivo: 'tienda' }, { status: 400 });
  if (!(await tiendaCobraOnline(db, slug))) return NextResponse.json({ ok: false, motivo: 'sin_cobro_online' }, { status: 409 });

  const pedidas = new Map<string, number>();
  for (const l of (Array.isArray(body?.items) ? body!.items.slice(0, 60) : []) as { id?: unknown; quantity?: unknown }[]) {
    const id = texto(l?.id, 60);
    const q = Math.floor(Number(l?.quantity));
    if (!ID_VALIDO.test(id) || !(q >= 1)) continue;
    pedidas.set(id, Math.min(99, (pedidas.get(id) ?? 0) + Math.min(q, 99)));
  }
  if (pedidas.size === 0) return NextResponse.json({ ok: false, motivo: 'sin_productos' });

  const ids = Array.from(pedidas.keys());
  let { data: productos, error: errProductos } = await db.from('products')
    .select(`id,name,price,stock,status,${COLS_OFERTA}`).eq('store', slug).in('id', ids);
  if (errProductos) ({ data: productos } = await db.from('products').select('id,name,price,stock,status').eq('store', slug).in('id', ids) as any);

  const { data: tienda } = await db.from('stores').select('modulos').eq('slug', slug).maybeSingle();
  const conInventario = moduloActivo(tienda?.modulos, 'inventario');

  const lineas: { id: string; name: string; price: number; quantity: number }[] = [];
  for (const p of ((productos ?? []) as any[]).map(aplicarOferta) as any[]) {
    const quantity = pedidas.get(p.id as string) ?? 1;
    if (p.status === 'Agotado' || p.status === 'Inactivo') return NextResponse.json({ ok: false, motivo: 'agotado', producto: p.name });
    if (conInventario && !stockIlimitado(p) && Number(p.stock) < quantity) return NextResponse.json({ ok: false, motivo: 'stock', producto: p.name });
    lineas.push({ id: p.id as string, name: p.name as string, price: Number(p.price) || 0, quantity });
  }
  if (lineas.length === 0) return NextResponse.json({ ok: false, motivo: 'sin_productos' });
  const total = Math.round(lineas.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;
  if (!(total > 0)) return NextResponse.json({ ok: false, motivo: 'total' });

  const cliente = body?.cliente ?? {};
  const entrega = cliente?.entrega === 'delivery' ? 'delivery' : 'recojo';
  const direccion = texto(cliente?.direccion, 200);

  const fila = {
    store: slug,
    customer_name: texto(cliente?.nombre, 80) || 'Cliente de la carta',
    customer_phone: texto(cliente?.telefono, 30).replace(/\D/g, '') || null,
    customer_address: entrega === 'delivery' ? (direccion || 'Delivery (sin dirección)') : 'Recojo en tienda',
    items: lineas.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
    total_amount: total,
    status: 'Pendiente',
    order_source: 'Carta',
    pago_estado: 'pendiente',
  };

  for (let intento = 0; intento < 4; intento++) {
    const codigo = codigoNuevo();
    const { data: pedido, error } = await db.from('orders').insert({ ...fila, codigo }).select('id').single();
    if (!error && pedido) return NextResponse.json({ ok: true, codigo, total });
    if (error?.code !== '23505') {
      console.error('[pagos/crear]', error?.message);
      return NextResponse.json({ ok: false, motivo: 'db' });
    }
  }
  return NextResponse.json({ ok: false, motivo: 'db' });
}
