import { NextResponse } from 'next/server';
import { clienteServicio, quienEs } from '@/lib/pushServidor';
import { moverStock } from '@/lib/stock';

// Detalle de UN pedido de la carta por su código (el del enlace /pedido/<código> que va en el WhatsApp).
//   GET   → cualquiera con el código ve lo básico (productos, total, estado). El dueño de la tienda (o el
//           superadmin, con su sesión) además ve los datos del cliente.
//   PATCH → solo el dueño/superadmin: cambia el estado. Cancelar devuelve el stock, igual que el panel.
// Usa la llave de servicio porque `orders` no es pública; el código (8 caracteres al azar) hace de llave.

export const dynamic = 'force-dynamic';

const CODIGO = /^[a-z0-9]{6,12}$/;
const ESTADOS = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
const SIN_CACHE = { 'Cache-Control': 'no-store' };

type Params = { params: Promise<{ codigo: string }> };

async function cargar(codigo: string, request: Request) {
  const db = clienteServicio();
  if (!db || !CODIGO.test(codigo)) return null;
  const COLUMNAS = 'id,store,customer_name,customer_phone,customer_address,items,total_amount,status,created_at,codigo';
  // `pago_estado` es una columna nueva: si todavía no se corrió el SQL de cobros online, el pedido se lee igual, sin ese dato.
  let { data: o } = await db.from('orders').select(`${COLUMNAS},pago_estado`).eq('codigo', codigo).maybeSingle();
  if (!o) ({ data: o } = await db.from('orders').select(COLUMNAS).eq('codigo', codigo).maybeSingle());
  if (!o) return null;
  const { data: t } = await db.from('stores').select('name,user_id').eq('slug', o.store).maybeSingle();
  const quien = await quienEs(request);
  const propietario = !!quien && (quien.esSuperadmin || (!!t && t.user_id === quien.userId));
  return { db, o: o as typeof o & { pago_estado?: string | null }, tienda: t, propietario };
}

export async function GET(request: Request, { params }: Params) {
  const { codigo } = await params;
  const r = await cargar(codigo, request);
  if (!r) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404, headers: SIN_CACHE });
  const { o, tienda, propietario } = r;

  const items = (Array.isArray(o.items) ? o.items : []) as { name: string; price: number; quantity: number }[];
  const recojo = o.customer_address === 'Recojo en tienda';
  return NextResponse.json({
    codigo: o.codigo,
    tienda: { slug: o.store, nombre: tienda?.name ?? o.store },
    items: items.map((i) => ({ name: i.name, price: Number(i.price) || 0, quantity: Number(i.quantity) || 1 })),
    total: Number(o.total_amount) || 0,
    estado: o.status,
    pago: o.pago_estado ?? null,   // null = sin pago online; 'pendiente' | 'pagado' | 'fallido'
    creado: o.created_at,
    entrega: recojo ? 'Recojo en tienda' : 'Delivery',
    propietario,
    // Datos privados: solo para quien administra la tienda
    ...(propietario ? { cliente: { nombre: o.customer_name, telefono: o.customer_phone, direccion: o.customer_address } } : {}),
  }, { headers: SIN_CACHE });
}

export async function PATCH(request: Request, { params }: Params) {
  const { codigo } = await params;
  const r = await cargar(codigo, request);
  if (!r) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404, headers: SIN_CACHE });
  if (!r.propietario) return NextResponse.json({ error: 'Solo el dueño de la tienda puede cambiar el estado' }, { status: 403, headers: SIN_CACHE });

  const body = await request.json().catch(() => null) as { estado?: unknown } | null;
  const estado = typeof body?.estado === 'string' ? body.estado : '';
  if (!ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400, headers: SIN_CACHE });

  const { db, o } = r;
  if (o.status === estado) return NextResponse.json({ ok: true, estado }, { headers: SIN_CACHE });

  const { error } = await db.from('orders').update({ status: estado }).eq('id', o.id);
  if (error) return NextResponse.json({ error: 'No se pudo cambiar el estado' }, { status: 500, headers: SIN_CACHE });

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
