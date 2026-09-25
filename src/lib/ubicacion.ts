// Ubicación del celular (GPS del navegador) para el taxi. Pide permiso al usarse; nunca se guarda sola:
// cada pantalla decide qué hacer con ella (el pasajero la manda con su pedido, el chofer la manda mientras
// tiene la app abierta).

export interface Punto { lat: number; lng: number; precisionM: number }

export type ErrorUbicacion = 'sin-soporte' | 'permiso-denegado' | 'no-disponible' | 'timeout';

const MENSAJES: Record<ErrorUbicacion, string> = {
  'sin-soporte': 'Este navegador no puede dar tu ubicación.',
  'permiso-denegado': 'No diste permiso de ubicación. Actívalo en tu navegador o elige tu zona.',
  'no-disponible': 'No se pudo saber dónde estás (¿tienes el GPS del celular apagado?). Elige tu zona.',
  timeout: 'Tardó demasiado en encontrar tu ubicación. Prueba de nuevo o elige tu zona.',
};
export const mensajeUbicacion = (e: ErrorUbicacion) => MENSAJES[e];

/** Una lectura de la ubicación actual. Rechaza con un ErrorUbicacion. */
export function ubicacionActual(opts: { precisa?: boolean; esperaMs?: number } = {}): Promise<Punto> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return reject('sin-soporte' as ErrorUbicacion);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: Math.round(p.coords.accuracy) }),
      (e) => reject((e.code === 1 ? 'permiso-denegado' : e.code === 2 ? 'no-disponible' : 'timeout') as ErrorUbicacion),
      { enableHighAccuracy: opts.precisa ?? true, timeout: opts.esperaMs ?? 10_000, maximumAge: 30_000 },
    );
  });
}

/** Enlace de Google Maps a un punto (para mandarlo por WhatsApp). */
export const enlaceMapa = (p: { lat: number; lng: number }) => `https://www.google.com/maps?q=${p.lat},${p.lng}`;

/**
 * Saca latitud y longitud de lo que alguien pega: "-8.3791, -74.5539", un enlace largo de Google Maps
 * (…/@-8.37,-74.55,17z · …?q=-8.37,-74.55 · …!3d-8.37!4d-74.55). Los enlaces cortos (maps.app.goo.gl) no
 * traen las coordenadas: hay que abrirlos y copiar el enlace largo. Devuelve null si no hay coordenadas válidas.
 */
export function coordenadasDeTexto(texto: string): { lat: number; lng: number } | null {
  let t = (texto || '').trim();
  try { t = decodeURIComponent(t); } catch { /* texto con % suelto: se usa tal cual */ }
  const patrones = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?)[, ]+(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
  ];
  for (const p of patrones) {
    const m = t.match(p);
    if (!m) continue;
    const lat = Number(m[1]), lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}
