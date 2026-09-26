import { NextResponse } from 'next/server';
import { clienteServicio, quienEs } from '@/lib/pushServidor';
import { moverStock } from '@/lib/stock';
import { avisarChofer } from '@/lib/despacho';
import { UUID } from '@/lib/transporteServidor';

// Detalle de UN pedido de la carta por su código (el del enlace /pedido/<código> que va en el WhatsApp).
//   GET   → cualquiera con el código ve lo básico (productos, total, estado) y, si es delivery, el seguimiento:
//           quién lo lleva y, mientras va «Enviado», dónde está la moto. El dueño de la tienda (o el
//           superadmin, con su sesión) además ve los datos del cliente.
//   PATCH → solo el dueño/superadmin: cambia el estado (cancelar devuelve el stock, igual que el panel) o
//           le asigna un repartidor de su tienda ({ repartidor: <id> | null }).
// Usa la llave de servicio porque `orders` no es pública; el código (8 caracteres al azar) hace de llave.

export const dynamic = 'force-dynamic';

const CODIGO = /^[a-z0-9]{6,12}$/;
const ESTADOS = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
const SIN_CACHE = { 'Cache-Control': 'no-store' };
const POSICION_FRESCA_MIN = 5;   // la moto se muestra en el mapa si su GPS tiene menos de 5 minutos

type Params = { params: Promise<{ codigo: string }> };

const COLUMNAS = 'id,store,customer_name,customer_phone,customer_address,items,total_amount,status,created_at,codigo';

async function cargar(codigo: string, request: Request) {
  const db = clienteServicio();
  if (!db || !CODIGO.test(codigo)) return null;
  // `repartidor_id`, `llego_at` y `pago_estado` son columnas nuevas: si todavía no se corrió el SQL, el pedido se lee igual, sin esos datos.
  let { data: o } = await db.from('orders').select(`${COLUMNAS},repartidor_id,llego_at,pago_estado`).eq('codigo', codigo).maybeSingle();
  if (!o) ({ data: o } = await db.from('orders').select(`${COLUMNAS},repartidor_id,llego_at`).eq('codigo', codigo).maybeSingle());
  if (!o) ({ data: o } = await db.from('orders').select(COLUMNAS).eq('codigo', codigo).maybeSingle());
  if (!o) return null;
  const { data: t } = await db.from('stores').select('name,user_id').eq('slug', o.store).maybeSingle();
  const quien = await quienEs(request);
  const propietario = !!quien && (quien.esSuperadmin || (!!t && t.user_id === quien.userId));
  return { db, o: o as typeof o & { repartidor_id?: string | null; llego_at?: string | null; pago_estado?: string | null }, tienda: t, propietario };
}

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] || 'Repartidor';

