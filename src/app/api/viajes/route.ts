import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de Viajes & Transporte, en UN endpoint cacheado. /viajes y el
// inicio lo consumen en vez de pegarle a Supabase desde el navegador de cada
// visitante (misma regla de egress que /api/catalog y /api/eventos).
//
// Solo rutas activas (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('travel_routes')
    .select('id,medio,destino,via,agencia,duracion,frecuencia,precio,wsp,notas,ciudad,orden')
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/viajes]', error.message);

  return NextResponse.json(
    { routes: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
