import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { leerCredencialesLoyverse, tiendasConMerchantId } from '@/lib/loyverseServidor';

export const dynamic = 'force-dynamic';

// Webhook oficial de Loyverse POS para Boga Market
// Recibe eventos de 'items.update' y 'receipts.update' en tiempo real
// cuando se cobra o modifica un producto en la tablet física.

export async function GET() {
  return NextResponse.json({ ok: true, status: 'Loyverse Webhook Endpoint Activo' });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Base de datos no configurada.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    // Si no es JSON válido
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  console.log('[Loyverse Webhook] Evento recibido:', JSON.stringify(payload, null, 2));

  // Loyverse envía merchant_id o data con el ID de la tienda
  const merchantId = payload?.merchant_id || payload?.data?.merchant_id;
  const eventType = payload?.type || payload?.event;

  // Sin merchant_id no se sabe de qué tienda es el aviso: se ignora (antes se aplicaba a TODAS las tiendas con Loyverse,
  // así que cualquiera podía disparar sincronizaciones en cadena). El merchant_id solo lo conoce la tienda y Loyverse.
  if (!merchantId || typeof merchantId !== 'string') {
    return NextResponse.json({ ok: true, message: 'Aviso sin merchant_id: ignorado.' });
  }

  const slugs = await tiendasConMerchantId(supabase, merchantId);
  if (slugs.length === 0) {
    return NextResponse.json({ ok: true, message: 'Ninguna tienda coincide con el webhook.' });
  }
  const { data: filas } = await supabase.from('stores').select('slug, name, modulos').in('slug', slugs);
  const matchingStores = (filas ?? []).filter((s) => (s.modulos as { loyverse?: boolean } | null)?.loyverse);

  if (matchingStores.length === 0) {
    return NextResponse.json({ ok: true, message: 'Ninguna tienda coincide con el webhook.' });
  }

  // Ejecutar sincronización en segundo plano para cada tienda afectada
  for (const st of matchingStores) {
    const token = (await leerCredencialesLoyverse(supabase, st.slug as string))?.token;
    if (!token) continue;

    try {
      // 1. Si es receipts.update o items.update, actualizar inventario y stock
      const invUrl = new URL('https://api.loyverse.com/v1.0/inventory');
      const invRes = await fetch(invUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (invRes.ok) {
        const invData = await invRes.json();
        const invLevels = invData.inventory_levels || [];
        const variantStockMap = new Map<string, number>();

        for (const lvl of invLevels) {
          if (lvl.variant_id && typeof lvl.in_stock === 'number') {
            const actual = variantStockMap.get(lvl.variant_id) ?? 0;
            variantStockMap.set(lvl.variant_id, actual + lvl.in_stock);
          }
        }

        // Consultar productos actuales de la tienda en Boga
        const { data: currentProducts } = await supabase
          .from('products')
          .select('id, name, stock, status')
          .eq('store', st.slug);

        // Si tenemos items en Loyverse, mapeamos el stock actualizado
        const itemsRes = await fetch('https://api.loyverse.com/v1.0/items', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          const itemsList = itemsData.items || [];

          for (const item of itemsList) {
            if (item.deleted_at || !item.name) continue;

            const variants = item.variants || [];
            for (const v of variants) {
              const tieneVariantesMultiples = variants.length > 1;
              const nombreProducto = tieneVariantesMultiples && v.name && v.name.toLowerCase() !== 'regular'
                ? `${item.name.trim()} (${v.name.trim()})`
                : item.name.trim();

              const precio = parseFloat(String(v.price ?? 0)) || 0;
              let stockFinal = 999;
              let statusFinal = 'active';

              if (v.track_stock) {
                stockFinal = variantStockMap.get(v.variant_id) ?? 0;
                if (stockFinal <= 0) {
                  statusFinal = 'Agotado';
                }
              }

              // Buscar si existe en Boga
              const exist = (currentProducts || []).find(
                (p) => p.name.trim().toLowerCase() === nombreProducto.toLowerCase()
              );

              if (exist) {
                await supabase
                  .from('products')
                  .update({
                    price: precio,
                    stock: stockFinal,
                    status: statusFinal,
                  })
                  .eq('id', exist.id);
              }
            }
          }
        }
      }

      // Actualizar timestamp del webhook recibido
      await supabase
        .from('stores')
        .update({
          modulos: {
            ...st.modulos,
            loyverse_last_sync: new Date().toISOString(),
            loyverse_last_webhook: new Date().toISOString(),
          },
        })
        .eq('slug', st.slug);

      console.log(`[Loyverse Webhook] Sincronización automática exitosa para tienda: ${st.slug} (${eventType})`);
    } catch (err) {
      console.error(`[Loyverse Webhook] Error sincronizando tienda ${st.slug}:`, err);
    }
  }

  // Responder 200 OK inmediatamente a Loyverse
  return NextResponse.json({
    ok: true,
    recibido: true,
    evento: eventType,
    tiendasActualizadas: matchingStores.length,
  });
}
