import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Catálogo completo del marketplace (todas las tiendas + productos), en UN
// endpoint cacheado. /market y /explore lo consumen en vez de pegarle a
// Supabase desde el navegador de cada visitante.
//
// Antes: cada visita a /market bajaba la tabla entera de `products` con
// select('*'). Con tráfico o un bot, eso se comía los GB de egress de Supabase.
// Ahora: Supabase se consulta como máximo 1 vez cada 2 min y el resto sale del
// caché de Vercel. Se piden solo las columnas que el marketplace muestra
// (sin `description`, que es el campo pesado).

export const revalidate = 120;

// `page` distingue el carrusel de banners a devolver: 'market' (default, con
// tiendas+productos) o 'home' (el Inicio "/", que no necesita ni tiendas ni
// productos — pedirlos igual seria egress de mas por nada).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || 'market';
  const cacheHeaders = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };

  if (page !== 'market') {
    const { data: banners } = await supabase
      .from('market_banners')
      .select('id,image,tag,title1,title2,sub,link')
      .eq('active', true)
      .eq('page', page)
      .order('sort_order', { ascending: true });
    return NextResponse.json({ stores: [], products: [], banners: banners ?? [] }, { headers: cacheHeaders });
  }

  const [stores, products, banners] = await Promise.all([
    supabase
      .from('stores')
      .select('slug,name,tagline,marketplace_category,template,hero_image,hero_alt,logo_image,theme,categories,status'),
    supabase
      .from('products')
      .select('id,name,price,category,image,store,status'),
    supabase
      .from('market_banners')
      .select('id,image,tag,title1,title2,sub,link')
      .eq('active', true)
      .eq('page', 'market')
      .order('sort_order', { ascending: true }),
  ]);

  return NextResponse.json(
    { stores: stores.data ?? [], products: products.data ?? [], banners: banners.data ?? [] },
    { headers: cacheHeaders },
  );
}
