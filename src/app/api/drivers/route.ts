import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de choferes de Taxi Seguro, en UN endpoint cacheado. /transporte
// lo consume en vez de pegarle a Supabase desde el navegador de cada visitante
// (misma regla de egress que /api/catalog).
//
// Solo choferes activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

const COLUMNAS = 'id,nombre,tipo,comite,experiencia,placa,modelo,sellos,ruta,precio,paradero,resena,resena_autor,tel,img,veh_img,ciudad,orden';

const pedir = (columnas: string) =>
  supabase
    .from('drivers')
    .select(columnas)
    .eq('status', 'activo')
    .neq('tipo', 'Repartidor')   // los repartidores propios de las tiendas no son del directorio
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

export async function GET() {
  // `horario_semana` es una columna nueva: si todavía no se corrió el SQL, se sigue sirviendo el directorio sin horarios.
  let { data, error } = await pedir(`${COLUMNAS},horario_semana`);
  if (error && /horario_semana/.test(error.message)) ({ data, error } = await pedir(COLUMNAS));

  if (error) console.error('[api/drivers]', error.message);
  // Si falla Supabase: 503 sin caché (no guardar una lista vacía) para que
  // Cloudflare pueda servir la última copia buena (stale-if-error).
  if (error) return NextResponse.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { drivers: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=86400' } },
  );
}
