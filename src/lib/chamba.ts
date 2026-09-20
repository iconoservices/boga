import { fechaLima, hoyLima } from '@/lib/fechaLima';

// Chamba y oficios (/servicios). La página los lee del endpoint cacheado
// /api/chamba (no de Supabase directo). Si las tablas `job_listings` y
// `service_providers` todavía están vacías, la página cae a los de muestra.

export type Empleo = {
  id: string;
  puesto: string;
  negocio: string;
  tipo: string;
  zona: string;
  pago: string;
  wsp: string;
  /** Enlace de la publicación / formulario. Si está, "Postular" lleva ahí. */
  link?: string;
  /** Imagen (flyer) del aviso, opcional. */
  img?: string;
  /** Requisitos, funciones, beneficios. */
  descripcion?: string;
  /** Correo para enviar el CV. */
  email?: string;
  /** Día en que se subió a BogaHub (AAAA-MM-DD). */
  subido?: string;
  /** Fecha del aviso original (AAAA-MM-DD), solo si se cargó a mano. */
  publicado?: string;
};

export type Oficio = {
  id: string;
  nombre: string;
  oficio: string;
  zona: string;
  img: string;
  wsp: string;
  rating?: string;
  trabajos?: number;
};

const txt = (v: unknown) => (typeof v === 'string' ? v : '');

export async function fetchChamba(): Promise<{ empleos: Empleo[]; oficios: Oficio[] }> {
  try {
    const res = await fetch('/api/chamba', { cache: 'no-store' });
    if (!res.ok) return { empleos: [], oficios: [] };
    const { jobs, providers } = await res.json();
    return {
      empleos: Array.isArray(jobs)
        ? jobs.map((r: Record<string, unknown>) => ({
            id: String(r.id), puesto: txt(r.puesto), negocio: txt(r.negocio), tipo: txt(r.tipo),
            zona: txt(r.zona), pago: txt(r.pago), wsp: txt(r.wsp), link: txt(r.link), img: txt(r.img), descripcion: txt(r.descripcion), email: txt(r.email),
            subido: txt(r.created_at) ? fechaLima(txt(r.created_at)) : '',
            publicado: txt(r.publicado_el).slice(0, 10),
          }))
        : [],
      oficios: Array.isArray(providers)
        ? providers.map((r: Record<string, unknown>) => ({
            id: String(r.id), nombre: txt(r.nombre), oficio: txt(r.oficio), zona: txt(r.zona),
            img: txt(r.img), wsp: txt(r.wsp),
          }))
        : [],
    };
  } catch {
    return { empleos: [], oficios: [] };
  }
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function partes(fecha?: string): { y: number; m: number; d: number } | null {
  if (!fecha) return null;
  const [y, m, d] = fecha.split('-').map(Number);
  return y && m && d ? { y, m, d } : null;
}

/** "Subido hoy / ayer / hace 5 días / el 12 sep" a partir de AAAA-MM-DD. */
export function haceCuanto(fecha?: string): string {
  const f = partes(fecha);
  if (!f) return '';
  const [hy, hm, hd] = hoyLima().split('-').map(Number);
  const dias = Math.round((Date.UTC(hy, hm - 1, hd) - Date.UTC(f.y, f.m - 1, f.d)) / 86400000);
  if (dias <= 0) return 'Subido hoy';
  if (dias === 1) return 'Subido ayer';
  if (dias < 30) return `Subido hace ${dias} días`;
  return `Subido el ${f.d} ${MESES[f.m - 1]}`;
}

/** "Aviso del 12 sep" (la fecha del aviso original, si se cargó). */
export function fechaAviso(fecha?: string): string {
  const f = partes(fecha);
  return f ? `Aviso del ${f.d} ${MESES[f.m - 1]}` : '';
}
