import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { precioOfertaVigente } from '@/lib/ofertas';

export const revalidate = 3600; // Refrescar cada hora

// Feed de productos para Google Merchant Center.
//
// Solo entran las tiendas que tienen prendido el módulo "google" (stores.modulos.google, lo prende
// el superadmin: es un servicio de pago). Las demás, y los productos de las demos de plantilla,
// no salen en Google.
//
// El link de cada producto es su página propia: /<tienda>/producto/<id> (las rutas /producto/<id> que
// tenía antes el feed daban 404 y Google rechaza esos artículos).

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse('Supabase no configurado', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Tiendas con el módulo de Google prendido (resuelve también la URL: subdominio o ruta)
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('slug, name, subdominio_activo')
    .eq('status', 'active')
    .filter('modulos->>google', 'eq', 'true');

  if (storesError || !stores) {
    console.error('Error cargando tiendas para feed:', storesError);
    return new NextResponse('Error cargando tiendas', { status: 500 });
  }

  const storeMap = new Map(stores.map((s) => [s.slug, s]));

  // 2. Productos de esas tiendas que no estén inactivos
  // Con galería (`images`) y categoría; si la columna de galería aún no existe, cae a lo de siempre.
  const slugsFeed = Array.from(storeMap.keys());
  let { data: products, error } = storeMap.size === 0
    ? { data: [] as any[], error: null }
    : await supabase
        .from('products')
        .select('id, name, description, price, image, images, category, store, status, stock, precio_oferta, oferta_hasta, es_servicio')
        .in('store', slugsFeed)
        .neq('status', 'Inactivo');
  if (error) {
    ({ data: products, error } = await supabase
      .from('products')
      .select('id, name, description, price, image, category, store, status, stock, precio_oferta, oferta_hasta, es_servicio')
      .in('store', slugsFeed)
      .neq('status', 'Inactivo') as any);
  }

  if (error || !products) {
    console.error('Error cargando productos para feed:', error);
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

  // Categoría de Google (taxonomía oficial) solo cuando es segura; si no, se omite y Google la deduce.
  const categoriaGoogle = (nombre: string, categoria: string): string | null => {
    const t = `${categoria} ${nombre}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/reloj|watch/.test(t)) return '201'; // Ropa y accesorios > Joyería > Relojes
    if (/lente|gafa|sunglass|goggle/.test(t)) return '178'; // Accesorios de ropa > Gafas de sol
    if (/zapat|zapatilla|calzado|sandalia/.test(t)) return '187'; // Calzado
    if (/polo|camisa|blusa|vestido|pantalon|casaca|ropa|short|falda/.test(t)) return '1604'; // Ropa
    return null;
  };

  const xmlItems = products
    // Sin foto propia no entra: Google rechaza las imágenes genéricas de relleno. Tampoco los servicios (Google no los acepta como producto) ni lo que no tiene precio.
    .filter((p: any) => typeof p.image === 'string' && /^https?:\/\//.test(p.image) && p.es_servicio !== true && (typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0) > 0)
    .map((p: any) => {
      const storeInfo = storeMap.get(p.store)!;
      const storeBrand = storeInfo.name || storeInfo.slug;
      const productUrl = storeInfo.subdominio_activo
        ? `https://${storeInfo.slug}.bogahub.app/${storeInfo.slug}/producto/${p.id}`
        : `https://bogahub.app/${storeInfo.slug}/producto/${p.id}`;

      let imageUrl = p.image || '';
      if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        imageUrl = 'https://bogahub.app/icon.png';
      }

      // En Boga, los comercios operan por catálogo activo (no con inventario numérico estricto).
      // Si el producto está Activo, se reporta 'in_stock' a Google a menos que explícitamente sea 'Agotado'.
      const isAgotado = p.status === 'Agotado' || p.status === 'Sin stock' || (p.stock !== null && p.stock !== undefined && p.stock < 0);
      const availability = isAgotado ? 'out_of_stock' : 'in_stock';
      const priceNum = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
      const formattedPrice = priceNum.toFixed(2);
      // Oferta vigente: Google pide el precio normal en g:price y el rebajado en g:sale_price.
      const ofertaNum = precioOfertaVigente(p);
      // Sin descripción propia, una descripción útil (antes repetía el nombre).
      const desc = (p.description?.trim() || `${p.name} en ${storeBrand}, Pucallpa. Precio S/ ${(ofertaNum ?? priceNum).toFixed(2)}${p.category ? ` · ${p.category}` : ''}.`).slice(0, 5000);
      const extras = (Array.isArray(p.images) ? p.images : []).filter((u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u) && u !== imageUrl).slice(0, 10);
      const catGoogle = categoriaGoogle(p.name || '', p.category || '');

      return `    <item>
      <g:id>${escapeXml(String(p.id))}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(desc)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>${extras.map((u: string) => `
      <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`).join('')}
      <g:brand>${escapeXml(storeBrand)}</g:brand>
      <g:condition>new</g:condition>${p.category ? `
      <g:product_type>${escapeXml(String(p.category))}</g:product_type>` : ''}${catGoogle ? `
      <g:google_product_category>${catGoogle}</g:google_product_category>` : ''}
      <g:availability>${availability}</g:availability>
      <g:price>${formattedPrice} PEN</g:price>${ofertaNum !== null ? `
      <g:sale_price>${ofertaNum.toFixed(2)} PEN</g:sale_price>` : ''}
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .join('\n');

  const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Boga Hub Marketplace - Catálogo de Productos</title>
    <link>https://bogahub.app</link>
    <description>Catálogo de las tiendas de Boga Hub con el servicio de Google activado</description>
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
