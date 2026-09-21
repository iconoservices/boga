import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hoyLima } from '@/lib/fechaLima';

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
  const hoy = hoyLima();

  const cols = 'id,titulo,categoria,descripcion,lugar,dia,mes,fecha,precio,organiza,img,destacado,orden,reservable,aforo';
  const consulta = (extra: string) =>
    supabase
      .from('events')
      .select(cols + extra)
      .eq('status', 'activo')
      .or(`fecha.is.null,fecha.gte.${hoy}`)
      // Del más próximo al más lejano; los que no tienen fecha van al final y
      // entre ellos (o a igual fecha) manda el orden manual del superadmin.
      .order('fecha', { ascending: true, nullsFirst: false })
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });

  // `link_entradas` es una columna nueva: si todavía no se corrió el SQL, la
  // consulta falla y caemos a la de siempre para no dejar la Agenda vacía.
  let { data, error } = await consulta(',link_entradas');
  if (error) ({ data, error } = await consulta(''));

  if (error) console.error('[api/eventos]', error.message);
  // Si falla Supabase: 503 sin caché (no guardar una lista vacía) para que
  // Cloudflare pueda servir la última copia buena (stale-if-error).
  if (error) return NextResponse.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { events: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=86400' } },
  );
}
