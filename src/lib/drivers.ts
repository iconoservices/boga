// Choferes de Taxi Seguro. La página los lee del endpoint cacheado
// /api/drivers (no de Supabase directo). Si la tabla `drivers` todavía está
// vacía, la página cae al seed hardcodeado (CHOFERES_SEED en la propia página).

export type Chofer = {
  id: string;
  nombre: string;
  tipo: 'Mototaxi' | 'Auto' | 'Moto';
  comite: string;
  experiencia: string;
  placa: string;
  modelo: string;
  sellos: { label: string; icon: string; fuerte?: boolean }[];
  ruta: string;
  precio: string;
  paradero: string;
  resena: string;
  resenaAutor: string;
  tel: string;
  img: string;
  vehImg: string;
};

// Mapea una fila de la tabla `drivers` (snake_case) al shape que usa la UI.
function fromRow(r: Record<string, unknown>): Chofer {
  return {
    id: String(r.id),
    nombre: (r.nombre as string) ?? '',
    tipo: ((r.tipo as string) ?? 'Mototaxi') as Chofer['tipo'],
    comite: (r.comite as string) ?? '',
    experiencia: (r.experiencia as string) ?? '',
    placa: (r.placa as string) ?? '',
    modelo: (r.modelo as string) ?? '',
    sellos: Array.isArray(r.sellos) ? (r.sellos as Chofer['sellos']) : [],
    ruta: (r.ruta as string) ?? '',
    precio: (r.precio as string) ?? '',
    paradero: (r.paradero as string) ?? '',
    resena: (r.resena as string) ?? '',
    resenaAutor: (r.resena_autor as string) ?? '',
    tel: (r.tel as string) ?? '',
    img: (r.img as string) ?? '',
    vehImg: (r.veh_img as string) ?? '',
  };
}

export async function fetchChoferes(): Promise<Chofer[]> {
  try {
    const res = await fetch('/api/drivers');
    if (!res.ok) return [];
    const { drivers } = await res.json();
    return Array.isArray(drivers) ? drivers.map(fromRow) : [];
  } catch {
    return [];
  }
}
