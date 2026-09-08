import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de choferes de Taxi Seguro, en UN endpoint cacheado. /taxi-seguro
// lo consume en vez de pegarle a Supabase desde el navegador de cada visitante
// (misma regla de egress que /api/catalog).
//
// Solo choferes activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const { data } = await supabase
    .from('drivers')
    .select(
      'id,nombre,tipo,comite,experiencia,placa,modelo,sellos,ruta,precio,paradero,resena,resena_autor,tel,img,veh_img,ciudad,orden',
    )
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  return NextResponse.json(
    { drivers: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
