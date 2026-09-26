import { createHmac, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { descifrar } from '@/lib/pagosCrypto';
import { moduloActivo } from '@/lib/modulos';
import { moverStock } from '@/lib/stock';

// Cobro con tarjeta / Yape por Izipay (formulario de pago «Krypton» con formToken), directo a la cuenta Izipay
// de cada comercio: Boga no toca el dinero, solo pide el formToken y confirma el pago.
//
// Flujo (documentación oficial + ejemplos de github.com/izipay-pe):
//   1. Servidor → POST https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment (Basic usuario:clave) → formToken
//   2. El cliente ve el formulario incrustado (kr-embedded) y paga con tarjeta o Yape
//   3. Izipay manda al navegador (kr-post-url-success) y por servidor (IPN) el resultado firmado (kr-hash)
//   4. Se valida la firma HMAC-SHA-256 y el pedido pasa a «Pagado»
// El mismo endpoint sirve para pruebas y producción: el modo lo da el tipo de clave (testpassword_… / prodpassword_…).

export const URL_CREAR_PAGO = 'https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment';
export const URL_LIBRERIA_JS = 'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';
export const URL_TEMA_CSS = 'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic.css';
export const URL_TEMA_JS = 'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic.js';

export type CredIzipay = { username: string; password: string; publicKey: string; hmac: string };
export type ConfigPagos = { cred: CredIzipay; activo: boolean };

export const modoDeClave = (password: string): 'prueba' | 'produccion' | 'desconocido' =>
  /^testpassword_/i.test(password) ? 'prueba' : /^prodpassword_/i.test(password) ? 'produccion' : 'desconocido';

/** Lee y descifra las claves de una tienda (solo servidor). null si no hay o no se pueden leer. */
export async function cargarConfigPagos(db: SupabaseClient, slug: string): Promise<ConfigPagos | null> {
  const { data } = await db.from('store_pagos').select('activo,username,public_key,password_enc,hmac_enc').eq('store', slug).maybeSingle();
  if (!data || !data.username || !data.public_key || !data.password_enc || !data.hmac_enc) return null;
  try {
    return {
      activo: data.activo === true,
      cred: { username: data.username as string, publicKey: data.public_key as string, password: descifrar(data.password_enc as string), hmac: descifrar(data.hmac_enc as string) },
    };
  } catch (e) {
    console.error('[pagos] no se pudieron descifrar las claves de', slug, (e as Error).message);
    return null;
  }
}

/** ¿La tienda puede cobrar online? (módulo prendido por el superadmin + claves completas + interruptor activo) */
export async function tiendaCobraOnline(db: SupabaseClient, slug: string): Promise<boolean> {
  const { data: t } = await db.from('stores').select('status,modulos').eq('slug', slug).maybeSingle();
  if (!t || t.status !== 'active' || (t.modulos as { pasarela_pago?: boolean } | null)?.pasarela_pago !== true) return false;
  const { data: p } = await db.from('store_pagos').select('activo,username,public_key,password_enc,hmac_enc').eq('store', slug).maybeSingle();
  return !!p && p.activo === true && !!p.username && !!p.public_key && !!p.password_enc && !!p.hmac_enc;
}

export type ResultadoToken = { ok: true; formToken: string } | { ok: false; codigo: string; mensaje: string };

/** Pide a Izipay el formToken de un cobro. `monto` en soles (se envía en céntimos). */
export async function crearFormToken(cred: CredIzipay, p: { monto: number; orderId: string; email: string; nombre?: string; telefono?: string }): Promise<ResultadoToken> {
  const auth = 'Basic ' + Buffer.from(`${cred.username}:${cred.password}`).toString('base64');
  const cuerpo = {
    amount: Math.round(p.monto * 100),
    currency: 'PEN',
    orderId: p.orderId,
    customer: {
      email: p.email,
      ...(p.nombre || p.telefono ? { billingDetails: { ...(p.nombre ? { firstName: p.nombre.slice(0, 40) } : {}), ...(p.telefono ? { phoneNumber: p.telefono.slice(0, 20) } : {}) } } : {}),
    },
  };
  try {
    const res = await fetch(URL_CREAR_PAGO, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(cuerpo), cache: 'no-store' });
    const json = await res.json().catch(() => null) as { status?: string; answer?: { formToken?: string; errorCode?: string; errorMessage?: string; detailedErrorMessage?: string } } | null;
    if (json?.status === 'SUCCESS' && json.answer?.formToken) return { ok: true, formToken: json.answer.formToken };
    return { ok: false, codigo: json?.answer?.errorCode || String(res.status), mensaje: json?.answer?.detailedErrorMessage || json?.answer?.errorMessage || 'Izipay no aceptó la solicitud' };
  } catch (e) {
    return { ok: false, codigo: 'red', mensaje: (e as Error).message };
  }
}

