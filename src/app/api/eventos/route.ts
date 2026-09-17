import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Agenda de Eventos, en UN endpoint cacheado. /eventos lo consume en vez de
// pegarle a Supabase desde el navegador de cada visitante (misma regla de
// egress que /api/catalog y /api/drivers).
//
// Solo eventos activos (la RLS igual filtra, pero lo pedimos explícito).

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('events')
    .select('id,titulo,categoria,descripcion,lugar,dia,mes,precio,organiza,img,destacado,orden')
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/eventos]', error.message);

  return NextResponse.json(
    { events: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
