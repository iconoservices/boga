// Agenda de Eventos. La página los lee del endpoint cacheado /api/eventos
// (no de Supabase directo). Si la tabla `events` todavía está vacía, la
// página cae al seed hardcodeado (EVENTOS_SEED en la propia página).

export type CategoriaEvento =
  | 'Conciertos' | 'Arte & Cultura' | 'Ferias' | 'Deporte'
  | 'Cine' | 'Cursos y talleres' | 'Comidas & Bebidas' | 'Familia' | 'Fiestas';

export type Evento = {
  id: string;
  titulo: string;
  cat: CategoriaEvento;
  descripcion?: string;
  lugar: string;
  dia: string;
  mes: string;
  fecha?: string;
  precio: string;
  organiza: string;
  img: string;
  destacado?: boolean;
  reservable?: boolean;
  aforo?: number | null;
};

// Mapea una fila de la tabla `events` (snake_case) al shape que usa la UI.
function fromRow(r: Record<string, unknown>): Evento {
  return {
    id: String(r.id),
    titulo: (r.titulo as string) ?? '',
    cat: ((r.categoria as string) ?? 'Fiestas') as CategoriaEvento,
    descripcion: (r.descripcion as string) ?? '',
    lugar: (r.lugar as string) ?? '',
    dia: (r.dia as string) ?? '',
    mes: (r.mes as string) ?? '',
    fecha: (r.fecha as string) ?? '',
    precio: (r.precio as string) ?? '',
    organiza: (r.organiza as string) ?? '',
    img: (r.img as string) ?? '',
    destacado: Boolean(r.destacado),
    reservable: Boolean(r.reservable),
    aforo: r.aforo == null ? null : Number(r.aforo),
  };
}

export async function fetchEventos(): Promise<Evento[]> {
  try {
    const res = await fetch('/api/eventos', { cache: 'no-store' });
    if (!res.ok) return [];
    const { events } = await res.json();
    if (!Array.isArray(events)) return [];
    // Del más próximo al más lejano (sin fecha al final). Array.sort es estable:
    // a igual fecha se respeta el orden manual que ya trae el endpoint.
    return events.map(fromRow).sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0;
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
    });
  } catch {
    return [];
  }
}
