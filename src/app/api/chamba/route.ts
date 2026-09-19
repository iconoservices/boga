import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Chamba y oficios (/servicios): empleos + gente que ofrece su oficio, en UN
// endpoint cacheado. La página y el inicio lo consumen en vez de pegarle a
// Supabase desde el navegador de cada visitante (misma regla de egress).
// Solo filas activas (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  // Un empleo con `expira_el` se oculta solo después de esa fecha (30 días desde
  // que se publica; se renueva desde el superadmin). Sin fecha, no vence.
  const hoy = new Date().toISOString().slice(0, 10);

  const empleos = (conVencimiento: boolean) => {
    let q = supabase
      .from('job_listings')
      .select('id,puesto,negocio,tipo,zona,pago,wsp,ciudad,orden')
      .eq('status', 'activo');
    // Si todavía no se corrió el SQL de `expira_el`, esta consulta falla y se
    // repite sin el filtro para no dejar la lista vacía.
    if (conVencimiento) q = q.or(`expira_el.is.null,expira_el.gte.${hoy}`);
    return q.order('orden', { ascending: true }).order('created_at', { ascending: false });
  };

  const [jobsA, providers] = await Promise.all([
    empleos(true),
    supabase
      .from('service_providers')
      .select('id,nombre,oficio,zona,img,wsp,ciudad,orden')
      .eq('status', 'activo')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false }),
  ]);
  const jobs = jobsA.error ? await empleos(false) : jobsA;

  if (jobs.error) console.error('[api/chamba] empleos', jobs.error.message);
  if (providers.error) console.error('[api/chamba] oficios', providers.error.message);

  return NextResponse.json(
    { jobs: jobs.data ?? [], providers: providers.data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
