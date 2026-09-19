import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Chamba y oficios (/servicios): empleos + gente que ofrece su oficio, en UN
// endpoint cacheado. La página y el inicio lo consumen en vez de pegarle a
// Supabase desde el navegador de cada visitante (misma regla de egress).
// Solo filas activas (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const [jobs, providers] = await Promise.all([
    supabase
      .from('job_listings')
      .select('id,puesto,negocio,tipo,zona,pago,wsp,ciudad,orden')
      .eq('status', 'activo')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('service_providers')
      .select('id,nombre,oficio,zona,img,wsp,ciudad,orden')
      .eq('status', 'activo')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  if (jobs.error) console.error('[api/chamba] empleos', jobs.error.message);
  if (providers.error) console.error('[api/chamba] oficios', providers.error.message);

  return NextResponse.json(
    { jobs: jobs.data ?? [], providers: providers.data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
