import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Agenda de Eventos, en UN endpoint cacheado. /eventos lo consume en vez de
// pegarle a Supabase desde el navegador de cada visitante (misma regla de
// egress que /api/catalog y /api/drivers).
//
// Solo eventos activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  // Un evento con `fecha` cargada se oculta solo despues de pasar, sin que el
  // superadmin tenga que acordarse de ocultarlo a mano. Sin fecha (eventos
  // viejos, o el superadmin prefiere ocultar a mano), sigue igual que antes.
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('events')
    .select('id,titulo,categoria,descripcion,lugar,dia,mes,fecha,precio,organiza,img,destacado,orden,reservable,aforo')
    .eq('status', 'activo')
    .or(`fecha.is.null,fecha.gte.${hoy}`)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/eventos]', error.message);

  return NextResponse.json(
    { events: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
