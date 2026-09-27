import type { StoreTheme } from './templates.config';

/**
 * Arma el tema de una tienda a partir de los colores de su logo.
 *
 * Antes se tomaba el color MÁS SATURADO del logo como principal y el fondo se decidía por quién ganaba
 * entre dos casilleros. Con un logo crema/café/dorado que tiene un ají rojo pequeño, salía la tienda
 * roja oscura: el rojo era lo más chillón, no lo más presente. Ahora manda cuánto ocupa cada color:
 *
 * - El fondo es claro (el crema del logo, aclarado) salvo que el logo sea de verdad oscuro.
 * - El color principal (botones, precios) es el más presente de los que se pueden leer con letra blanca.
 * - Los textos salen del tono más oscuro del logo (el café del nombre) y siempre con contraste suficiente.
 *
 * Es una función pura, sin librerías: la usan el navegador (superadmin) y el servidor (tiendas sin tema).
 */

/** Lo mínimo que hace falta de cada color de la paleta (lo cumple el Swatch de node-vibrant). */
export type Muestra = { hex: string; population: number } | null | undefined;
export type MuestrasDePaleta = Record<string, Muestra>;

type RGB = [number, number, number];

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

function aRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(n.slice(0, 2), 16) || 0, parseInt(n.slice(2, 4), 16) || 0, parseInt(n.slice(4, 6), 16) || 0];
}

const aHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

