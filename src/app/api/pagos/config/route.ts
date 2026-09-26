import { NextResponse } from 'next/server';
import { clienteServicio, quienEs } from '@/lib/pushServidor';
import { cifrar, cifradoDisponible } from '@/lib/pagosCrypto';
import { cargarConfigPagos, crearFormToken, modoDeClave } from '@/lib/izipay';

// Claves de cobro de Izipay de UNA tienda, desde su panel. Solo el dueño de la tienda o un superadmin, y solo si el
// superadmin le prendió el módulo «pasarela_pago». Las claves se guardan cifradas (lib/pagosCrypto.ts) y NUNCA se
// devuelven: el panel solo ve si están puestas y el modo (prueba / producción).

export const dynamic = 'force-dynamic';
const SIN_CACHE = { 'Cache-Control': 'no-store' };
const SLUG = /^[a-z0-9-]{1,80}$/;
const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');

async function autorizar(request: Request, slug: string) {
  const db = clienteServicio();
  if (!db) return { error: NextResponse.json({ error: 'Servicio no disponible' }, { status: 503, headers: SIN_CACHE }) };
  const quien = await quienEs(request);
  if (!quien) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: SIN_CACHE }) };
  const { data: t } = await db.from('stores').select('slug,user_id,modulos').eq('slug', slug).maybeSingle();
  if (!t) return { error: NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404, headers: SIN_CACHE }) };
  if (!quien.esSuperadmin && t.user_id !== quien.userId) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403, headers: SIN_CACHE }) };
  const modulo = (t.modulos as { pasarela_pago?: boolean } | null)?.pasarela_pago === true;
  return { db, quien, modulo };
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('store') || '';
  if (!SLUG.test(slug)) return NextResponse.json({ error: 'Tienda no válida' }, { status: 400, headers: SIN_CACHE });
  const a = await autorizar(request, slug);
  if ('error' in a) return a.error;

  const { data: fila } = await a.db.from('store_pagos').select('activo,username,public_key,password_enc,hmac_enc').eq('store', slug).maybeSingle();
  const cfg = fila ? await cargarConfigPagos(a.db, slug) : null;
  return NextResponse.json({
    modulo: a.modulo,
    cifradoListo: cifradoDisponible(),
    activo: fila?.activo === true,
    username: (fila?.username as string) || '',
    publicKey: (fila?.public_key as string) || '',
    tienePassword: !!fila?.password_enc,
    tieneHmac: !!fila?.hmac_enc,
    modo: cfg ? modoDeClave(cfg.cred.password) : null,
    ipnUrl: `${SITIO}/api/pagos/ipn/${slug}`,
  }, { headers: SIN_CACHE });
}

export async function POST(request: Request) {
  let b: { store?: unknown; activo?: unknown; username?: unknown; publicKey?: unknown; password?: unknown; hmac?: unknown; probar?: unknown };
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Cuerpo no válido' }, { status: 400, headers: SIN_CACHE }); }
  const slug = typeof b.store === 'string' ? b.store : '';
  if (!SLUG.test(slug)) return NextResponse.json({ error: 'Tienda no válida' }, { status: 400, headers: SIN_CACHE });
  const a = await autorizar(request, slug);
  if ('error' in a) return a.error;
  if (!a.modulo && !a.quien.esSuperadmin) return NextResponse.json({ error: 'El cobro online no está activado para tu tienda. Pídelo a Boga.' }, { status: 403, headers: SIN_CACHE });
  if (!cifradoDisponible()) return NextResponse.json({ error: 'El servidor todavía no está listo para guardar claves (falta PAGOS_ENC_KEY).' }, { status: 503, headers: SIN_CACHE });

  const limpio = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const username = limpio(b.username, 60);
  const publicKey = limpio(b.publicKey, 200);
  const password = limpio(b.password, 200);
  const hmac = limpio(b.hmac, 200);

  const { data: actual } = await a.db.from('store_pagos').select('username,public_key,password_enc,hmac_enc,activo').eq('store', slug).maybeSingle();

  const cambios: Record<string, unknown> = { store: slug, provider: 'izipay', updated_at: new Date().toISOString() };
  if (username) cambios.username = username;
  if (publicKey) cambios.public_key = publicKey;
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'La clave (password) de Izipay parece incompleta.' }, { status: 400, headers: SIN_CACHE });
    cambios.password_enc = cifrar(password);
  }
  if (hmac) {
    if (hmac.length < 8) return NextResponse.json({ error: 'La clave HMAC-SHA-256 de Izipay parece incompleta.' }, { status: 400, headers: SIN_CACHE });
    cambios.hmac_enc = cifrar(hmac);
  }
  if (typeof b.activo === 'boolean') cambios.activo = b.activo;

  const completo = (cambios.username ?? actual?.username) && (cambios.public_key ?? actual?.public_key) && (cambios.password_enc ?? actual?.password_enc) && (cambios.hmac_enc ?? actual?.hmac_enc);
  if ((cambios.activo ?? actual?.activo) === true && !completo) {
    return NextResponse.json({ error: 'Para activar el cobro faltan claves: usuario, clave, clave pública y clave HMAC-SHA-256.' }, { status: 400, headers: SIN_CACHE });
  }

  const { error } = await a.db.from('store_pagos').upsert(cambios, { onConflict: 'store' });
  if (error) {
    console.error('[pagos/config]', error.message);
    return NextResponse.json({ error: 'No se pudo guardar. ¿Se corrió el SQL de cobros online?' }, { status: 500, headers: SIN_CACHE });
  }

  // Prueba opcional: pide un formToken de 1 sol. No cobra nada (solo abre una sesión de pago en Izipay).
  let prueba: { ok: boolean; mensaje: string } | undefined;
  if (b.probar === true) {
    const cfg = await cargarConfigPagos(a.db, slug);
    if (!cfg) prueba = { ok: false, mensaje: 'Faltan claves para probar.' };
    else {
      const r = await crearFormToken(cfg.cred, { monto: 1, orderId: `prueba-${Date.now()}`, email: 'prueba@bogahub.app' });
      prueba = r.ok
        ? { ok: true, mensaje: `Conexión correcta con Izipay (modo ${modoDeClave(cfg.cred.password)}).` }
        : { ok: false, mensaje: `Izipay respondió: ${r.mensaje} (${r.codigo}). Revisa el usuario y la clave.` };
    }
  }
  return NextResponse.json({ ok: true, prueba }, { headers: SIN_CACHE });
}
