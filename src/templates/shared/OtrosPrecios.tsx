import React from 'react';
import { textoOtrosPrecios, type PreciosMoneda } from '@/lib/preciosMoneda';

/** Precios en otras monedas de un producto: los de la medida/talla indicada (o la más barata, que es el "Desde") o los del producto. */
export function preciosDeProducto(
  p: { preciosMoneda?: PreciosMoneda; presentaciones?: { label: string; price: number; preciosMoneda?: PreciosMoneda }[] },
  etiquetaElegida?: string,
): PreciosMoneda | undefined {
  const pres = p.presentaciones ?? [];
  if (pres.length === 0) return p.preciosMoneda;
  const elegida = etiquetaElegida ? pres.find((x) => x.label === etiquetaElegida) : undefined;
  return (elegida ?? pres.reduce((a, b) => (b.price < a.price ? b : a))).preciosMoneda;
}

/**
 * Precio(s) de un producto en otras monedas ("US$ 10.00 · MX$ 185.00"), para las plantillas que dibujan sus propios precios.
 * Los escribe el dueño en su panel (lib/preciosMoneda.ts); sin ninguno no dibuja nada. `factor` = cantidad elegida.
 * Se pinta en su propia línea, debajo del precio en soles.
 */
export default function OtrosPrecios({
  precios, factor = 1, className = '', style,
}: {
  precios?: PreciosMoneda;
  factor?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const texto = textoOtrosPrecios(precios, factor);
  if (!texto) return null;
  return <span className={`block font-semibold ${className}`} style={style}>{texto}</span>;
}
