import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // Refrescar cada hora

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse('Supabase no configurado', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Obtener todas las tiendas para mapear subdominios y marcas
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, slug, subdominio_activo, external_url');

  const storeMap = new Map();
  if (stores) {
    stores.forEach((s) => {
      storeMap.set(s.slug, s);
      storeMap.set(s.id, s);
    });
  }

  // 2. Obtener todos los productos activos
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active');

  if (error || !products) {
    return new NextResponse('Error cargando productos', { status: 500 });
  }

  const escapeXml = (unsafe: string) => {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const xmlItems = products
    .map((p) => {
      const storeInfo = storeMap.get(p.store);

      let productUrl = `https://bogahub.app/producto/${p.slug || p.id}`;
      let storeBrand = 'Boga Hub';

      if (storeInfo) {
        storeBrand = storeInfo.name || storeInfo.slug;
        if (storeInfo.subdominio_activo) {
          productUrl = `https://${storeInfo.slug}.bogahub.app/producto/${p.slug || p.id}`;
        } else {
          productUrl = `https://bogahub.app/${storeInfo.slug}/producto/${p.slug || p.id}`;
        }
      }

      const imageUrl = p.image || (Array.isArray(p.images) ? p.images[0] : null) || 'https://bogahub.app/icon.png';
      const inStock = p.stock === undefined || p.stock === null || p.stock > 0;
      const availability = inStock ? 'in_stock' : 'out_of_stock';
      const priceNum = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
      const formattedPrice = priceNum.toFixed(2);

      return `    <item>
      <g:id>${escapeXml(String(p.id))}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description || p.name)}</g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:brand>${escapeXml(storeBrand)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${formattedPrice} PEN</g:price>
      <g:google_product_category>${escapeXml(p.category || 'Apparel & Accessories')}</g:google_product_category>
    </item>`;
    })
    .join('\n');

  const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Boga Hub Marketplace - Catálogo de Productos</title>
    <link>https://bogahub.app</link>
    <description>Catálogo unificado de tiendas y productos de Boga Hub y Delva</description>
${xmlItems}
  </channel>
</rss>`;

  return new NextResponse(xmlFeed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
