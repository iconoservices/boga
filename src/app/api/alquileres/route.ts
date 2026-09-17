import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de Alquileres ("Dónde quedarte"), en UN endpoint cacheado.
// /alquileres lo consume en vez de pegarle a Supabase desde el navegador de
// cada visitante (misma regla de egress que /api/catalog y /api/drivers).
//
// Solo avisos activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('rental_listings')
    .select(
      'id,tipo,titulo,zona,precio,extras,incluye_servicios,incluye_comidas,verificado,wsp,img,ciudad,orden',
    )
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/alquileres]', error.message);

  return NextResponse.json(
    { listings: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
