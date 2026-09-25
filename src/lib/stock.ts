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
