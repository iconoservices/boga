import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/fechaLima';

// Espacio /org/<slug>: el organizador + sus proximas noches (eventos activos
// ligados por organizer_id que todavia no pasaron). Cacheado.
export const revalidate = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const { data: org } = await supabase
    .from('organizers')
    .select('id,slug,nombre,tagline,color,logo')
    .eq('slug', slug)
    .eq('status', 'activo')
    .maybeSingle();

  if (!org) return NextResponse.json({ organizer: null, noches: [] }, { status: 404 });

  const hoy = hoyLima();
  const { data: noches, error } = await supabase
    .from('events')
    .select('id,titulo,dia,mes,fecha,precio,reservable,aforo')
    .eq('organizer_id', org.id)
    .eq('status', 'activo')
    .or(`fecha.is.null,fecha.gte.${hoy}`)
    .order('fecha', { ascending: true, nullsFirst: false });

  if (error) console.error('[api/organizers/slug]', error.message);

  return NextResponse.json(
    { organizer: org, noches: noches ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
