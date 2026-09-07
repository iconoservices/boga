// Detectar la ciudad del usuario a partir del GPS del navegador.
//
// Flujo: navigator.geolocation pide permiso -> lat/lng -> reverse-geocoding
// con BigDataCloud (endpoint client-side gratuito, sin API key, con CORS).
// Si el usuario niega el permiso o falla la red, devolvemos un error y la UI
// cae al selector manual de ciudad. Nunca bloquea nada.
//
// Privacidad: el lat/lng NO se guarda ni se manda a Supabase. Solo se usa en
// memoria para resolver el nombre de la ciudad; lo único que persiste es el
// slug ('pucallpa', 'lima', ...).

import { slugDesdeNombre } from './ciudades';

export type DeteccionCiudad =
  | { ok: true; slug: string | null; nombreCrudo: string; region: string }
  | { ok: false; motivo: 'sin-soporte' | 'permiso-denegado' | 'timeout' | 'error' };

const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

function posicionActual(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('sin-soporte'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

export async function detectarCiudad(): Promise<DeteccionCiudad> {
  let pos: GeolocationPosition;
  try {
    pos = await posicionActual();
  } catch (e: unknown) {
    const err = e as (GeolocationPositionError & { message?: string }) | undefined;
    if (err?.message === 'sin-soporte') return { ok: false, motivo: 'sin-soporte' };
    if (err && 'code' in err) {
      if (err.code === 1) return { ok: false, motivo: 'permiso-denegado' };
      if (err.code === 3) return { ok: false, motivo: 'timeout' };
    }
    return { ok: false, motivo: 'error' };
  }

  try {
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `${REVERSE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`,
    );
    if (!res.ok) return { ok: false, motivo: 'error' };
    const data = await res.json();
    const nombreCrudo: string =
      data.city || data.locality || data.principalSubdivision || '';
    const region: string = data.principalSubdivision || '';
    return {
      ok: true,
      slug: slugDesdeNombre(nombreCrudo) ?? slugDesdeNombre(region),
      nombreCrudo,
      region,
    };
  } catch {
    return { ok: false, motivo: 'error' };
  }
}
