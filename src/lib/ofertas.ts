// Ofertas en productos (columnas products.precio_oferta y products.oferta_hasta).
//
// `price` es el precio normal. Si hay una oferta vigente, los endpoints públicos devuelven como `price`
// el precio de oferta y como `price_anterior` el normal: así cada plantilla, el carrito y el pedido
// cobran lo mismo sin tocar cada pantalla. Una oferta está vigente si su precio es mayor que 0 y menor
// que el normal, y `oferta_hasta` (día de Perú, inclusive) no pasó.

import { hoyLima } from '@/lib/fechaLima';

/** Columnas extra que hay que pedir a `products` para poder calcular la oferta. */
export const COLS_OFERTA = 'precio_oferta,oferta_hasta';

type ConOferta = { price?: unknown; precio_oferta?: unknown; oferta_hasta?: unknown };

/** Precio de oferta vigente hoy, o null si el producto no está en oferta. */
export function precioOfertaVigente(p: ConOferta, hoy = hoyLima()): number | null {
  const normal = Number(p.price) || 0;
  const oferta = Number(p.precio_oferta) || 0;
  if (!(oferta > 0) || !(oferta < normal)) return null;
  const hasta = typeof p.oferta_hasta === 'string' ? p.oferta_hasta.slice(0, 10) : '';
  if (hasta && hasta < hoy) return null;
  return oferta;
}

/** Quita las columnas de oferta y, si hay oferta vigente, pone `price` = oferta y `price_anterior` = normal. */
export function aplicarOferta<T extends ConOferta>(row: T): Omit<T, 'precio_oferta' | 'oferta_hasta'> & { price_anterior?: number } {
  const { precio_oferta: _po, oferta_hasta: _oh, ...resto } = row;
  const oferta = precioOfertaVigente(row);
  if (oferta === null) return resto as Omit<T, 'precio_oferta' | 'oferta_hasta'>;
  return { ...resto, price: oferta, price_anterior: Number(row.price) || 0 } as Omit<T, 'precio_oferta' | 'oferta_hasta'> & { price_anterior: number };
}

/** "-30%" a partir del precio normal y el de oferta. */
export function porcentajeOferta(anterior: number, actual: number): string {
  return anterior > 0 ? `-${Math.round((1 - actual / anterior) * 100)}%` : '';
}
