// Presentaciones de un producto (columna products.presentaciones, JSONB): un mismo producto que se vende en
// varias medidas o tamaños con precios distintos. Ej. Comino: 100 g → S/ 4, 250 g → S/ 9, 1 kg → S/ 32.
//
// Es opcional: sin presentaciones el producto funciona exactamente igual que siempre (un solo precio).
// Con presentaciones, `products.price` guarda la más barata (para "Desde S/ …" y para el marketplace) y el
// cliente elige una al pedir. El pedido manda solo la ETIQUETA elegida; el servidor busca el precio en la base
// (nunca se confía en el precio del cliente).

export type Presentacion = { label: string; price: number };

/** Nombre de la columna en `products`. */
export const COL_PRESENTACIONES = 'presentaciones';

/** Botones rápidos del formulario del dueño. */
export const PRESENTACIONES_SUGERIDAS = ['100 g', '250 g', '500 g', '1 kg'];

/** Lee lo que venga de la base y deja solo presentaciones válidas (etiqueta con texto y precio > 0), sin repetir etiquetas. */
export function leerPresentaciones(v: unknown): Presentacion[] {
  if (!Array.isArray(v)) return [];
  const vistas = new Set<string>();
  const out: Presentacion[] = [];
  for (const x of v) {
    const label = typeof (x as Presentacion)?.label === 'string' ? (x as Presentacion).label.trim().slice(0, 30) : '';
    const price = Number((x as Presentacion)?.price);
    if (!label || !(price > 0) || vistas.has(label.toLowerCase())) continue;
    vistas.add(label.toLowerCase());
    out.push({ label, price: Math.round(price * 100) / 100 });
    if (out.length >= 12) break;
  }
  return out;
}

/** La más barata: es el "Desde S/ …" y lo que se guarda en `products.price`. */
export function precioDesde(pres: Presentacion[]): number {
  return pres.reduce((min, p) => Math.min(min, p.price), Infinity);
}

/** Busca una presentación por su etiqueta (sin importar mayúsculas). */
export function presentacionPorEtiqueta(pres: Presentacion[], label: unknown): Presentacion | undefined {
  const l = typeof label === 'string' ? label.trim().toLowerCase() : '';
  return l ? pres.find((p) => p.label.toLowerCase() === l) : undefined;
}

/** "Comino (250 g)": así se ve en el pedido, el WhatsApp y el panel del dueño. */
export const nombreConPresentacion = (nombre: string, label: string) => `${nombre} (${label})`;

/** Clave de una línea del carrito: el mismo producto en dos medidas son dos líneas. */
export const claveLinea = (id: string, label?: string) => (label ? `${id}|${label}` : id);
