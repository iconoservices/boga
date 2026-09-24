import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de choferes de Taxi Seguro, en UN endpoint cacheado. /transporte
// lo consume en vez de pegarle a Supabase desde el navegador de cada visitante
// (misma regla de egress que /api/catalog).
//
// Solo choferes activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('drivers')
    .select(
      'id,nombre,tipo,comite,experiencia,placa,modelo,sellos,ruta,precio,paradero,resena,resena_autor,tel,img,veh_img,ciudad,orden',
    )
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/drivers]', error.message);
  // Si falla Supabase: 503 sin caché (no guardar una lista vacía) para que
  // Cloudflare pueda servir la última copia buena (stale-if-error).
  if (error) return NextResponse.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { drivers: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=86400' } },
  );
}
