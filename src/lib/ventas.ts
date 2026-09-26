// Avisos de Venta (terrenos, lotes, casas, chacras — pestaña "En Venta" de
// /inmuebles). La página los lee del endpoint cacheado /api/ventas (no de
// Supabase directo).

export type TipoVenta = 'Terreno' | 'Lote' | 'Casa' | 'Chacra';

export type AvisoVenta = {
  id: string;
  tipo: TipoVenta;
  titulo: string;
  descripcion?: string;
  zona: string;
  precio: number;
  moneda: 'PEN' | 'USD';
  area: string;
  extras: string[];
  wsp: string;
  img: string;
};

// Mapea una fila de la tabla `sale_listings` (snake_case) al shape que usa la UI.
function fromRow(r: Record<string, unknown>): AvisoVenta {
  return {
    id: String(r.id),
    tipo: ((r.tipo as string) ?? 'Terreno') as TipoVenta,
    titulo: (r.titulo as string) ?? '',
    descripcion: (r.descripcion as string) ?? '',
    zona: (r.zona as string) ?? '',
    precio: Number(r.precio) || 0,
    moneda: ((r.moneda as string) ?? 'PEN') as 'PEN' | 'USD',
    area: (r.area as string) ?? '',
    extras: Array.isArray(r.extras) ? (r.extras as string[]) : [],
    wsp: (r.wsp as string) ?? '',
    img: (r.img as string) ?? '',
  };
}

export function parseVentas(json: unknown): AvisoVenta[] {
  const listings = (json as { listings?: unknown } | null)?.listings;
  return Array.isArray(listings) ? listings.map(fromRow) : [];
}

export async function fetchVentas(): Promise<AvisoVenta[]> {
  try {
    const res = await fetch('/api/ventas', { cache: 'no-store' });
    if (!res.ok) return [];
    return parseVentas(await res.json());
  } catch {
    return [];
  }
}
