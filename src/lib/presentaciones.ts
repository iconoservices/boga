// Presentaciones de un producto (columna products.presentaciones, JSONB): un mismo producto que se vende en
// varias medidas o tamaños con precios distintos. Ej. Comino: 100 g → S/ 4, 250 g → S/ 9, 1 kg → S/ 32.
//
// Es opcional: sin presentaciones el producto funciona exactamente igual que siempre (un solo precio).
// Con presentaciones, `products.price` guarda la más barata (para "Desde S/ …" y para el marketplace) y el
// cliente elige una al pedir. El pedido manda solo la ETIQUETA elegida; el servidor busca el precio en la base
// (nunca se confía en el precio del cliente).

/** `promo`: el dueño la marcó con 🔥 (precio por cantidad / paquete en promoción). */
export type Presentacion = { label: string; price: number; promo?: boolean };

/** Nombre de la columna en `products`. */
export const COL_PRESENTACIONES = 'presentaciones';

/** Botones rápidos del formulario del dueño (productos por peso: especias, granos…). */
export const PRESENTACIONES_SUGERIDAS_PESO = ['100 g', '250 g', '500 g', '1 kg'];
export const PRESENTACIONES_SUGERIDAS = PRESENTACIONES_SUGERIDAS_PESO;

/** Botones rápidos para bebidas (tamaño de vaso): medidas de onzas y litros. */
export const PRESENTACIONES_SUGERIDAS_BEBIDAS = ['12 oz', '14 oz', '16 oz', '20 oz', '1 L'];

/** Botones rápidos para discoteca / night club (botellas, combos, pases). */
export const PRESENTACIONES_SUGERIDAS_DISCOTECA = ['Botella Sola', 'Combo + 2 Red Bull', 'Combo + 4 Red Bull', 'General', 'VIP'];

/** Botones rápidos para ropa / moda (tallas de prendas). */
export const PRESENTACIONES_SUGERIDAS_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Estándar'];

/** Botones rápidos para calzado / calzados. */
export const PRESENTACIONES_SUGERIDAS_CALZADO = ['35', '36', '37', '38', '39', '40', '41'];

/** Botones rápidos para bodegas y comerciales (por unidades, paquetes y también peso). */
/** Atajos para productos que se venden por volumen (litros, mililitros, galón). */
export const PRESENTACIONES_SUGERIDAS_VOLUMEN = ['250 ml', '500 ml', '1/4 litro', '1/2 litro', '1 litro', '2 litros', 'Galón'];
export const PRESENTACIONES_SOLO_UNIDADES = ['1 unidad', '2 unidades', '3 unidades', '6 unidades', '12 unidades', 'Docena', 'Paquete', 'Bolsa'];
export const PRESENTACIONES_SUGERIDAS_UNIDADES = [...PRESENTACIONES_SOLO_UNIDADES, ...PRESENTACIONES_SUGERIDAS_PESO];

/**
 * Unidades de medida que el dueño puede elegir al armar las presentaciones de un producto.
 * Cada una trae sus atajos; "otra" no trae ninguno (se escribe la medida a mano).
 */
export type ModoMedida = 'unidades' | 'peso' | 'volumen' | 'longitud' | 'tamano' | 'empaque' | 'otra';
export const UNIDADES_DE_MEDIDA: { id: ModoMedida; label: string; icono: string; ayuda: string; sugeridas: string[] }[] = [
  { id: 'unidades', label: 'Unidades', icono: 'inventory_2', ayuda: 'Ej. 1 unidad, 3 unidades, docena', sugeridas: ['1 unidad', '2 unidades', '3 unidades', '6 unidades', '12 unidades', 'Media docena', 'Docena', 'Par', 'Paquete', 'Bolsa'] },
  { id: 'peso', label: 'Peso (g, kg)', icono: 'scale', ayuda: 'Ej. 100 g, 1 kg', sugeridas: ['50 g', '100 g', '250 g', '500 g', '1 kg', '2 kg', '5 kg', '10 kg'] },
  { id: 'volumen', label: 'Volumen (ml, litros)', icono: 'water_drop', ayuda: 'Ej. 1/4 litro, galón', sugeridas: ['250 ml', '500 ml', '1/4 litro', '1/2 litro', '1 litro', '2 litros', '5 litros', 'Galón', 'Balde'] },
  { id: 'longitud', label: 'Longitud (m, cm)', icono: 'straighten', ayuda: 'Ej. 1 metro, rollo', sugeridas: ['10 cm', '50 cm', '1 metro', '2 metros', '5 metros', '10 metros', 'Rollo'] },
  { id: 'tamano', label: 'Tamaño o porción', icono: 'aspect_ratio', ayuda: 'Ej. personal, familiar', sugeridas: ['Personal', 'Pequeño', 'Mediano', 'Grande', 'Familiar', 'Jumbo', 'Media porción', 'Porción'] },
  { id: 'empaque', label: 'Caja, bolsa o saco', icono: 'package_2', ayuda: 'Ej. caja x 12, bolsa x 60, saco, ciento', sugeridas: ['Caja x 6', 'Caja x 12', 'Caja x 24', 'Caja x 48', 'Bolsa', 'Bolsa x 12', 'Bolsa x 60', 'Paquete', 'Paquete x 6', 'Cartón', 'Jaba', 'Saco', 'Ciento', 'Millar'] },
  { id: 'otra', label: 'Otra', icono: 'edit', ayuda: 'Escribe tu propia medida', sugeridas: [] },
];

