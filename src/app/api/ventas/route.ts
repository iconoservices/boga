import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de Ventas (terrenos, lotes, casas, chacras — pestaña "En Venta"
// de /inmuebles), en UN endpoint cacheado. Misma regla de egress que
// /api/catalog, /api/drivers y /api/inmuebles.
//
// Solo avisos activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('sale_listings')
    .select('id,tipo,titulo,descripcion,zona,precio,moneda,area,extras,wsp,img,ciudad,orden')
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/ventas]', error.message);

  return NextResponse.json(
    { listings: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
