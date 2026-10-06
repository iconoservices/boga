// IGV incluido en el precio. Dos niveles que se combinan:
//  · la tienda marca "Mis precios incluyen IGV" (stores.igv_incluido) → vale para todo su catálogo;
//  · cada producto puede salirse de eso (products.igv): 'con' = lleva IGV aunque la tienda no lo marque,
//    'sin' = no lo lleva aunque la tienda sí. Vacío = lo que diga la tienda.
// Es solo un aviso al cliente ("IGV incluido" junto al precio y en el pedido): no cambia ningún monto.

export type IgvProducto = 'con' | 'sin';

/** Deja solo 'con' o 'sin' (cualquier otra cosa = sin definir, o sea lo que diga la tienda). */
export function normalizarIgv(v: unknown): IgvProducto | null {
  return v === 'con' || v === 'sin' ? v : null;
}

/** ¿El precio de este producto incluye IGV? */
export function llevaIgv(producto: unknown, tienda: boolean | null | undefined): boolean {
  const p = normalizarIgv(producto);
  return p ? p === 'con' : tienda === true;
}

/** Columna opcional de products: si su SQL aún no se corrió, se pide sin ella. */
export const COL_IGV = 'igv';
