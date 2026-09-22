// Acceso a datos de Trabajos por el LADO DEL SERVIDOR — para /trabajos/[slug]
// (la ficha de un aviso, indexable) y el sitemap. La lista completa (/trabajos)
// sigue viviendo del lado del cliente vía /api/chamba (no se toca acá).
//
// Usa el cliente anon: la RLS ya deja leer en público solo status='activo'.

import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/fechaLima';
import { slugEmpleo, type Empleo } from '@/lib/chamba';

export { slugEmpleo };

function filaAEmpleo(r: Record<string, any>): Empleo {
  return {
    id: String(r.id),
    puesto: r.puesto || '',
    negocio: r.negocio || '',
    tipo: r.tipo || '',
    zona: r.zona || '',
    pago: r.pago || '',
    wsp: r.wsp || '',
    link: r.link || '',
    img: r.img || '',
    descripcion: r.descripcion || '',
    email: r.email || '',
    subido: String(r.created_at || '').slice(0, 10),
    publicado: String(r.publicado_el || '').slice(0, 10),
    expira_el: String(r.expira_el || '').slice(0, 10) || undefined,
  };
}

/** Todos los avisos de empleo activos y vigentes (para el sitemap y para resolver el slug). */
export async function getEmpleosActivos(): Promise<Empleo[]> {
  const hoy = hoyLima();
  const { data, error } = await supabase
    .from('job_listings')
    .select('id,puesto,negocio,tipo,zona,pago,wsp,link,img,descripcion,email,publicado_el,created_at,expira_el')
    .eq('status', 'activo')
    .or(`expira_el.is.null,expira_el.gte.${hoy}`);
  if (error) return [];
  return (data ?? []).map(filaAEmpleo);
}

/** El aviso cuyo slug generado coincide con `slug`, o null. */
export async function getEmpleoPorSlug(slug: string): Promise<Empleo | null> {
  const activos = await getEmpleosActivos();
  return activos.find((e) => slugEmpleo(e) === slug) ?? null;
}
