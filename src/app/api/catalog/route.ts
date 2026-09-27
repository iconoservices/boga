import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enMarketplace } from '@/lib/modulos';
import { COLS_OFERTA, aplicarOferta } from '@/lib/ofertas';

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

// Cada tienda se abre DENTRO de BogaHub (/<tienda>), tenga o no subdominio propio: antes las que tenían subdominio activo se
// mandaban a su dirección <slug>.bogahub.app con target=_blank, y en el iPhone (sobre todo dentro de la app instalada) tocar la
// tarjeta no abría nada. Solo un `external_url` puesto a mano en la tienda (p. ej. Delva, que es su propio sitio) sale afuera.
// La dirección propia sigue sirviendo para instalar la app de la tienda y para compartir.
const conDireccionPropia = <T extends { slug: string; external_url?: string | null; subdominio_activo?: boolean | null }>(s: T) => {
  const { subdominio_activo: _subdominio, ...resto } = s;
  return { ...resto, external_url: s.external_url || null };
};

// `page` distingue el carrusel de banners a devolver: 'market' (default, con
// tiendas+productos) o 'home' (el Inicio "/", que no necesita ni tiendas ni
// productos — pedirlos igual seria egress de mas por nada).
// Sin fila en banner_page_settings para una pagina, cae al estilo que esa
// pagina ya tenia hardcodeado antes de que esto fuera editable.
const ESTILO_DEFECTO: Record<string, string> = { market: 'center', home: 'bottom' };

// Productos con su precio de oferta (ver lib/ofertas.ts). Si las columnas todavía no existen en la base
// (SQL de ofertas sin correr), pide las de siempre para que el catálogo no quede vacío.
async function productosConOferta() {
  const base = 'id,name,price,category,image,store,status';
  const r = await supabase.from('products').select(`${base},${COLS_OFERTA}`);
  if (!r.error) return r;
  return supabase.from('products').select(base);
}

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
      .select('slug,name,tagline,marketplace_category,template,hero_image,hero_alt,logo_image,theme,categories,status,external_url,subdominio_activo,modulos'),
    productosConOferta(),
    supabase
      .from('market_banners')
      .select('id,image,tag,title1,title2,sub,link,show_text')
      .eq('active', true)
      .eq('page', 'market')
      .order('sort_order', { ascending: true }),
    estiloPromise,
  ]);

  if (stores.error || products.error) return falloSupabase();

  // Las tiendas que el superadmin sacó del marketplace (modulos.marketplace = false) no salen acá ni
  // con sus productos; siguen abiertas en su propio link.
  const visibles = (stores.data ?? []).filter((s) => enMarketplace(s.modulos));
  const slugsVisibles = new Set(visibles.map((s) => s.slug));

  return NextResponse.json(
    {
      stores: visibles.map(({ modulos: _modulos, ...s }) => conDireccionPropia(s)),
      products: ((products.data ?? []) as any[]).filter((p) => slugsVisibles.has(p.store)).map(aplicarOferta),
      banners: banners.data ?? [],
      bannerStyle: estilo.data?.style || ESTILO_DEFECTO.market,
    },
    { headers: cacheHeaders },
  );
}