/** Mezcla `a` con `b`: t=0 es `a`, t=1 es `b`. */
function mezclar(a: string, b: string, t: number): string {
  const [ar, ag, ab] = aRgb(a);
  const [br, bg, bb] = aRgb(b);
  return aHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Saturación y luminosidad (HSL), de 0 a 1. */
function hsl(hex: string): { s: number; l: number } {
  const [r, g, b] = aRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  return { s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
}

const distancia = (a: string, b: string) => {
  const [ar, ag, ab] = aRgb(a);
  const [br, bg, bb] = aRgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
};

/** Oscurece `hex` (hacia negro) hasta que tenga al menos `min` de contraste contra `contra`. */
function oscurecerHasta(hex: string, contra: string, min: number): string {
  let c = hex;
  for (let t = 0; t <= 1 && contraste(c, contra) < min; t += 0.05) c = mezclar(hex, '#000000', t);
  return c;
}

/** Aclara `hex` (hacia blanco) hasta que tenga al menos `min` de contraste contra `contra`. */
function aclararHasta(hex: string, contra: string, min: number): string {
  let c = hex;
  for (let t = 0; t <= 1 && contraste(c, contra) < min; t += 0.05) c = mezclar(hex, '#ffffff', t);
  return c;
}

const TIPOGRAFIA = { fontHeadline: "'Inter', sans-serif", fontBody: "'Inter', sans-serif", fontLabel: "'Inter', sans-serif" };

export function temaDesdePaleta(paleta: MuestrasDePaleta): StoreTheme | null {
  const muestras = Object.values(paleta)
    .filter((m): m is { hex: string; population: number } => !!m?.hex)
    .map((m) => ({ hex: m.hex, pop: Math.max(1, m.population || 0), ...hsl(m.hex) }));
  if (muestras.length === 0) return null;

  const total = muestras.reduce((s, m) => s + m.pop, 0);
  // Presencia con un pequeño castigo a lo muy saturado: entre colores parecidos en tamaño gana el más apagado
  // (el café o el crema de una marca), y lo chillón (un ají rojo, un detalle) queda como acento y no como base.
  const peso = (m: { pop: number; s: number }) => m.pop * (1.5 - 0.7 * m.s);
  const porPresencia = [...muestras].sort((a, b) => peso(b) - peso(a));
  const claras = muestras.filter((m) => m.l >= 0.62);
  const oscuras = muestras.filter((m) => m.l <= 0.3);
  const parteClara = claras.reduce((s, m) => s + m.pop, 0) / total;
  const parteOscura = oscuras.reduce((s, m) => s + m.pop, 0) / total;

  // Fondo oscuro solo si el logo es claramente oscuro; ante la duda, claro (se lee mejor y es lo habitual).
  const oscuro = parteOscura > 0.6 && parteClara < 0.2;

  if (!oscuro) {
    const baseClara = [...claras].sort((a, b) => b.pop - a.pop)[0]?.hex ?? '#f6f4ef';
    const fondo = mezclar(baseClara, '#ffffff', 0.55);

    // Texto: el tono más presente de los oscuros del logo, llevado a casi negro con el mismo matiz.
    const tono = [...muestras].filter((m) => m.l <= 0.4).sort((a, b) => peso(b) - peso(a))[0]?.hex ?? '#2a2622';
    const texto = oscurecerHasta(mezclar(tono, '#000000', 0.5), fondo, 8);

    // Principal: el más presente de los que aguantan letra blanca y no son grises.
    const candidatos = porPresencia.filter((m) => m.s >= 0.12 && m.l >= 0.12 && m.l <= 0.6);
    const base = candidatos[0]?.hex ?? [...muestras].sort((a, b) => a.l - b.l)[0].hex;
    const primary = oscurecerHasta(base, '#ffffff', 4.5);
    const segundo = candidatos.find((m) => distancia(m.hex, base) > 70)?.hex ?? mezclar(primary, '#808080', 0.5);
    const secondary = oscurecerHasta(segundo, '#ffffff', 3);

    return {
      primary,
      onPrimary: '#ffffff',
      primaryContainer: mezclar(primary, '#ffffff', 0.82),
      secondary,
      secondaryContainer: mezclar(secondary, '#ffffff', 0.82),
      background: fondo,
      surface: '#ffffff',
      surfaceContainer: mezclar(baseClara, '#ffffff', 0.35),
      surfaceContainerLow: mezclar(baseClara, '#ffffff', 0.75),
      surfaceContainerLowest: '#ffffff',
      surfaceContainerHigh: mezclar(baseClara, '#000000', 0.06),
      onBackground: texto,
      onSurface: texto,
      onSurfaceVariant: oscurecerHasta(mezclar(texto, fondo, 0.3), fondo, 4.5),
      outlineVariant: mezclar(baseClara, '#000000', 0.12),
      ...TIPOGRAFIA,
    };
  }

  // Logo oscuro: fondo del tono más presente entre los oscuros y el color principal de los que se ven sobre él.
  const baseOscura = [...oscuras].sort((a, b) => b.pop - a.pop)[0]?.hex ?? '#1c1b1b';
  const fondo = mezclar(baseOscura, '#000000', 0.5);
  const texto = aclararHasta('#f1ece6', fondo, 8);
  const candidatos = porPresencia.filter((m) => m.s >= 0.12 && m.l >= 0.4);
  const primary = aclararHasta(candidatos[0]?.hex ?? [...muestras].sort((a, b) => b.l - a.l)[0].hex, fondo, 4.5);
  const onPrimary = contraste(primary, '#ffffff') >= 4.5 ? '#ffffff' : '#1a1a1a';
  const segundo = candidatos.find((m) => distancia(m.hex, primary) > 70)?.hex ?? mezclar(primary, '#808080', 0.5);
  const secondary = aclararHasta(segundo, fondo, 3);

  return {
    primary,
    onPrimary,
    primaryContainer: mezclar(primary, fondo, 0.7),
    secondary,
    secondaryContainer: mezclar(secondary, fondo, 0.7),
    background: fondo,
    surface: mezclar(fondo, '#ffffff', 0.07),
    surfaceContainer: mezclar(fondo, '#ffffff', 0.1),
    surfaceContainerLow: mezclar(fondo, '#ffffff', 0.05),
    surfaceContainerLowest: mezclar(fondo, '#000000', 0.3),
    surfaceContainerHigh: mezclar(fondo, '#ffffff', 0.15),
    onBackground: texto,
    onSurface: texto,
    onSurfaceVariant: aclararHasta(mezclar(texto, fondo, 0.3), fondo, 4.5),
    outlineVariant: mezclar(fondo, '#ffffff', 0.2),
    ...TIPOGRAFIA,
  };
}
