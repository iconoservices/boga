import { NextResponse } from 'next/server';
import { clienteServicio, quienEs } from '@/lib/pushServidor';
import { moduloActivo } from '@/lib/modulos';
import { COLS_OFERTA, aplicarOferta } from '@/lib/ofertas';
import { moverStock, stockIlimitado } from '@/lib/stock';

// Venta de la caja (POS) del panel. Antes la guardaba el navegador y después, aparte, descontaba el stock: si se
// cortaba el internet entre las dos cosas, la venta quedaba registrada y el stock no bajaba. Ahora el servidor hace
// las dos seguidas, con los precios (y ofertas) y el stock leídos de la base en ese momento.
//   POST { store, items: [{ id, quantity }], cliente?, telefono?, metodo, vendedor? }  → { ok, venta }
// Solo el dueño de la tienda, un co-administrador o el superadmin, y solo con el módulo POS activo.

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,80}$/;
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const METODOS = ['Efectivo', 'Yape/Plin', 'Tarjeta'] as const;
const SIN_CACHE = { 'Cache-Control': 'no-store' };
const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const error = (mensaje: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error: mensaje, ...extra }, { status, headers: SIN_CACHE });

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return error('Servicio no configurado', 503);
  const quien = await quienEs(request);
  if (!quien) return error('Tu sesión venció: vuelve a entrar.', 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = texto(body?.store, 80);
  if (!SLUG.test(slug)) return error('Tienda no válida', 400);

  const { data: tienda } = await db.from('stores').select('slug,user_id,modulos').eq('slug', slug).maybeSingle();
  if (!tienda) return error('Tienda no encontrada', 404);
  if (!quien.esSuperadmin && tienda.user_id !== quien.userId) {
    const { data: coAdmin } = await db.from('store_admins').select('user_id').eq('store', slug).eq('user_id', quien.userId).maybeSingle();
    if (!coAdmin) return error('Esta tienda no es tuya', 403);
  }
  if (!moduloActivo(tienda.modulos, 'pos')) return error('Esta tienda no tiene la caja (POS) activada.', 403);

  const metodo = METODOS.find((m) => m === body?.metodo);
  if (!metodo) return error('Elige cómo pagó el cliente', 400);

  // Líneas: ids válidos, cantidades de 1 a 999, hasta 100 productos; los repetidos se suman.
  const pedidas = new Map<string, number>();
  for (const l of (Array.isArray(body?.items) ? body!.items.slice(0, 100) : []) as { id?: unknown; quantity?: unknown }[]) {
    const id = texto(l?.id, 64);
    const q = Math.floor(Number(l?.quantity));
    if (!ID_VALIDO.test(id) || !(q >= 1)) continue;
    pedidas.set(id, Math.min(999, (pedidas.get(id) ?? 0) + q));
  }
  if (pedidas.size === 0) return error('El carrito está vacío', 400);

  const ids = [...pedidas.keys()];
  const consulta = (cols: string) => db.from('products').select(cols).eq('store', slug).in('id', ids);
  let { data: productos, error: errProd } = await consulta(`id,name,price,stock,status,${COLS_OFERTA}`);
  if (errProd) ({ data: productos, error: errProd } = await consulta('id,name,price,stock,status'));
  if (errProd) return error('No se pudieron leer los productos', 500);
  const porId = new Map(((productos ?? []) as unknown as Record<string, unknown>[]).map((p) => [String(p.id), aplicarOferta(p as never) as Record<string, unknown>]));

  const conInventario = moduloActivo(tienda.modulos, 'inventario');
  const lineas: { id: string; name: string; price: number; quantity: number }[] = [];
  for (const [id, quantity] of pedidas) {
    const p = porId.get(id);
    if (!p) return error('Un producto del carrito ya no existe. Vuelve a cargar la caja.', 409);
    const nombre = String(p.name);
    if (p.status === 'Agotado') return error(`«${nombre}» está agotado.`, 409, { producto: nombre });
    if (conInventario && !stockIlimitado(p as { stock?: number | null; status?: string | null }) && Number(p.stock) < quantity) {
      return error(`Solo quedan ${Number(p.stock)} de «${nombre}».`, 409, { producto: nombre, quedan: Number(p.stock) });
    }
    lineas.push({ id, name: nombre, price: Number(p.price) || 0, quantity });
  }
  const total = Math.round(lineas.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100;

  const vendedor = texto(body?.vendedor, 60) || 'Administrador';
  const { data: venta, error: errVenta } = await db.from('orders').insert({
    store: slug,
    customer_name: texto(body?.cliente, 80) || 'Cliente Local (POS)',
    customer_phone: texto(body?.telefono, 30) || null,
    items: lineas,
    total_amount: total,
    status: 'Entregado',
    payment_method: metodo,
    seller_name: vendedor,
    order_source: 'POS',
  }).select('*').single();
  if (errVenta || !venta) {
    console.error('[pos/venta]', errVenta?.message);
    return error('No se pudo registrar la venta. Intenta de nuevo.', 500);
  }

  let sinDescontar: string[] = [];
  if (conInventario) {
    const { data: u } = await db.auth.admin.getUserById(quien.userId).catch(() => ({ data: null }));
    const r = await moverStock(db, {
      store: slug, motivo: 'venta_pos', pedidoId: venta.id as string, usuario: u?.user?.email ?? vendedor,
      lineas: lineas.map((l) => ({ id: l.id, name: l.name, delta: -l.quantity })),
    });
    sinDescontar = r.fallidos;
  }
  return NextResponse.json({ ok: true, venta, sinDescontar }, { headers: SIN_CACHE });
}
