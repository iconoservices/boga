// "¿A dónde ir en Pucallpa?" (/eventos). La página los lee del endpoint
// cacheado /api/lugares (no de Supabase directo).

export type Lugar = {
  id: string;
  nombre: string;
  tag: string;
  descripcion?: string;
  img: string;
};

function fromRow(r: Record<string, unknown>): Lugar {
  return {
    id: String(r.id),
    nombre: (r.nombre as string) ?? '',
    tag: (r.tag as string) ?? '',
    descripcion: (r.descripcion as string) ?? '',
    img: (r.img as string) ?? '',
  };
}

export function parseLugares(json: unknown): Lugar[] {
  const places = (json as { places?: unknown } | null)?.places;
  return Array.isArray(places) ? places.map(fromRow) : [];
}

export async function fetchLugares(): Promise<Lugar[]> {
  try {
    const res = await fetch('/api/lugares', { cache: 'no-store' });
    if (!res.ok) return [];
    return parseLugares(await res.json());
  } catch {
    return [];
  }
}
