// Sorteos (/sorteos y el inicio). Se leen del endpoint cacheado /api/sorteos, que
// cuenta los tickets en el servidor: la web pública nunca ve nombres ni WhatsApp.

export type Sorteo = {
  id: string;
  titulo: string;
  descripcion: string;
  img: string;
  patrocinador: string;
  comoParticipar: string;
  precioTicket: string;
  /** Tope de tickets; null = sin límite (se sortea a mano). */
  meta: number | null;
  vendidos: number;
  cierraEl: string;
  status: 'abierto' | 'sorteado';
  /** Solo si ya se sorteó: nombre abreviado ("María Q.") y número de ticket. */
  ganador?: { nombre: string; numero: number };
  sorteadoEl?: string;
};

const txt = (v: unknown) => (typeof v === 'string' ? v : '');

export function parseSorteos(json: unknown): Sorteo[] {
  const raffles = (json as { raffles?: unknown } | null)?.raffles;
  if (!Array.isArray(raffles)) return [];
  return raffles.map((r: Record<string, any>) => ({
    id: String(r.id),
    titulo: txt(r.titulo),
    descripcion: txt(r.descripcion),
    img: txt(r.img),
    patrocinador: txt(r.patrocinador),
    comoParticipar: txt(r.como_participar),
    precioTicket: txt(r.precio_ticket),
    meta: Number(r.meta_tickets) > 0 ? Number(r.meta_tickets) : null,
    vendidos: Number(r.vendidos) || 0,
    cierraEl: txt(r.cierra_el),
    status: r.status === 'sorteado' ? 'sorteado' : 'abierto',
    ganador: r.ganador ? { nombre: txt(r.ganador.nombre), numero: Number(r.ganador.numero) || 0 } : undefined,
    sorteadoEl: txt(r.sorteado_el),
  }));
}

export async function fetchSorteos(): Promise<Sorteo[]> {
  try {
    const res = await fetch('/api/sorteos', { cache: 'no-store' });
    if (!res.ok) return [];
    return parseSorteos(await res.json());
  } catch {
    return [];
  }
}
