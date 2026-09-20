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
            zona: txt(r.zona), pago: txt(r.pago), wsp: txt(r.wsp), link: txt(r.link),
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
