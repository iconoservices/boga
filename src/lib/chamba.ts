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
  /** Fecha de publicación AAAA-MM-DD: la real si se cargó, si no el día que se subió. */
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
            publicado: (txt(r.publicado_el) || txt(r.created_at)).slice(0, 10),
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

/** "Publicado hoy / ayer / hace 5 días / el 12 sep" a partir de AAAA-MM-DD. */
export function haceCuanto(fecha?: string): string {
  if (!fecha) return '';
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return '';
  const hoy = new Date();
  const dias = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
  if (dias <= 0) return 'Publicado hoy';
  if (dias === 1) return 'Publicado ayer';
  if (dias < 30) return `Publicado hace ${dias} días`;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `Publicado el ${d} ${meses[m - 1]}`;
}