/**
 * Completa la medida con la unidad elegida cuando el dueño escribe SOLO el número: "12" -> "12 unidades",
 * "250" -> "250 g", "1" -> "1 kg". Si ya escribió texto (o no hay unidad elegida), se deja tal cual.
 */
export function completarMedida(texto: string, modo: ModoMedida | null): string {
  const t = texto.trim();
  if (!modo || !/^\d+([.,]\d+)?$/.test(t)) return texto;
  const n = parseFloat(t.replace(',', '.'));
  switch (modo) {
    case 'unidades': return `${t} ${n === 1 ? 'unidad' : 'unidades'}`;
    case 'peso': return `${t} ${n <= 10 ? 'kg' : 'g'}`;
    case 'volumen': return n <= 10 ? `${t} ${n === 1 ? 'litro' : 'litros'}` : `${t} ml`;
    case 'longitud': return n <= 20 ? `${t} ${n === 1 ? 'metro' : 'metros'}` : `${t} cm`;
    default: return texto;
  }
}

/**
 * Valor numérico de una medida para poder ordenarlas: "2 unidades" -> 2, "docena" -> 12, "1 kg" -> 1000 (g),
 * "1/4 litro" -> 250 (ml), "500 ml" -> 500. Devuelve null si no se entiende ("Personal", "Caja x 12"…).
 */
export function valorDeMedida(label: string): number | null {
  const t = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (!t) return null;
  if (/^media docena$/.test(t)) return 6;
  if (/^docena$/.test(t)) return 12;
  if (/^par$/.test(t)) return 2;
  if (/^galon$/.test(t)) return 3785;
  const fr = t.match(/^(\d+)\s*\/\s*(\d+)\s*(litro|litros|l|kg|kilo|kilos)$/);
  const m = fr ? null : t.match(/^(\d+(?:[.,]\d+)?)\s*(unidad|unidades|und|u|g|gr|gramos|kg|kilo|kilos|ml|l|lt|litro|litros|cm|m|metro|metros)?$/);
  let n: number, u: string;
  if (fr) { n = parseInt(fr[1], 10) / parseInt(fr[2], 10); u = fr[3]; }
  else if (m) { n = parseFloat(m[1].replace(',', '.')); u = m[2] ?? 'unidad'; }
  else return null;
  if (/^(kg|kilo|kilos)$/.test(u)) return n * 1000;
  if (/^(l|lt|litro|litros)$/.test(u)) return n * 1000;
  if (/^(m|metro|metros)$/.test(u)) return n * 100;
  return n;
}

/**
 * Ordena las presentaciones de menor a mayor cantidad. Si alguna no se entiende (por ejemplo "Personal"),
 * se respeta el orden en que las escribió el dueño.
 */
export function ordenarPresentaciones<T extends { label: string }>(lista: T[]): T[] {
  const valores = lista.map((x) => valorDeMedida(x.label));
  if (lista.length < 2 || valores.some((v) => v === null)) return lista;
  return lista
    .map((x, i) => ({ x, v: valores[i] as number, i }))
    .sort((a, b) => a.v - b.v || a.i - b.i)
    .map((o) => o.x);
}

