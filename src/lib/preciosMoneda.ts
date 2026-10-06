// Precios de un producto en otras monedas. El precio de siempre (`price`) sigue en soles; el dueño puede escribir, además,
// el precio en dólares, pesos mexicanos, etc. para que otras personas puedan comprar en su moneda. Son precios que él
// escribe (no hay conversión automática ni selector de moneda en la tienda: la tienda muestra todos los precios del producto).
// (Qué monedas usa la tienda se activa en su panel: lib/monedas.ts.)
// Se guarda en UNA columna JSONB (`products.precios_moneda`): {"USD": 10, "MXN": 180}.

import { simboloDe } from '@/lib/monedas';

/** Código de moneda -> monto (en esa moneda). */
export type PreciosMoneda = Record<string, number>;

/** Nombre de la columna en la tabla `products`. */
export const COL_PRECIOS_MONEDA = 'precios_moneda';

const MAX_MONEDAS = 4;

/** Lo que llega de la base o del formulario, limpio y acotado. Sin precios válidos devuelve {}. */
export function normalizarPreciosMoneda(raw: unknown): PreciosMoneda {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const salida: PreciosMoneda = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const codigo = k.trim().toUpperCase();
    const monto = Number(typeof v === 'string' ? v.replace(',', '.') : v);
    if (!/^[A-Z]{2,5}$/.test(codigo) || codigo === 'PEN' || !Number.isFinite(monto) || monto <= 0) continue;
    salida[codigo] = Math.round(monto * 100) / 100;
    if (Object.keys(salida).length >= MAX_MONEDAS) break;
  }
  return salida;
}

/** "US$ 10.00 · MX$ 180.00" o '' si el producto no tiene precios en otras monedas. `factor` = cantidad elegida. */
export function textoOtrosPrecios(p?: PreciosMoneda, factor = 1): string {
  return Object.entries(p ?? {}).map(([c, n]) => `${simboloDe(c)} ${(n * factor).toFixed(2)}`).join(' · ');
}
