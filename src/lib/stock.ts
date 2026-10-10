// Inventario: un solo lugar para mover el stock y dejar constancia (tabla stock_movements).
//
// Lo usan el panel del dueño (POS, ingresar mercadería, cancelar un pedido) con su sesión y el
// servidor (pedidos de la carta) con la llave de servicio. Recibe el cliente de Supabase que
// corresponda, así las reglas de acceso (RLS) las pone quien lo llama.

import type { SupabaseClient } from '@supabase/supabase-js';

/** Un producto tiene stock ilimitado si no tiene cantidad, si es 999 o más, o si quedó en 0 sin estar Agotado
 *  (la columna `stock` vale 0 por defecto en la base y esos productos se veían todos "Sin stock"). */
export const stockIlimitado = (p: { stock?: number | null; status?: string | null }) =>
  p.stock == null || p.stock >= 999 || (p.stock === 0 && p.status !== 'Agotado');

export type MotivoStock = 'venta_pos' | 'venta_carta' | 'cancelacion' | 'ingreso' | 'ajuste';

export interface FilaMovimiento {
  store: string;
  product_id: string;
  product_name: string;
  delta: number;
  stock_despues: number;
  motivo: MotivoStock;
  pedido_id?: string | null;
  usuario?: string | null;
}

/** Guarda movimientos en el historial. Si la tabla todavía no existe (o falla), no rompe nada: solo avisa en consola. */
export async function registrarMovimientos(db: SupabaseClient, filas: FilaMovimiento[]) {
  if (filas.length === 0) return;
  const { error } = await db.from('stock_movements').insert(filas);
  if (error) console.warn('No se pudo guardar el historial de stock:', error.message);
}

/**
 * Suma o resta stock producto por producto. `delta` negativo = sale (venta), positivo = entra (ingreso, cancelación).
 * Solo pisa el stock si nadie lo cambió mientras tanto (`.eq('stock', actual)`); si lo cambiaron, relee y reintenta una vez.
 * Los productos ilimitados no se tocan. Al llegar a 0 el producto pasa a Agotado; si estaba Agotado por falta
 * de stock y vuelve a haber, pasa a Activo.
 */
export async function moverStock(
  db: SupabaseClient,
  opts: {
    store: string;
    motivo: MotivoStock;
    pedidoId?: string | null;
    usuario?: string | null;
    lineas: { id: string; name: string; delta: number }[];
  },
): Promise<{ fallidos: string[]; cambiados: string[] }> {
  const fallidos: string[] = [];
  const cambiados: string[] = [];
  const movimientos: FilaMovimiento[] = [];

  for (const l of opts.lineas) {
    let ok = false;
    for (let intento = 0; intento < 2 && !ok; intento++) {
      const { data: fila } = await db.from('products').select('stock,status').eq('id', l.id).maybeSingle();
      if (!fila || stockIlimitado(fila)) { ok = true; break; }
      const antes = fila.stock ?? 0;
      const nuevo = Math.max(0, antes + l.delta);
      const estado = nuevo === 0 ? 'Agotado' : fila.status === 'Agotado' && antes <= 0 ? 'Activo' : fila.status;
      const { data: hecho } = await db
        .from('products')
        .update({ stock: nuevo, status: estado })
        .eq('id', l.id)
        .eq('stock', fila.stock)
        .select('id');
      if (hecho && hecho.length > 0) {
        ok = true;
        cambiados.push(l.id);
        movimientos.push({
          store: opts.store,
          product_id: l.id,
          product_name: l.name,
          delta: nuevo - antes,
          stock_despues: nuevo,
          motivo: opts.motivo,
          pedido_id: opts.pedidoId ?? null,
          usuario: opts.usuario ?? null,
        });
      }
    }
    if (!ok) fallidos.push(l.name);
  }

  await registrarMovimientos(db, movimientos);
  return { fallidos, cambiados };
}

/**
 * Devuelve al inventario lo que un pedido había descontado, según su historial (stock_movements). Si ya se devolvió
 * (hay un movimiento 'cancelacion'), no hace nada. Lo usan el panel al cancelar, /api/pedido/<código> y los pedidos vencidos.
 */
export async function devolverStockDePedido(db: SupabaseClient, o: { id: string; store: string }, usuario: string | null = null): Promise<boolean> {
  const { data: movs, error } = await db.from('stock_movements').select('product_id,product_name,delta,motivo').eq('pedido_id', o.id);
  if (error || !movs) return false;                                   // sin historial no se sabe qué se descontó
  if (movs.some((m) => m.motivo === 'cancelacion')) return false;     // ya se devolvió
  const ventas = movs.filter((m) => String(m.motivo).startsWith('venta') && m.delta < 0);
  if (ventas.length === 0) return false;
  await moverStock(db, {
    store: o.store, motivo: 'cancelacion', pedidoId: o.id, usuario,
    lineas: ventas.map((m) => ({ id: m.product_id as string, name: m.product_name as string, delta: -(m.delta as number) })),
  });
  return true;
}

/** Horas que un pedido de la carta aparta stock mientras sigue «Pendiente». Pasado eso se cancela solo y devuelve el stock. */
export const HORAS_RESERVA_CARTA = 24;

/**
 * Pedidos de la carta que siguen «Pendiente» después de HORAS_RESERVA_CARTA: el cliente armó el pedido pero nunca lo
 * concretó. Se cancelan y su stock vuelve al inventario. Los pagados online no se tocan. Solo tiene sentido en
 * tiendas con inventario (quien llama lo revisa). Devuelve cuántos pedidos liberó.
 */
export async function liberarPedidosVencidos(db: SupabaseClient, store: string): Promise<number> {
  const limite = new Date(Date.now() - HORAS_RESERVA_CARTA * 3_600_000).toISOString();
  const pedir = (cols: string) => db.from('orders').select(cols)
    .eq('store', store).eq('order_source', 'Carta').eq('status', 'Pendiente').lt('created_at', limite).limit(50);
  // `pago_estado` es una columna nueva (cobro online): sin ella se pide igual.
  let { data: vencidos, error } = await pedir('id,store,pago_estado');
  if (error) ({ data: vencidos, error } = await pedir('id,store'));
  if (error || !vencidos?.length) return 0;
  let liberados = 0;
  for (const o of vencidos as unknown as { id: string; store: string; pago_estado?: string | null }[]) {
    if (o.pago_estado === 'pagado') continue;
    // Solo si sigue Pendiente (el dueño pudo cambiarlo recién): así no se devuelve dos veces.
    const { data: cambiado } = await db.from('orders').update({ status: 'Cancelado' }).eq('id', o.id).eq('status', 'Pendiente').select('id');
    if (!cambiado?.length) continue;
    await devolverStockDePedido(db, o, 'vencido');
    liberados++;
  }
  return liberados;
}
