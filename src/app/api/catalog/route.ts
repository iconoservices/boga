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
// Sin fila en banner_page_settings para una pagina, cae al estilo que esa
// pagina ya tenia hardcodeado antes de que esto fuera editable.
const ESTILO_DEFECTO: Record<string, string> = { market: 'center', home: 'bottom' };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || 'market';
  // stale-if-error: si Supabase falla (p. ej. 402 por egress), Cloudflare sigue
  // sirviendo la última copia buena hasta 24 h en vez de mostrar el catálogo vacío.
  const cacheHeaders = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600, stale-if-error=86400' };
  const falloSupabase = () =>
    NextResponse.json({ error: 'catalogo no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const estiloPromise = supabase.from('banner_page_settings').select('style').eq('page', page).maybeSingle();

  if (page !== 'market') {
    const [{ data: banners, error: errBanners }, { data: estilo }] = await Promise.all([
      supabase
        .from('market_banners')
        .select('id,image,tag,title1,title2,sub,link,show_text')
        .eq('active', true)
        .eq('page', page)
        .order('sort_order', { ascending: true }),
      estiloPromise,
    ]);
    if (errBanners) return falloSupabase();
    return NextResponse.json(
      { stores: [], products: [], banners: banners ?? [], bannerStyle: estilo?.style || ESTILO_DEFECTO[page] || 'center' },
      { headers: cacheHeaders },
    );
  }

  const [stores, products, banners, estilo] = await Promise.all([
    supabase
      .from('stores')
      .select('slug,name,tagline,marketplace_category,template,hero_image,hero_alt,logo_image,theme,categories,status,external_url'),
    supabase
      .from('products')
      .select('id,name,price,category,image,store,status'),
    supabase
      .from('market_banners')
      .select('id,image,tag,title1,title2,sub,link,show_text')
      .eq('active', true)
      .eq('page', 'market')
      .order('sort_order', { ascending: true }),
    estiloPromise,
  ]);

  if (stores.error || products.error) return falloSupabase();

  return NextResponse.json(
    {
      stores: stores.data ?? [],
      products: products.data ?? [],
      banners: banners.data ?? [],
      bannerStyle: estilo.data?.style || ESTILO_DEFECTO.market,
    },
    { headers: cacheHeaders },
  );
}
