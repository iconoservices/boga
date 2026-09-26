import { NextResponse } from 'next/server';
import { clienteServicio } from '@/lib/pushServidor';
import { autorizarTiendaLoyverse, guardarCredencialesLoyverse, tieneCredencialesLoyverse } from '@/lib/loyverseServidor';

// Conexión de una tienda con Loyverse POS desde su panel. La ficha (token) se guarda cifrada en la tabla privada
// `store_loyverse` y NUNCA se devuelve al navegador: aquí solo se sabe si está conectada.
//   GET  ?store=<slug>          → { conectado }
//   POST { store, token }       → valida la ficha con Loyverse y la guarda
// Solo el dueño de la tienda o un superadmin.

export const dynamic = 'force-dynamic';
const SIN_CACHE = { 'Cache-Control': 'no-store' };
const SLUG = /^[a-z0-9-]{1,80}$/;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('store') || '';
  const db = clienteServicio();
  if (!db || !SLUG.test(slug)) return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400, headers: SIN_CACHE });
  const a = await autorizarTiendaLoyverse(request, db, slug);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status, headers: SIN_CACHE });
  return NextResponse.json({ conectado: await tieneCredencialesLoyverse(db, slug) }, { headers: SIN_CACHE });
}

export async function POST(request: Request) {
  const db = clienteServicio();
  const b = (await request.json().catch(() => null)) as { store?: unknown; token?: unknown } | null;
  const slug = typeof b?.store === 'string' ? b.store : '';
  const token = typeof b?.token === 'string' ? b.token.trim() : '';
  if (!db || !SLUG.test(slug)) return NextResponse.json({ error: 'Solicitud no válida' }, { status: 400, headers: SIN_CACHE });
  if (token.length < 10 || token.length > 200) return NextResponse.json({ error: 'La ficha de acceso no parece válida.' }, { status: 400, headers: SIN_CACHE });
  const a = await autorizarTiendaLoyverse(request, db, slug);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status, headers: SIN_CACHE });

  // La ficha se prueba contra Loyverse antes de guardarla.
  try {
    const r = await fetch('https://api.loyverse.com/v1.0/merchant', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (r.status === 401 || r.status === 403) return NextResponse.json({ error: 'Loyverse no aceptó esa ficha. Revisa que la copiaste completa.' }, { status: 400, headers: SIN_CACHE });
  } catch { /* sin conexión con Loyverse: se guarda igual y se prueba al sincronizar */ }

  const { error } = await guardarCredencialesLoyverse(db, slug, { token });
  if (error) {
    console.error('[loyverse/config]', error.message);
    return NextResponse.json({ error: 'No se pudo guardar. ¿Se corrió el SQL de Loyverse?' }, { status: 500, headers: SIN_CACHE });
  }
  // Marca el módulo como conectado (dato público y sin secretos)
  const { loyverse_token: _t, loyverse_merchant_id: _m, ...limpio } = (a.tienda.modulos ?? {}) as Record<string, unknown>;
  await db.from('stores').update({ modulos: { ...limpio, loyverse: true } }).eq('slug', slug);
  return NextResponse.json({ ok: true }, { headers: SIN_CACHE });
}
