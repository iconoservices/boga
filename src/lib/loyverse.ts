// Servicio de Integración Bidireccional con Loyverse POS
//
// 1. Loyverse ➔ Boga: Webhooks en tiempo real cuando se cobra o edita en la tablet.
// 2. Boga ➔ Loyverse: Descuento de stock automático cuando un cliente compra en Boga.

export interface LoyverseStockUpdate {
  variant_id: string;
  store_id: string;
  stock_after: number;
}

/**
 * Registra los Webhooks automáticos en Loyverse para que notifique a Boga
 * en tiempo real cuando hay cambios en productos o ventas.
 */
export async function asegurarWebhooksLoyverse(token: string, webhookUrl: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const listRes = await fetch('https://api.loyverse.com/v1.0/webhooks', { headers });
    if (!listRes.ok) return { ok: false, error: 'No se pudo listar webhooks' };

    const data = await listRes.json();
    const existing = (data.webhooks || []) as { id?: string; url: string; type: string; status: string; merchant_id?: string }[];
    let merchantId = existing[0]?.merchant_id || null;
    // Primera conexión (sin webhooks todavía): el merchant_id se pide aparte, si no el webhook no sabría de qué tienda es.
    if (!merchantId) {
      const m = await fetch('https://api.loyverse.com/v1.0/merchant', { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      merchantId = (m?.id as string | undefined) || null;
    }

    // Los webhooks viejos de Boga (sin firma, o de ESTA tienda con otra firma) se borran: el servidor ya no los acepta.
    // Los de otra tienda de Boga que comparta la misma cuenta de Loyverse se dejan.
    const tienda = new URL(webhookUrl).searchParams.get('tienda');
    for (const w of existing) {
      let deEstaTienda = false, firmado = false;
      try { const u = new URL(w.url); firmado = u.searchParams.has('firma'); deEstaTienda = u.searchParams.get('tienda') === tienda; } catch { /* URL rara: no es nuestra */ }
      if (w.id && w.url.includes('/api/loyverse/webhook') && w.url !== webhookUrl && (!firmado || deEstaTienda)) {
        await fetch(`https://api.loyverse.com/v1.0/webhooks/${encodeURIComponent(w.id)}`, { method: 'DELETE', headers }).catch(() => {});
      }
    }

    const needed = ['items.update', 'receipts.update'];
    for (const t of needed) {
      const alreadyActive = existing.some((w) => w.url === webhookUrl && w.type === t && w.status === 'ENABLED');
      if (!alreadyActive) {
        await fetch('https://api.loyverse.com/v1.0/webhooks', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: webhookUrl,
            type: t,
            status: 'ENABLED',
          }),
        });
      }
    }

    return { ok: true, merchantId };
  } catch (err: any) {
    console.error('[Loyverse] Error asegurando webhooks:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Cuando se completa una venta en Boga (carta web o caja POS),
 * descuenta el stock directamente en Loyverse usando POST /v1.0/inventory.
 */
export async function descontarStockEnLoyverse(opts: {
  token: string;
  storeIdLoyverse?: string | null;
  itemsVendidos: { id: string; name: string; quantity: number }[];
  productosDb: { id: string; name: string; sku?: string | null; stock: number }[];
}) {
  const { token, storeIdLoyverse, itemsVendidos, productosDb } = opts;
  if (!token || itemsVendidos.length === 0) return;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Si no tenemos storeIdLoyverse, lo consultamos
    let targetStoreId = storeIdLoyverse;
    if (!targetStoreId) {
      const storesRes = await fetch('https://api.loyverse.com/v1.0/stores', { headers });
      if (storesRes.ok) {
        const sData = await storesRes.json();
        targetStoreId = sData.stores?.[0]?.id;
      }
    }

    if (!targetStoreId) {
      console.warn('[Loyverse Sync Venta] No se encontró sucursal en Loyverse.');
      return;
    }

    // 2. Mapear cada producto vendido con su variant_id de Loyverse
    const updates: LoyverseStockUpdate[] = [];

    for (const item of itemsVendidos) {
      const pDb = productosDb.find((p) => p.id === item.id);
      if (!pDb) continue;

      let variantId: string | null = null;
      if (pDb.sku && pDb.sku.startsWith('loy:')) {
        variantId = pDb.sku.replace('loy:', '');
      }

      // Si no tenemos variant_id en el SKU, lo buscamos por nombre en Loyverse
      if (!variantId) {
        try {
          const searchUrl = new URL('https://api.loyverse.com/v1.0/items');
          const iRes = await fetch(searchUrl.toString(), { headers });
          if (iRes.ok) {
            const iData = await iRes.json();
            const found = (iData.items || []).find(
              (it: any) => it.name.trim().toLowerCase() === item.name.trim().toLowerCase()
            );
            if (found && found.variants?.[0]?.variant_id) {
              variantId = found.variants[0].variant_id;
            }
          }
        } catch {
          // continuar
        }
      }

      if (variantId) {
        const nuevoStock = Math.max(0, (pDb.stock ?? 0) - item.quantity);
        updates.push({
          variant_id: variantId,
          store_id: targetStoreId,
          stock_after: nuevoStock,
        });
      }
    }

    // 3. Enviar actualización a Loyverse
    if (updates.length > 0) {
      const res = await fetch('https://api.loyverse.com/v1.0/inventory', {
        method: 'POST',
        headers,
        body: JSON.stringify({ inventory_levels: updates }),
      });

      if (res.ok) {
        console.log(`[Loyverse Sync Venta] Stock actualizado en Loyverse para ${updates.length} producto(s).`);
      } else {
        const errText = await res.text();
        console.warn('[Loyverse Sync Venta] Error actualizando stock en Loyverse:', errText);
      }
    }
  } catch (err) {
    console.error('[Loyverse Sync Venta] Error general:', err);
  }
}
