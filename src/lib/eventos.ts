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
  /** Enlace externo de entradas o registro (Novikpass, etc.). */
  linkEntradas?: string;
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
    linkEntradas: (r.link_entradas as string) ?? '',
  };
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// Clave "AAAA-MM-DD" para ordenar. Si el evento no tiene `fecha` completa pero sí
// día y mes (los escritos a mano), se arma con el año en curso, o el siguiente si
// esa fecha ya pasó. Sin nada de eso va al final.
function claveFecha(e: Evento): string {
  if (e.fecha) return e.fecha;
  const dia = parseInt(e.dia, 10);
  const mes = MESES.indexOf((e.mes || '').toUpperCase().slice(0, 3));
  if (!dia || mes < 0) return '9999-12-31';
  const hoy = new Date();
  const hoyClave = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const armar = (y: number) => `${y}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const esteAnio = armar(hoy.getFullYear());
  return esteAnio >= hoyClave ? esteAnio : armar(hoy.getFullYear() + 1);
}

export async function fetchEventos(): Promise<Evento[]> {
  try {
    const res = await fetch('/api/eventos', { cache: 'no-store' });
    if (!res.ok) return [];
    const { events } = await res.json();
    if (!Array.isArray(events)) return [];
    // Del más próximo al más lejano. Array.sort es estable: a igual fecha se
    // respeta el orden manual que ya trae el endpoint.
    return events.map(fromRow).sort((a, b) => claveFecha(a).localeCompare(claveFecha(b)));
  } catch {
    return [];
  }
}
