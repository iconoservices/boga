/**
 * Escalas de diseño compartidas por las plantillas de comida.
 *
 * Antes cada plantilla mezclaba text-[9px], text-[10px], text-[11px],
 * text-[13px], text-xs y text-sm sin criterio, y los iconos combinaban clases
 * (text-sm, text-base, text-lg) con `style={{ fontSize: '11px' }}`, asi que dos
 * iconos "iguales" no median igual. Con esto, un ajuste se hace en un lugar.
 */
export const TXT = {
  micro: 'text-[11px]',
  small: 'text-xs',
  body: 'text-sm',
  lead: 'text-base',
  title: 'text-lg',
} as const;

export const ICON = {
  xs: 'text-[13px]',
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
  xl: 'text-[32px]',
} as const;

export const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/** Cuantas estrellas llenas/media pintar para un rating real (ya no uno de relleno). */
export const estrellasDe = (rating: number) => ({
  llenas: Math.floor(rating),
  media: rating - Math.floor(rating) >= 0.5,
});

export const inicialesDe = (nombre: string) =>
  nombre.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export interface Producto {
  id: string;
  name: string;
  desc: string;
  /** Numerico: el carrito necesita sumar, no puede guardar "S/ 22.90". */
  price: number;
  /** Siempre el `href` de la categoria de la tienda, para que case con los chips. */
  category: string;
  image: string;
}

export interface Categoria {
  id: string;
  label: string;
  icon: string;
}
