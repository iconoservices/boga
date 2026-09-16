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

/**
 * Icono de Material Symbols para una categoria por nombre/palabra clave.
 *
 * Las categorias del menu las escribe el dueño de la tienda (son texto libre:
 * "Cholaos", "Raspadillas", "Menu del dia"...), asi que no hay forma de
 * acertar siempre. Por eso esto solo reconoce rubros comunes de comida y
 * bebida (el vocabulario ya usado en los templates de templates.config.ts) y
 * devuelve '' para lo que no reconoce: mejor sin icono que uno generico
 * repetido en todas las categorias, que no dice nada.
 */
const REGLAS_ICONO_CATEGORIA: [RegExp, string][] = [
  [/bebid|jugo|gaseosa|refresc|limonada|chicha|emolien/, 'local_bar'],
  [/cafe|capuchin|expres/, 'coffee'],
  [/cholao/, 'local_drink'],
  [/raspadilla|helad|cremolada|granizad|icecream/, 'icecream'],
  [/postre|dulce|torta|pastel|keke|queque|cake/, 'cake'],
  [/pollo.*brasa|brasa|parrill|anticucho|churrasco|carne/, 'outdoor_grill'],
  [/pizza/, 'local_pizza'],
  [/hamburgu/, 'lunch_dining'],
  [/sandwich|sanguch/, 'lunch_dining'],
  [/pan\b|panaderia|pasteleria|bakery/, 'bakery_dining'],
  [/desayuno/, 'free_breakfast'],
  [/ceviche|pescad|mariscos/, 'set_meal'],
  [/arroz/, 'rice_bowl'],
  [/sopa|caldo|chupe|ramen/, 'ramen_dining'],
  [/piqueo|entrada|snack|tapas/, 'tapas'],
  [/combo|promo|oferta/, 'takeout_dining'],
  [/comida|plato|menu|almuerzo|criollo|cocina/, 'restaurant'],
  [/abarrote/, 'shopping_basket'],
  [/limpieza/, 'cleaning_services'],
  [/lacteo|leche|queso|yogurt/, 'egg'],
  [/verdura/, 'eco'],
  [/fruta/, 'nutrition'],
  [/flor|ramo/, 'local_florist'],
];

export function iconForCategory(nombre: string): string {
  const n = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return REGLAS_ICONO_CATEGORIA.find(([re]) => re.test(n))?.[1] ?? '';
}
