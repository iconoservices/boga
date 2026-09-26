// Viajes & Transporte (/viajes). La página los lee del endpoint cacheado
// /api/viajes (no de Supabase directo). Si la tabla `travel_routes` todavía está
// vacía, la página cae a las rutas de muestra (RUTAS en la propia página).

export type MedioViaje = 'fluvial' | 'terrestre' | 'aereo';

export type RutaViaje = {
  id: string;
  medio: MedioViaje;
  destino: string;
  via: string;
  agencia: string;
  duracion: string;
  frecuencia: string;
  precio: string;
  wsp: string;
  icon: string;
  notas?: string;
};

export const ICONO_MEDIO: Record<MedioViaje, string> = {
  fluvial: 'directions_boat',
  terrestre: 'directions_bus',
  aereo: 'flight',
};

function fromRow(r: Record<string, unknown>): RutaViaje {
  const medio = ((r.medio as string) ?? 'terrestre') as MedioViaje;
  return {
    id: String(r.id),
    medio,
    destino: (r.destino as string) ?? '',
    via: (r.via as string) ?? '',
    agencia: (r.agencia as string) ?? '',
    duracion: (r.duracion as string) ?? '',
    frecuencia: (r.frecuencia as string) ?? '',
    precio: (r.precio as string) ?? '',
    wsp: (r.wsp as string) ?? '',
    icon: ICONO_MEDIO[medio] ?? 'directions_bus',
    notas: (r.notas as string) ?? '',
  };
}

export function parseViajes(json: unknown): RutaViaje[] {
  const routes = (json as { routes?: unknown } | null)?.routes;
  return Array.isArray(routes) ? routes.map(fromRow) : [];
}

export async function fetchViajes(): Promise<RutaViaje[]> {
  try {
    const res = await fetch('/api/viajes', { cache: 'no-store' });
    if (!res.ok) return [];
    return parseViajes(await res.json());
  } catch {
    return [];
  }
}