/** Cuántas unidades es una presentación ("12 unidades" -> 12, "docena" -> 12, "1" -> 1). null si no son unidades. */
export function unidadesDe(label: string): number | null {
  const t = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (t === 'docena') return 12;
  if (t === 'media docena') return 6;
  if (t === 'par') return 2;
  const m = t.match(/^(\d+)\s*(unidad|unidades|und|u)?$/);
  if (m) return parseInt(m[1], 10);
  // Empaques con cantidad: "Bolsa x 60 unidades", "Caja x 12", "Paquete x 6".
  const x = t.match(/^(?:bolsa|caja|paquete|pack|cartón|carton|jaba|saco)\s*x\s*(\d+)(?:\s*(?:unidad|unidades|und|u))?$/);
  return x ? parseInt(x[1], 10) : null;
}

/**
 * Ahorro automático por cantidad: toma el precio de "1 unidad" como base y, para las demás presentaciones en
 * unidades, calcula cuánto se ahorra frente a comprar esa cantidad suelta y cuánto sale cada una.
 * Solo devuelve las que realmente salen más baratas.
 */
export function ahorroPorCantidad(pres: Presentacion[]): Record<string, { ahorro: number; porUnidad: number }> {
  const out: Record<string, { ahorro: number; porUnidad: number }> = {};
  const base = pres.find((p) => unidadesDe(p.label) === 1);
  if (!base) return out;
  for (const p of pres) {
    const n = unidadesDe(p.label);
    if (n === null || n <= 1) continue;
    const suelto = base.price * n;
    const ahorro = Math.round((suelto - p.price) * 100) / 100;
    if (ahorro > 0.009) out[p.label] = { ahorro, porUnidad: Math.round((p.price / n) * 100) / 100 };
  }
  return out;
}

export type TipoPresentacion = 'ropa' | 'calzado' | 'bebida' | 'unidades' | 'peso';

export function tipoPresentacionDe(categoria: unknown, template?: unknown): TipoPresentacion {
  const c = typeof categoria === 'string'
    ? categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : '';
  const t = typeof template === 'string' ? template.toLowerCase() : '';

  if (/zapato|zapatilla|calzado|sandalia|bota|tacon|tacone/.test(c)) {
    return 'calzado';
  }

  if (
    t === 'estilosmirka' ||
    t === 'mirkavisual' ||
    t === 'atelier' ||
    t === 'lookbook' ||
    /ropa|moda|vestido|blusa|pantalon|conjunto|polo|camisa|falda|short|casaca|chaqueta|poleron|chompa|talla|prenda|lenceria|bikini|traje/.test(c)
  ) {
    return 'ropa';
  }

  if (
    t === 'discoteca' ||
    t === 'cartelera' ||
    /bebid|jugo|cafe|coctel|trago|cerveza|refresc|batido|smoothie|frappe|vaso|chicha|emolient|cholao|infusion|licuado|gaseosa|botella|whisky|vodka|ron|gin|tequila|box/.test(c)
  ) {
    return 'bebida';
  }

  // Bodega / comercial: abarrotes, limpieza, higiene, hogar, snacks, lácteos, huevos… se venden por unidad, docena o paquete.
  if (/abarrot|despensa|limpieza|higiene|hogar|snack|golosina|lacteo|huevo|bodega|detergente|cuidado personal|menaje/.test(c)) {
    return 'unidades';
  }

  return 'peso';
}

/** Elige los botones rápidos según la categoría o plantilla del producto. */
export function presentacionesSugeridas(categoria: unknown, template?: unknown): string[] {
  const t = typeof template === 'string' ? template.toLowerCase() : '';
  if (t === 'discoteca' || t === 'cartelera') return PRESENTACIONES_SUGERIDAS_DISCOTECA;
  const tipo = tipoPresentacionDe(categoria, template);
  switch (tipo) {
    case 'calzado': return PRESENTACIONES_SUGERIDAS_CALZADO;
    case 'ropa': return PRESENTACIONES_SUGERIDAS_ROPA;
    case 'bebida': return PRESENTACIONES_SUGERIDAS_BEBIDAS;
    case 'unidades': return PRESENTACIONES_SUGERIDAS_UNIDADES;
    default: return PRESENTACIONES_SUGERIDAS_PESO;
  }
}

