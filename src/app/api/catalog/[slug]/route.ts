import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { COLS_OFERTA, aplicarOferta } from '@/lib/ofertas';
import { COL_PRESENTACIONES, leerPresentaciones } from '@/lib/presentaciones';

// Productos de UNA tienda, cacheado. Lo usan las plantillas de storefront
// (useCatalogo + las que cargan solo) en vez de que cada navegador que abre
// la tienda consulte Supabase.

export const revalidate = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // Con precio de oferta (lib/ofertas.ts); si esas columnas aún no existen, cae a las de siempre.
  const base = 'id,name,description,price,category,subcategory,image,status';
  // Cada columna extra es opcional: si su SQL aún no se corrió, cae al conjunto anterior.
  let { data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio`).eq('store', slug);
  if (error) ({ data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA},${COL_PRESENTACIONES}`).eq('store', slug) as any);
  if (error) ({ data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA}`).eq('store', slug) as any);
  if (error) ({ data, error } = await supabase.from('products').select(base).eq('store', slug) as any);

  // Si Supabase falla, 503 sin caché: así no se guarda una tienda "sin productos"
  // y Cloudflare puede servir la última copia buena (stale-if-error).
  if (error) {
    return NextResponse.json({ error: 'productos no disponibles' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    {
      products: ((data ?? []) as any[]).map(aplicarOferta).map((p: any) => {
        // Solo los productos con presentaciones llevan la lista (el resto queda como siempre).
        const { presentaciones, ...resto } = p;
        const pres = leerPresentaciones(presentaciones);
        return pres.length ? { ...resto, presentaciones: pres } : resto;
      }),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600, stale-if-error=86400' } },
  );
}
