import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio /org: organizadores activos, cacheado (misma regla de egress
// que /api/eventos).
export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('organizers')
    .select('slug,nombre,tagline,color,logo')
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/organizers]', error.message);

  return NextResponse.json(
    { organizers: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
