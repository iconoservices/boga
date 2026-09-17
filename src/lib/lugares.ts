// "¿A dónde ir en Pucallpa?" (/eventos). La página los lee del endpoint
// cacheado /api/lugares (no de Supabase directo). Si la tabla `places`
// todavía está vacía, la página cae al seed hardcodeado (LUGARES_SEED en la
// propia página).

export type Lugar = {
  id: string;
  nombre: string;
  tag: string;
  img: string;
};

function fromRow(r: Record<string, unknown>): Lugar {
  return {
    id: String(r.id),
    nombre: (r.nombre as string) ?? '',
    tag: (r.tag as string) ?? '',
    img: (r.img as string) ?? '',
  };
}

export async function fetchLugares(): Promise<Lugar[]> {
  try {
    const res = await fetch('/api/lugares');
    if (!res.ok) return [];
    const { places } = await res.json();
    return Array.isArray(places) ? places.map(fromRow) : [];
  } catch {
    return [];
  }
}
