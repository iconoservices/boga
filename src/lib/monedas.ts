// Monedas de una tienda: el cliente puede ver los precios en su moneda (dólares, pesos mexicanos…).
// Los productos se guardan UNA sola vez, en soles. Cada tienda activa las monedas que quiere y escribe su tipo de
// cambio (cuántos soles vale 1 unidad de esa moneda); el cálculo es solo para mostrar: el pedido y el cobro siguen en soles.
// Se guarda en UNA columna JSONB (`stores.monedas`): [{"codigo":"USD","simbolo":"US$","tasa":3.7}, …].
// Este archivo es puro (sin React): lo usan tokens.ts, el servidor y el hook de lib/useMoneda.ts.

export interface Moneda {
  /** Código corto: USD, MXN, EUR… */
  codigo: string;
  /** Lo que se escribe delante del monto: US$, MX$, € … */
  simbolo: string;
  /** Cuántos soles vale 1 unidad de esta moneda (1 US$ = S/ 3.70 → 3.7). */
  tasa: number;
}

/** Monedas que el dueño puede activar con un toque. Otras se pueden escribir a mano en el admin. */
export const MONEDAS_SUGERIDAS: { codigo: string; simbolo: string; nombre: string }[] = [
  { codigo: 'USD', simbolo: 'US$', nombre: 'Dólar' },
  { codigo: 'MXN', simbolo: 'MX$', nombre: 'Peso mexicano' },
  { codigo: 'EUR', simbolo: '€', nombre: 'Euro' },
  { codigo: 'COP', simbolo: 'COL$', nombre: 'Peso colombiano' },
  { codigo: 'CLP', simbolo: 'CL$', nombre: 'Peso chileno' },
  { codigo: 'ARS', simbolo: 'AR$', nombre: 'Peso argentino' },
  { codigo: 'BRL', simbolo: 'R$', nombre: 'Real' },
];

const MAX_MONEDAS = 5;

/** Lo que llega de la base o del formulario, limpio y acotado. Descarta lo que no tenga un cambio válido. */
export function normalizarMonedas(raw: unknown): Moneda[] {
  if (!Array.isArray(raw)) return [];
  const vistas = new Set<string>();
  const salida: Moneda[] = [];
  for (const m of raw) {
    const codigo = typeof (m as any)?.codigo === 'string' ? (m as any).codigo.trim().toUpperCase().slice(0, 5) : '';
    const simbolo = typeof (m as any)?.simbolo === 'string' ? (m as any).simbolo.trim().slice(0, 6) : '';
    const tasa = Number((m as any)?.tasa);
    if (!codigo || !simbolo || !Number.isFinite(tasa) || tasa <= 0 || vistas.has(codigo)) continue;
    vistas.add(codigo);
    salida.push({ codigo, simbolo, tasa });
    if (salida.length >= MAX_MONEDAS) break;
  }
  return salida;
}

// ── Moneda que el cliente tiene elegida ahora (null = soles) ──
// Vive aquí, fuera de React, para que `soles()` (tokens.ts) la lea en cualquier parte sin pasar props.
// Los componentes se suscriben con useMonedaActiva (lib/useMoneda.ts) para volver a pintarse al cambiar.
let activa: Moneda | null = null;
const oyentes = new Set<() => void>();

export const getMonedaActiva = () => activa;

export function setMonedaActiva(m: Moneda | null) {
  if (activa?.codigo === m?.codigo && activa?.tasa === m?.tasa) return;
  activa = m;
  oyentes.forEach((f) => f());
}

export function suscribirMoneda(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

const monto = (v: number) => (v >= 1000 ? Math.round(v).toLocaleString('es-PE') : v.toFixed(2));

/** Precio para mostrar: en soles, o convertido con "≈" si el cliente eligió otra moneda. */
export function formatearPrecio(soles: number): string {
  const m = activa;
  if (!m) return `S/ ${soles.toFixed(2)}`;
  return `≈ ${m.simbolo} ${monto(soles / m.tasa)}`;
}

/** Siempre en soles (para el mensaje de WhatsApp: el dueño cobra en soles). */
export const formatearSoles = (soles: number) => `S/ ${soles.toFixed(2)}`;

/** " (≈ US$ 8.10)" si hay otra moneda elegida; vacío si no. Se agrega al lado del total en soles del pedido. */
export function equivalenteEnMoneda(soles: number): string {
  const m = activa;
  if (!m) return '';
  return ` (≈ ${m.simbolo} ${monto(soles / m.tasa)} — moneda elegida: ${m.codigo})`;
}