export async function GET(request: Request, { params }: Params) {
  const { codigo } = await params;
  const r = await cargar(codigo, request);
  if (!r) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404, headers: SIN_CACHE });
  const { db, o, tienda, propietario } = r;

  const items = (Array.isArray(o.items) ? o.items : []) as { name: string; price: number; quantity: number }[];
  const recojo = o.customer_address === 'Recojo en tienda';

  // Seguimiento de la entrega: el repartidor y, solo mientras el pedido va en camino, su posición.
  let repartidor: { nombre: string; placa: string | null; tel: string | null } | null = null;
  let posicion: { lat: number; lng: number; haceSeg: number } | null = null;
  if (!recojo && o.repartidor_id) {
    const enCamino = o.status === 'Enviado';
    const [{ data: d }, { data: a }] = await Promise.all([
      db.from('drivers').select('nombre,placa,tel').eq('id', o.repartidor_id).maybeSingle(),
      enCamino ? db.from('driver_acceso').select('lat,lng,ubicado_at').eq('driver_id', o.repartidor_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (d) repartidor = { nombre: primerNombre(d.nombre as string), placa: (d.placa as string | null) ?? null, tel: enCamino ? (d.tel as string | null) ?? null : null };
    if (a?.lat != null && a?.lng != null && a.ubicado_at) {
      const haceSeg = Math.round((Date.now() - new Date(a.ubicado_at as string).getTime()) / 1000);
      if (haceSeg <= POSICION_FRESCA_MIN * 60) posicion = { lat: a.lat as number, lng: a.lng as number, haceSeg };
    }
  }

  return NextResponse.json({
    codigo: o.codigo,
    tienda: { slug: o.store, nombre: tienda?.name ?? o.store },
    items: items.map((i) => ({ name: i.name, price: Number(i.price) || 0, quantity: Number(i.quantity) || 1 })),
    total: Number(o.total_amount) || 0,
    estado: o.status,
    pago: o.pago_estado ?? null,   // null = sin pago online; 'pendiente' | 'pagado' | 'fallido'
    creado: o.created_at,
    entrega: recojo ? 'Recojo en tienda' : 'Delivery',
    llego: !!o.llego_at,
    repartidor,
    posicion,
    propietario,
    // Datos privados: solo para quien administra la tienda
    ...(propietario ? { repartidorId: o.repartidor_id ?? null, cliente: { nombre: o.customer_name, telefono: o.customer_phone, direccion: o.customer_address } } : {}),
  }, { headers: SIN_CACHE });
}

export async function PATCH(request: Request, { params }: Params) {
  const { codigo } = await params;
  const r = await cargar(codigo, request);
  if (!r) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404, headers: SIN_CACHE });
  if (!r.propietario) return NextResponse.json({ error: 'Solo el dueño de la tienda puede cambiar el pedido' }, { status: 403, headers: SIN_CACHE });

  const body = await request.json().catch(() => null) as { estado?: unknown; repartidor?: unknown } | null;
  const { db, o } = r;

  // ── Asignar (o quitar) el repartidor ──
  if (body && 'repartidor' in body) {
    if (o.customer_address === 'Recojo en tienda') return NextResponse.json({ error: 'Es un pedido para recoger: no lleva repartidor' }, { status: 400, headers: SIN_CACHE });
    if (o.status === 'Entregado' || o.status === 'Cancelado') return NextResponse.json({ error: 'Este pedido ya está cerrado' }, { status: 400, headers: SIN_CACHE });
    const id = body.repartidor;
    if (id === null || id === '') {
      const { error } = await db.from('orders').update({ repartidor_id: null }).eq('id', o.id);
      if (error) return NextResponse.json({ error: 'No se pudo quitar el repartidor' }, { status: 500, headers: SIN_CACHE });
      return NextResponse.json({ ok: true, repartidor: null }, { headers: SIN_CACHE });
    }
    if (typeof id !== 'string' || !UUID.test(id)) return NextResponse.json({ error: 'Repartidor no válido' }, { status: 400, headers: SIN_CACHE });
    const { data: d } = await db.from('drivers').select('id,nombre,tipo,store_slug').eq('id', id).maybeSingle();
    if (!d || d.tipo !== 'Repartidor' || d.store_slug !== o.store) return NextResponse.json({ error: 'Ese repartidor no es de tu tienda' }, { status: 400, headers: SIN_CACHE });
    const { error } = await db.from('orders').update({ repartidor_id: id, llego_at: null }).eq('id', o.id);
    if (error) return NextResponse.json({ error: 'No se pudo asignar (¿ya corriste el SQL de delivery?)' }, { status: 500, headers: SIN_CACHE });
    // Le llega el aviso a su celular (si activó los avisos); igual lo ve al abrir su app.
    await avisarChofer(db, id, {
      title: '🛵 Pedido para entregar',
      body: `${r.tienda?.name ?? o.store}: ${o.customer_address || 'delivery'}`,
      url: '/transporte/chofer',
      tag: `entrega-${codigo}`,
      requireInteraction: true,
      vibrate: [250, 120, 250],
    }).catch(() => false);
    return NextResponse.json({ ok: true, repartidor: id }, { headers: SIN_CACHE });
  }

  // ── Cambiar el estado ──
  const estado = typeof body?.estado === 'string' ? body.estado : '';
  if (!ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400, headers: SIN_CACHE });

  if (o.status === estado) return NextResponse.json({ ok: true, estado }, { headers: SIN_CACHE });

  const { error } = await db.from('orders').update({ status: estado }).eq('id', o.id);
  if (error) return NextResponse.json({ error: 'No se pudo cambiar el estado' }, { status: 500, headers: SIN_CACHE });
  // Si vuelve atrás (o se cancela), el «llegó» ya no vale. Aparte porque la columna puede no existir todavía.
  if (estado !== 'Enviado' && estado !== 'Entregado') await db.from('orders').update({ llego_at: null }).eq('id', o.id);

  // Cancelar devuelve al inventario lo que el pedido había descontado (si no se devolvió ya).
  if (estado === 'Cancelado') {
    const { data: movs } = await db.from('stock_movements').select('product_id,product_name,delta,motivo').eq('pedido_id', o.id);
    if (movs && !movs.some((m) => m.motivo === 'cancelacion')) {
      const ventas = movs.filter((m) => String(m.motivo).startsWith('venta') && m.delta < 0);
      if (ventas.length) {
        await moverStock(db, {
          store: o.store, motivo: 'cancelacion', pedidoId: o.id, usuario: null,
          lineas: ventas.map((m) => ({ id: m.product_id, name: m.product_name, delta: -m.delta })),
        });
      }
    }
  }
  return NextResponse.json({ ok: true, estado }, { headers: SIN_CACHE });
}

