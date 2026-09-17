import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// "¿A dónde ir en Pucallpa?" (/eventos), en UN endpoint cacheado. Misma regla
// de egress que /api/catalog, /api/drivers y /api/eventos.

export const revalidate = 300;

export async function GET() {
  const { data } = await supabase
    .from('places')
    .select('id,nombre,tag,img,orden')
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  return NextResponse.json(
    { places: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
