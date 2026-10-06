// Monedas en las que vende una tienda, además de soles. El dueño las activa en su panel (Editar tienda) y entonces,
// en cada producto, puede escribir su precio en esa moneda (lib/preciosMoneda.ts). No hay selector de moneda en la tienda:
// lo que se muestra son los precios que el dueño escribió. El tipo de cambio es OPCIONAL y solo sirve para SUGERIR el
// precio al editar un producto (el dueño puede aceptarlo o escribir otro a mano); nunca se aplica solo.
// Se guarda en UNA columna JSONB (`stores.monedas`): [{"codigo":"USD","simbolo":"US$","tasa":3.7}, …].

export interface Moneda {
  /** Código corto: USD, MXN, EUR… */
  codigo: string;
  /** Lo que se escribe delante del monto: US$, MX$, € … */
  simbolo: string;
  /** Opcional: cuántos soles vale 1 unidad (1 US$ = S/ 3.70 → 3.7). Solo para sugerir precios al editar un producto. */
  tasa?: number;
}

/** Precio sugerido en una moneda a partir del precio en soles; null si la moneda no tiene cambio o no hay precio. */
export function precioSugerido(soles: number, m: Moneda): number | null {
  if (!m.tasa || m.tasa <= 0 || !(soles > 0)) return null;
  return Math.round((soles / m.tasa) * 100) / 100;
}

/** Monedas que el dueño puede activar con un toque. */
export const MONEDAS_SUGERIDAS: { codigo: string; simbolo: string; nombre: string }[] = [
  { codigo: 'USD', simbolo: 'US$', nombre: 'Dólar' },
  { codigo: 'MXN', simbolo: 'MX$', nombre: 'Peso mexicano' },
  { codigo: 'EUR', simbolo: '€', nombre: 'Euro' },
  { codigo: 'COP', simbolo: 'COL$', nombre: 'Peso colombiano' },
  { codigo: 'CLP', simbolo: 'CL$', nombre: 'Peso chileno' },
  { codigo: 'ARS', simbolo: 'AR$', nombre: 'Peso argentino' },
  { codigo: 'BRL', simbolo: 'R$', nombre: 'Real' },
];

export const simboloDe = (codigo: string) => MONEDAS_SUGERIDAS.find((m) => m.codigo === codigo)?.simbolo ?? codigo;

const MAX_MONEDAS = 4;

/** Lo que llega de la base o del formulario, limpio y acotado. */
export function normalizarMonedas(raw: unknown): Moneda[] {
  if (!Array.isArray(raw)) return [];
  const vistas = new Set<string>();
  const salida: Moneda[] = [];
  for (const m of raw) {
    const codigo = typeof (m as any)?.codigo === 'string' ? (m as any).codigo.trim().toUpperCase().slice(0, 5) : '';
    const simbolo = typeof (m as any)?.simbolo === 'string' ? (m as any).simbolo.trim().slice(0, 6) : simboloDe(codigo);
    if (!/^[A-Z]{2,5}$/.test(codigo) || codigo === 'PEN' || !simbolo || vistas.has(codigo)) continue;
    vistas.add(codigo);
    const tasa = Number(typeof (m as any)?.tasa === 'string' ? (m as any).tasa.replace(',', '.') : (m as any)?.tasa);
    salida.push(Number.isFinite(tasa) && tasa > 0 ? { codigo, simbolo, tasa } : { codigo, simbolo });
    if (salida.length >= MAX_MONEDAS) break;
  }
  return salida;
}
