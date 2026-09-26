import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface LoyverseVariant {
  variant_id: string;
  item_id: string;
  sku?: string;
  name?: string;
  price?: number | string;
  cost?: number | string;
  track_stock?: boolean;
}

interface LoyverseItem {
  id: string;
  handle?: string;
  name: string;
  description?: string;
  category_id?: string;
  variants?: LoyverseVariant[];
  deleted_at?: string | null;
}

interface LoyverseCategory {
  id: string;
  name: string;
  deleted_at?: string | null;
}

interface LoyverseInventoryLevel {
  variant_id: string;
  store_id?: string;
  in_stock?: number;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Configuración de base de datos no disponible.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: {
    storeSlug: string;
    token?: string;
    syncStock?: boolean;
    updatePrices?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { storeSlug, syncStock = true, updatePrices = true } = body;

  if (!storeSlug) {
    return NextResponse.json({ ok: false, error: 'Se requiere el slug de la tienda.' }, { status: 400 });
  }

  // 1. Obtener la tienda y verificar token
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('slug, name, modulos')
    .eq('slug', storeSlug)
    .maybeSingle();

  if (storeError || !store) {
    return NextResponse.json({ ok: false, error: 'Tienda no encontrada.' }, { status: 404 });
  }

  const loyverseToken = body.token?.trim() || store.modulos?.loyverse_token;

  if (!loyverseToken) {
    return NextResponse.json({
      ok: false,
      error: 'No hay un Token de Acceso de Loyverse configurado para esta tienda.',
    }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${loyverseToken}`,
    'Content-Type': 'application/json',
  };

  try {
    // 2. Obtener categorías de Loyverse
    const categoriesMap = new Map<string, string>();
    try {
      let catCursor: string | null = null;
      do {
        const catUrl = new URL('https://api.loyverse.com/v1.0/categories');
        if (catCursor) catUrl.searchParams.set('cursor', catCursor);
        const resCat = await fetch(catUrl.toString(), { headers, next: { revalidate: 0 } });
        if (resCat.ok) {
          const catData = await resCat.json();
          for (const c of (catData.categories as LoyverseCategory[] || [])) {
            if (!c.deleted_at && c.name) {
              categoriesMap.set(c.id, c.name.trim());
            }
          }
          catCursor = catData.cursor || null;
        } else {
          break;
        }
      } while (catCursor);
    } catch (e) {
      console.warn('[Loyverse Sync] No se pudieron cargar categorías:', e);
    }

    // 3. Obtener niveles de inventario (si syncStock está activo)
    const inventoryMap = new Map<string, number>();
    if (syncStock) {
      try {
        let invCursor: string | null = null;
        do {
          const invUrl = new URL('https://api.loyverse.com/v1.0/inventory');
          if (invCursor) invUrl.searchParams.set('cursor', invCursor);
          const resInv = await fetch(invUrl.toString(), { headers, next: { revalidate: 0 } });
          if (resInv.ok) {
            const invData = await resInv.json();
            for (const inv of (invData.inventory_levels as LoyverseInventoryLevel[] || [])) {
              if (inv.variant_id && typeof inv.in_stock === 'number') {
                const actual = inventoryMap.get(inv.variant_id) ?? 0;
                inventoryMap.set(inv.variant_id, actual + inv.in_stock);
              }
            }
            invCursor = invData.cursor || null;
          } else {
            break;
          }
        } while (invCursor);
      } catch (e) {
        console.warn('[Loyverse Sync] No se pudo cargar inventario:', e);
      }
    }

    // 4. Obtener todos los productos (Items) de Loyverse
    const allItems: LoyverseItem[] = [];
    let itemCursor: string | null = null;
    let paginas = 0;

    do {
      paginas++;
      const itemUrl = new URL('https://api.loyverse.com/v1.0/items');
      if (itemCursor) itemUrl.searchParams.set('cursor', itemCursor);

      const resItems = await fetch(itemUrl.toString(), { headers, credentials: 'omit', cache: 'no-store' });

      if (!resItems.ok) {
        const errorText = await resItems.text();
        console.error('[Loyverse Sync] Error respuesta Loyverse:', resItems.status, errorText);
        if (resItems.status === 401) {
          return NextResponse.json({
            ok: false,
            error: 'El Token de Loyverse es inválido o ha expirado. Verifica el token en tu Back Office.',
          }, { status: 401 });
        }
        return NextResponse.json({
          ok: false,
          error: `Error al conectar con Loyverse (${resItems.status}): ${errorText.slice(0, 150)}`,
        }, { status: 400 });
      }

      const itemData = await resItems.json();
      const itemsList = (itemData.items as LoyverseItem[]) || [];
      for (const item of itemsList) {
        if (!item.deleted_at && item.name) {
          allItems.push(item);
        }
      }

      itemCursor = itemData.cursor || null;
    } while (itemCursor && paginas < 15); // límite de seguridad para evitar loops

    if (allItems.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No se encontraron productos activos en la cuenta de Loyverse.',
        creados: 0,
        actualizados: 0,
        total: 0,
      });
    }

    // 5. Cargar los productos actuales de esta tienda en Boga Market
    const { data: existingProducts, error: fetchErr } = await supabase
      .from('products')
      .select('id, name, price, stock, status, category, image, description')
      .eq('store', storeSlug);

    if (fetchErr) {
      console.error('[Loyverse Sync] Error leyendo productos de Boga:', fetchErr);
      return NextResponse.json({ ok: false, error: 'Error al consultar productos existentes en la tienda.' }, { status: 500 });
    }

    // Mapa de productos existentes por nombre normalizado (lowercase trim)
    const existingByName = new Map<string, typeof existingProducts[0]>();
    for (const p of existingProducts || []) {
      if (p.name) existingByName.set(p.name.trim().toLowerCase(), p);
    }

    let creados = 0;
    let actualizados = 0;

    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    // 6. Mapear productos de Loyverse
    for (const item of allItems) {
      const catName = (item.category_id && categoriesMap.get(item.category_id)) || 'General';
      const variants = item.variants && item.variants.length > 0 ? item.variants : [];

      if (variants.length === 0) {
        variants.push({
          variant_id: item.id,
          item_id: item.id,
          name: 'Regular',
          price: 0,
          track_stock: false,
        });
      }

      for (const v of variants) {
        const tieneVariantesMultiples = variants.length > 1;
        const nombreProducto = tieneVariantesMultiples && v.name && v.name.toLowerCase() !== 'regular'
          ? `${item.name.trim()} (${v.name.trim()})`
          : item.name.trim();

        const precio = parseFloat(String(v.price ?? 0)) || 0;
        
        let stockFinal = 999; // Stock ilimitado por defecto si no trackea
        let statusFinal = 'active';

        if (syncStock && v.track_stock) {
          stockFinal = inventoryMap.get(v.variant_id) ?? 0;
          if (stockFinal <= 0) {
            statusFinal = 'Agotado';
          }
        }

        const clave = nombreProducto.toLowerCase();
        const existing = existingByName.get(clave);

        if (existing) {
          // Actualización de producto existente
          const updateData: Record<string, any> = {};
          if (updatePrices) updateData.price = precio;
          if (syncStock) {
            updateData.stock = stockFinal;
            updateData.status = statusFinal;
          }
          if (catName && (!existing.category || existing.category === 'General')) {
            updateData.category = catName;
          }
          if (item.description && !existing.description) {
            updateData.description = item.description;
          }

          if (Object.keys(updateData).length > 0) {
            toUpdate.push({ id: existing.id, data: updateData });
            actualizados++;
          }
        } else {
          // Producto nuevo para insertar
          toInsert.push({
            name: nombreProducto,
            store: storeSlug,
            price: precio,
            category: catName,
            stock: stockFinal,
            status: statusFinal,
            image: '', // Preservamos o dejamos listo para subir foto en Boga
            description: item.description || '',
          });
          creados++;
        }
      }
    }

    // 7. Ejecutar inserciones en Supabase
    if (toInsert.length > 0) {
      // En bloques de 50 para evitar exceder límites de payload
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        const { error: insErr } = await supabase.from('products').insert(chunk);
        if (insErr) {
          console.error('[Loyverse Sync] Error insertando productos:', insErr);
        }
      }
    }

    // 8. Ejecutar actualizaciones
    for (const itemUp of toUpdate) {
      await supabase.from('products').update(itemUp.data).eq('id', itemUp.id);
    }

    // 9. Actualizar metadatos de la tienda (última sincronización y token si vino en body)
    const modulosActualizados = {
      ...(store.modulos || {}),
      loyverse: true,
      loyverse_token: loyverseToken,
      loyverse_last_sync: new Date().toISOString(),
    };

    await supabase
      .from('stores')
      .update({ modulos: modulosActualizados })
      .eq('slug', storeSlug);

    return NextResponse.json({
      ok: true,
      message: `¡Sincronización completada con éxito!`,
      total: allItems.length,
      creados,
      actualizados,
      categoriasSincronizadas: categoriesMap.size,
    });
  } catch (err: any) {
    console.error('[Loyverse Sync] Error general:', err);
    return NextResponse.json({
      ok: false,
      error: `Error interno durante la sincronización: ${err.message || 'Error desconocido'}`,
    }, { status: 500 });
  }
}
