// Única fuente de verdad de "en qué ciudades opera Boga".
//
// Boga Market (el marketplace / hub local) arranca ciudad por ciudad, como
// Uber o Rappi. Donde NO está activo, la app igual funciona (verticales,
// suscripciones, Revista) — solo el Market muestra una lista de espera y
// medimos la demanda por ciudad (tabla `city_interest`).
//
// Para "prender" una ciudad: agregá su slug a CIUDADES_ACTIVAS y listo.

export type Ciudad = { slug: string; nombre: string; region: string };

// Ciudades que el selector ofrece. No es toda la lista del Perú, son las
// plazas con las que tiene sentido empezar. Agregá las que necesites.
export const CIUDADES: Ciudad[] = [
  { slug: 'pucallpa',    nombre: 'Pucallpa',    region: 'Ucayali' },
  { slug: 'lima',        nombre: 'Lima',        region: 'Lima' },
  { slug: 'arequipa',    nombre: 'Arequipa',    region: 'Arequipa' },
  { slug: 'trujillo',    nombre: 'Trujillo',    region: 'La Libertad' },
  { slug: 'chiclayo',    nombre: 'Chiclayo',    region: 'Lambayeque' },
  { slug: 'piura',       nombre: 'Piura',       region: 'Piura' },
  { slug: 'cusco',       nombre: 'Cusco',       region: 'Cusco' },
  { slug: 'huancayo',    nombre: 'Huancayo',    region: 'Junín' },
  { slug: 'iquitos',     nombre: 'Iquitos',     region: 'Loreto' },
  { slug: 'tarapoto',    nombre: 'Tarapoto',    region: 'San Martín' },
  { slug: 'cajamarca',   nombre: 'Cajamarca',   region: 'Cajamarca' },
  { slug: 'juliaca',     nombre: 'Juliaca',     region: 'Puno' },
  { slug: 'ica',         nombre: 'Ica',         region: 'Ica' },
  { slug: 'tacna',       nombre: 'Tacna',       region: 'Tacna' },
  { slug: 'pisco',       nombre: 'Pisco',       region: 'Ica' },
  { slug: 'huanuco',     nombre: 'Huánuco',     region: 'Huánuco' },
];

// Las únicas donde Boga Market está vivo hoy.
export const CIUDADES_ACTIVAS: string[] = ['pucallpa'];

export const CIUDAD_DEFECTO = 'pucallpa';

export function ciudadPorSlug(slug: string | null | undefined): Ciudad | undefined {
  if (!slug) return undefined;
  return CIUDADES.find((c) => c.slug === slug);
}

export function esCiudadActiva(slug: string | null | undefined): boolean {
  return !!slug && CIUDADES_ACTIVAS.includes(slug);
}

// Matchea un nombre libre ("Pucallpa", "Callería", "prov. Coronel Portillo")
// contra la lista. Devuelve el slug o null. Se usa con el resultado del
// reverse-geocoding, que no siempre da el nombre exacto del distrito.
export function slugDesdeNombre(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  const t = norm(texto);
  const exacta = CIUDADES.find((c) => norm(c.nombre) === t);
  if (exacta) return exacta.slug;
  const parcial = CIUDADES.find((c) => t.includes(c.slug) || c.slug.includes(t));
  return parcial ? parcial.slug : null;
}

// ── Persistencia (por navegador) ──
const LS_KEY = 'boga_ciudad';

export function leerCiudadGuardada(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

export function guardarCiudad(slug: string) {
  try {
    localStorage.setItem(LS_KEY, slug);
    // otras pestañas / componentes que escuchen
    window.dispatchEvent(new CustomEvent('boga:ciudad', { detail: slug }));
  } catch {
    /* modo incógnito, etc. */
  }
}
