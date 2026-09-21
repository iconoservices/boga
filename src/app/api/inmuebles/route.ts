import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Directorio de Inmuebles ("Dónde vivir / invertir"), en UN endpoint cacheado.
// /inmuebles lo consume en vez de pegarle a Supabase desde el navegador de
// cada visitante (misma regla de egress que /api/catalog y /api/drivers).
//
// Solo avisos activos (la RLS igual filtra, pero lo pedimos explícito).
// La tabla sigue siendo `rental_listings` por compatibilidad con la data existente.

export const revalidate = 300;

export async function GET() {
  const { data, error } = await supabase
    .from('rental_listings')
    .select(
      'id,tipo,titulo,descripcion,zona,precio,extras,incluye_servicios,incluye_comidas,verificado,wsp,img,ciudad,orden',
    )
    .eq('status', 'activo')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) console.error('[api/inmuebles]', error.message);
  // Si falla Supabase: 503 sin caché (no guardar una lista vacía) para que
  // Cloudflare pueda servir la última copia buena (stale-if-error).
  if (error) return NextResponse.json({ error: 'no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json(
    { listings: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900, stale-if-error=86400' } },
  );
}
