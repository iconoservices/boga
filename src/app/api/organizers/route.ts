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
  // Si falla Supabase: 503 sin caché (no guardar una lista vacía) para que
  // Cloudflare pueda servir la última copia buena (stale-if-error).
  if (error) return NextResponse.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { organizers: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=86400' } },
  );
}
