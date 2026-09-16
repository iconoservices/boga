// Avisos de Alquileres ("Dónde quedarte"). La página los lee del endpoint
// cacheado /api/alquileres (no de Supabase directo). Si la tabla
// `rental_listings` todavía está vacía, la página cae al seed hardcodeado
// (AVISOS_SEED en la propia página).

export type TipoAviso = 'Habitación' | 'Mini-dpto' | 'Casa' | 'Pensión';

export type Aviso = {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  zona: string;
  precio: number;
  extras: string[];
  incluyeServicios?: boolean;
  incluyeComidas?: boolean;
  verificado?: boolean;
  wsp: string;
  img: string;
};

// Mapea una fila de la tabla `rental_listings` (snake_case) al shape que usa la UI.
function fromRow(r: Record<string, unknown>): Aviso {
  return {
    id: String(r.id),
    tipo: ((r.tipo as string) ?? 'Habitación') as TipoAviso,
    titulo: (r.titulo as string) ?? '',
    zona: (r.zona as string) ?? '',
    precio: Number(r.precio) || 0,
    extras: Array.isArray(r.extras) ? (r.extras as string[]) : [],
    incluyeServicios: Boolean(r.incluye_servicios),
    incluyeComidas: Boolean(r.incluye_comidas),
    verificado: Boolean(r.verificado),
    wsp: (r.wsp as string) ?? '',
    img: (r.img as string) ?? '',
  };
}

export async function fetchAlquileres(): Promise<Aviso[]> {
  try {
    const res = await fetch('/api/alquileres');
    if (!res.ok) return [];
    const { listings } = await res.json();
    return Array.isArray(listings) ? listings.map(fromRow) : [];
  } catch {
    return [];
  }
}
