import type { SupabaseClient } from '@supabase/supabase-js';
import { cifrar, descifrar, cifradoDisponible } from '@/lib/pagosCrypto';
import { quienEs, type Quien } from '@/lib/pushServidor';

// Credenciales de Loyverse POS de cada tienda (solo servidor).
//
// Antes el token vivía dentro de `stores.modulos`, que es de LECTURA PÚBLICA (cualquiera con la clave anon del navegador
// lo leía). Ahora va en la tabla privada `store_loyverse` (RLS sin políticas: solo la llave de servicio), cifrado con
// PAGOS_ENC_KEY. Las columnas `token_plain` y el respaldo de `stores.modulos` solo existen para el paso de migración.

export type CredLoyverse = { token: string; merchantId: string | null };

/** Token y merchant_id de una tienda, o null si no conectó Loyverse. Cifra en el momento un token que aún estaba en claro. */
export async function leerCredencialesLoyverse(db: SupabaseClient, slug: string): Promise<CredLoyverse | null> {
  const { data } = await db.from('store_loyverse').select('token_enc,token_plain,merchant_id').eq('store', slug).maybeSingle();
  if (data) {
    let token: string | null = null;
    try { if (data.token_enc) token = descifrar(data.token_enc as string); } catch (e) { console.error('[loyverse] no se pudo descifrar el token de', slug, (e as Error).message); }
    if (!token && data.token_plain) {
      token = data.token_plain as string;
      if (cifradoDisponible()) await db.from('store_loyverse').update({ token_enc: cifrar(token), token_plain: null }).eq('store', slug);
    }
    if (token) return { token, merchantId: (data.merchant_id as string | null) ?? null };
  }
  // Respaldo mientras no se corre el SQL de migración: el token todavía está dentro de stores.modulos.
  const { data: t } = await db.from('stores').select('modulos').eq('slug', slug).maybeSingle();
  const m = (t?.modulos ?? {}) as { loyverse_token?: string; loyverse_merchant_id?: string };
  return m.loyverse_token ? { token: m.loyverse_token, merchantId: m.loyverse_merchant_id ?? null } : null;
}

export async function guardarCredencialesLoyverse(db: SupabaseClient, slug: string, p: { token?: string; merchantId?: string | null }) {
  const fila: Record<string, unknown> = { store: slug, updated_at: new Date().toISOString() };
  if (p.token) {
    if (cifradoDisponible()) { fila.token_enc = cifrar(p.token); fila.token_plain = null; }
    else fila.token_plain = p.token;   // sin llave de cifrado: queda en la tabla privada (solo servidor) hasta que haya llave
  }
  if (p.merchantId !== undefined) fila.merchant_id = p.merchantId;
  return db.from('store_loyverse').upsert(fila, { onConflict: 'store' });
}

/** Tiendas cuyo Loyverse tiene ese merchant_id (para el webhook). */
export async function tiendasConMerchantId(db: SupabaseClient, merchantId: string): Promise<string[]> {
  const slugs = new Set<string>();
  const { data } = await db.from('store_loyverse').select('store').eq('merchant_id', merchantId);
  (data ?? []).forEach((f) => slugs.add(f.store as string));
  // Respaldo de migración: tiendas que aún lo tienen dentro de stores.modulos
  const { data: viejas } = await db.from('stores').select('slug,modulos').not('modulos', 'is', null);
  (viejas ?? []).forEach((s) => { const m = (s.modulos ?? {}) as { loyverse?: boolean; loyverse_merchant_id?: string }; if (m.loyverse && m.loyverse_merchant_id === merchantId) slugs.add(s.slug as string); });
  return [...slugs];
}

export async function tieneCredencialesLoyverse(db: SupabaseClient, slug: string): Promise<boolean> {
  return !!(await leerCredencialesLoyverse(db, slug));
}

/** Sesión válida y dueño de la tienda (o superadmin). Devuelve `motivo` para responder 401/403/404. */
export async function autorizarTiendaLoyverse(request: Request, db: SupabaseClient, slug: string):
  Promise<{ ok: true; quien: Quien; tienda: { slug: string; name: string; modulos: Record<string, unknown> | null } } | { ok: false; status: 401 | 403 | 404; error: string }> {
  const quien = await quienEs(request);
  if (!quien) return { ok: false, status: 401, error: 'Inicia sesión para usar esto.' };
  const { data: t } = await db.from('stores').select('slug,name,user_id,modulos').eq('slug', slug).maybeSingle();
  if (!t) return { ok: false, status: 404, error: 'Tienda no encontrada.' };
  if (!quien.esSuperadmin && t.user_id !== quien.userId) return { ok: false, status: 403, error: 'Esta tienda no es tuya.' };
  return { ok: true, quien, tienda: { slug: t.slug as string, name: t.name as string, modulos: (t.modulos as Record<string, unknown> | null) ?? null } };
}
