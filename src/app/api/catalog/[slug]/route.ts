import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { COLS_OFERTA, aplicarOferta } from '@/lib/ofertas';
import { COL_PRESENTACIONES, leerPresentaciones } from '@/lib/presentaciones';
import { COL_PRECIOS_MONEDA, normalizarPreciosMoneda } from '@/lib/preciosMoneda';

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
  let { data, error } = await supabase.from('products').select(`${base},images,${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio,es_combo,${COL_PRECIOS_MONEDA}`).eq('store', slug);
  if (error) ({ data, error } = await supabase.from('products').select(`${base},images,${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio,es_combo`).eq('store', slug) as any);
  if (error) ({ data, error } = await supabase.from('products').select(`${base},images,${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio`).eq('store', slug) as any);
  if (error) ({ data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA},${COL_PRESENTACIONES},es_servicio`).eq('store', slug) as any);
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
        const { presentaciones, precios_moneda, ...resto } = p;
        const pres = leerPresentaciones(presentaciones);
        // Precios en otras monedas: solo viajan si el producto los tiene y no usa presentaciones (cada medida ya tiene su precio).
        const otras = pres.length ? {} : normalizarPreciosMoneda(precios_moneda);
        return {
          ...resto,
          ...(pres.length ? { presentaciones: pres } : {}),
          ...(Object.keys(otras).length ? { preciosMoneda: otras } : {}),
        };
      }),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600, stale-if-error=86400' } },
  );
}