/** Valida la firma del resultado: HMAC-SHA-256 de `kr-answer` con la clave que Izipay indica en `kr-hash-key`. */
export function firmaValida(campos: Record<string, string>, cred: CredIzipay): boolean {
  const answer = campos['kr-answer'];
  const hash = campos['kr-hash'];
  if (!answer || !hash) return false;
  // Retorno del navegador: clave HMAC-SHA-256 (kr-hash-key = sha256_hmac). Notificación IPN: la clave de API (kr-hash-key = password).
  const clave = campos['kr-hash-key'] === 'password' ? cred.password : cred.hmac;
  const calculado = createHmac('sha256', clave).update(answer).digest('hex');
  const a = Buffer.from(calculado), b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Respuesta = {
  orderStatus?: string;
  orderDetails?: { orderId?: string; orderTotalAmount?: number; orderCurrency?: string };
  transactions?: { uuid?: string; status?: string; paymentMethodType?: string }[];
};

export const leerRespuesta = (campos: Record<string, string>): Respuesta | null => {
  try { return JSON.parse(campos['kr-answer'] || '') as Respuesta; } catch { return null; }
};

/**
 * Marca un pedido como pagado (o fallido) según la respuesta ya validada. Idempotente: el retorno del navegador y el IPN
 * llegan los dos y solo el primero descuenta stock. Con inventario activo, el stock se descuenta al confirmarse el pago.
 */
export async function registrarResultado(db: SupabaseClient, codigo: string, r: Respuesta): Promise<{ estado: 'pagado' | 'pendiente' | 'fallido' | 'no_coincide' | 'no_existe' }> {
  const { data: o } = await db.from('orders').select('id,store,items,total_amount,pago_estado').eq('codigo', codigo).maybeSingle();
  if (!o) return { estado: 'no_existe' };
  if (o.pago_estado === 'pagado') return { estado: 'pagado' };

  if (r.orderStatus !== 'PAID') {
    const rechazado = (r.transactions ?? []).some((t) => t.status === 'REFUSED' || t.status === 'ERROR');
    if (rechazado) await db.from('orders').update({ pago_estado: 'fallido' }).eq('id', o.id).neq('pago_estado', 'pagado');
    return { estado: rechazado ? 'fallido' : 'pendiente' };
  }

  // El monto pagado tiene que coincidir con el del pedido (en céntimos), en soles.
  const esperado = Math.round(Number(o.total_amount) * 100);
  if (r.orderDetails?.orderTotalAmount !== esperado || (r.orderDetails?.orderCurrency && r.orderDetails.orderCurrency !== 'PEN')) {
    console.error('[pagos] monto no coincide', codigo, r.orderDetails?.orderTotalAmount, esperado);
    return { estado: 'no_coincide' };
  }

  const tx = (r.transactions ?? [])[0];
  const { data: cambiado } = await db.from('orders')
    .update({ pago_estado: 'pagado', pago_ref: tx?.uuid ?? null, pago_at: new Date().toISOString(), payment_method: tx?.paymentMethodType === 'YAPE_CODE' ? 'Yape' : 'Tarjeta' })
    .eq('id', o.id).neq('pago_estado', 'pagado').select('id').maybeSingle();

  if (cambiado) {
    const { data: t } = await db.from('stores').select('modulos').eq('slug', o.store).maybeSingle();
    if (moduloActivo(t?.modulos, 'inventario')) {
      const items = (Array.isArray(o.items) ? o.items : []) as { id: string; name: string; quantity: number }[];
      await moverStock(db, { store: o.store as string, motivo: 'venta_carta', pedidoId: o.id as string, lineas: items.map((l) => ({ id: l.id, name: l.name, delta: -l.quantity })) });
    }
  }
  return { estado: 'pagado' };
}

export type ResultadoNotificacion = { ok: true; codigo: string; estado: 'pagado' | 'pendiente' | 'fallido' | 'no_coincide' | 'no_existe' } | { ok: false; motivo: 'sin_datos' | 'sin_pedido' | 'sin_claves' | 'firma' };

/**
 * Procesa lo que manda Izipay (retorno del navegador o IPN): busca el pedido por el orderId, valida la firma con las claves
 * de SU tienda y registra el resultado. `slugEsperado` (IPN) evita que una notificación de una tienda toque pedidos de otra.
 */
export async function procesarNotificacion(db: SupabaseClient, campos: Record<string, string>, slugEsperado?: string): Promise<ResultadoNotificacion> {
  const r = leerRespuesta(campos);
  const codigo = r?.orderDetails?.orderId;
  if (!r || !codigo || !/^[a-z0-9]{6,12}$/.test(codigo)) return { ok: false, motivo: 'sin_datos' };
  const { data: o } = await db.from('orders').select('store').eq('codigo', codigo).maybeSingle();
  if (!o || (slugEsperado && o.store !== slugEsperado)) return { ok: false, motivo: 'sin_pedido' };
  const cfg = await cargarConfigPagos(db, o.store as string);
  if (!cfg) return { ok: false, motivo: 'sin_claves' };
  if (!firmaValida(campos, cfg.cred)) return { ok: false, motivo: 'firma' };
  const { estado } = await registrarResultado(db, codigo, r);
  return { ok: true, codigo, estado };
}