/** Título, subtítulo e icono para el bloque de presentaciones según el rubro. */
export function textosPresentacion(categoria: unknown, template?: unknown): {
  titulo: string;
  subtitulo: string;
  icono: string;
  ejemploLabel: string;
} {
  const tipo = tipoPresentacionDe(categoria, template);
  switch (tipo) {
    case 'calzado':
      return {
        titulo: '¿Tiene números de calzado? (opcional)',
        subtitulo: 'Ej. calzado: 36, 37, 38, cada uno con su precio. Tu cliente elige el número al pedir.',
        icono: 'steps',
        ejemploLabel: 'Ej. 37',
      };
    case 'ropa':
      return {
        titulo: '¿Tiene tallas disponibles? (opcional)',
        subtitulo: 'Ej. prendas: S, M, L, XL con su precio (pueden tener el mismo precio). Tu cliente elige la talla al pedir.',
        icono: 'checkroom',
        ejemploLabel: 'Ej. M',
      };
    case 'bebida':
      return {
        titulo: '¿Vendes en varios tamaños de vaso? (opcional)',
        subtitulo: 'Ej. bebidas: 12 oz, 16 oz, 20 oz, cada una con su precio. Tu cliente elige el tamaño de vaso al pedir.',
        icono: 'local_drink',
        ejemploLabel: 'Ej. 16 oz',
      };
    case 'unidades':
      return {
        titulo: '¿Lo vendes por unidades, en paquete o por peso? (opcional)',
        subtitulo: 'Ej. 1 unidad S/ 1, 3 unidades S/ 2, 12 unidades S/ 8, Bolsa x 60 S/ 38: cada una con su precio. Tu cliente elige al pedir.',
        icono: 'inventory_2',
        ejemploLabel: 'Ej. 3 unidades',
      };
    default:
      return {
        titulo: '¿Lo vendes por peso, por unidades o en varios tamaños? (opcional)',
        subtitulo: 'Ej. especias: 100 g, 250 g, 1 kg; o 1 unidad, docena, paquete: cada uno con su precio. Tu cliente elige la medida al pedir.',
        icono: 'scale',
        ejemploLabel: 'Ej. 250 g',
      };
  }
}

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
    out.push({ label, price: Math.round(price * 100) / 100, ...((x as Presentacion)?.promo === true ? { promo: true } : {}) });
    if (out.length >= 12) break;
  }
  // De menor a mayor precio (100 g, 250 g, 1 kg): así las ve el cliente sin importar en qué orden se cargaron.
  return out.sort((a, b) => a.price - b.price);
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

// ── Qué plantillas saben mostrar la elección de medida ──
// Solo estas tienen el selector para el cliente; en las demás el producto se vendería al precio "desde".
// `condimentos` es la que vende todo por peso: ahí el formulario de productos abre las presentaciones desde el inicio.
const PLANTILLAS_CON_PRESENTACIONES = [
  'condimentos', 'mercado', 'estilosmirka', 'mirkavisual', 'atelier', 'lookbook', 'discoteca', 'cartelera',
  // las del motor compartido (templates/shared): el modal del producto trae el selector de medida
  'default', 'menudirecto', 'polleria', 'iniciocatalogo', 'fichadigital', 'fichaplana', 'veterinaria',
];

export const plantillaAceptaPresentaciones = (template: unknown) => PLANTILLAS_CON_PRESENTACIONES.includes(String(template));
export const plantillaEsPorPeso = (template: unknown) => template === 'condimentos';

/** Fila del formulario (texto) tal como se escribe: etiqueta y precio como texto. */
export type FilaPresentacion = { label: string; price: string };

/**
 * Convierte las filas del formulario en presentaciones válidas. Devuelve `error` si alguna fila está a medias
 * (nombre sin precio o al revés); las filas totalmente vacías se ignoran.
 */
export function filasAPresentaciones(filas: FilaPresentacion[]): { pres: Presentacion[]; error?: string } {
  if (filas.some((x) => (x.label.trim() || x.price.trim()) && !(x.label.trim() && parseFloat(x.price) > 0))) {
    return { pres: [], error: 'Cada presentación necesita un nombre (ej. 250 g) y un precio mayor a 0. Completa o quita las filas vacías.' };
  }
  return { pres: leerPresentaciones(filas.map((x) => ({ label: x.label, price: parseFloat(x.price) }))) };
}
