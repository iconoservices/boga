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

export async function GET() {
  const [stores, products] = await Promise.all([
    supabase
      .from('stores')
      .select('slug,name,tagline,marketplace_category,template,hero_image,hero_alt,theme,categories,status'),
    supabase
      .from('products')
      .select('id,name,price,category,image,store,status'),
  ]);

  return NextResponse.json(
    { stores: stores.data ?? [], products: products.data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
