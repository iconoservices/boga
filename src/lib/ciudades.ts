// Única fuente de verdad de "en qué ciudades opera BogaHub".
//
// Boga Market (el marketplace / hub local) arranca ciudad por ciudad, como
// Uber o Rappi. Donde NO está activo, la app igual funciona (verticales,
// suscripciones, Revista) — solo el Market muestra una lista de espera y
// medimos la demanda por ciudad (tabla `city_interest`).
//
// Para "prender" una ciudad: agrega su slug a CIUDADES_ACTIVAS y listo.

export type Ciudad = { slug: string; nombre: string; region: string };

// Nombres que el reverse-geocoding puede devolver en vez del nombre "oficial"
// de la ciudad (ej. el distrito urbano en vez de la provincia, o viceversa).
// Sin esto, alguien en Pucallpa podia recibir "Callería" o "Coronel Portillo"
// del GPS y quedar sin match porque ninguno de los dos contiene "pucallpa".
const ALIAS_CIUDAD: Record<string, string> = {
  'calleria': 'pucallpa',
  'yarinacocha': 'pucallpa',
  'manantay': 'pucallpa',
  'puerto callao': 'pucallpa',
  'coronel portillo': 'pucallpa',
  'provincia de coronel portillo': 'pucallpa',
};

// Ciudades que el selector ofrece. No es toda la lista del Perú, son las
// plazas con las que tiene sentido empezar. Agrega las que necesites.
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

// Centro y radio de cada ciudad, para ubicar al usuario por COORDENADAS y no solo por el
// nombre que devuelve el reverse-geocoding: el GPS suele dar el nombre del barrio o
// puerto más cercano ("Puerto Callao", "San José", "Campo Verde"…), que no dice
// "Pucallpa" y dejaba a la persona sin ciudad. El radio cubre el área urbana y los
// distritos vecinos (Callería, Yarinacocha, Manantay, Puerto Callao, Campo Verde).
const CENTROS: { slug: string; lat: number; lng: number; radioKm: number }[] = [
  { slug: 'pucallpa', lat: -8.3791, lng: -74.5539, radioKm: 35 },
];

export const distanciaKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};

/** Slug de la ciudad cuyo radio contiene estas coordenadas, o null si no cae en ninguna. */
export function slugPorCoordenadas(lat: number, lng: number): string | null {
  let mejor: { slug: string; d: number } | null = null;
  for (const c of CENTROS) {
    const d = distanciaKm(lat, lng, c.lat, c.lng);
    if (d <= c.radioKm && (!mejor || d < mejor.d)) mejor = { slug: c.slug, d };
  }
  return mejor?.slug ?? null;
}

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
  if (parcial) return parcial.slug;
  return ALIAS_CIUDAD[t] ?? null;
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
