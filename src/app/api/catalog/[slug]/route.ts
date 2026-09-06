import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Productos de UNA tienda, cacheado. Lo usan las plantillas de storefront
// (useCatalogo + las que cargan solo) en vez de que cada navegador que abre
// la tienda consulte Supabase.

export const revalidate = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { data } = await supabase
    .from('products')
    .select('id,name,description,price,category,subcategory,image,status')
    .eq('store', slug);

  return NextResponse.json(
    { products: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
  );
}
