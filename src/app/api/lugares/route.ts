import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// "¿A dónde ir en Pucallpa?" (/eventos), en UN endpoint cacheado. Misma regla
// de egress que /api/catalog, /api/drivers y /api/eventos.

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('places')
    .select('id,nombre,tag,descripcion,img,orden')
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/lugares]', error.message);
  // Si falla Supabase: 503 sin caché (no guardar una lista vacía) para que
  // Cloudflare pueda servir la última copia buena (stale-if-error).
  if (error) return NextResponse.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { places: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=86400' } },
  );
}
