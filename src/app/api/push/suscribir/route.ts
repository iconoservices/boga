import { NextResponse } from 'next/server';
import { clienteServicio, cabecerasCors } from '@/lib/pushServidor';
import { CANAL_BOGA } from '@/lib/pushLimites';

// Suscribe un navegador a los avisos de UNA tienda (o del canal 'boga'). Cualquiera puede hacerlo
// (es un visitante que aceptó recibir avisos), por eso va con la clave de servicio y no directo a
// la base. Si el navegador ya estaba suscrito, solo se suma la tienda a las que sigue.

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecerasCors(request) });
}

export async function POST(request: Request) {
  const cors = cabecerasCors(request);
  const body = await request.json().catch(() => null) as {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
    store_slug?: unknown;
  } | null;

  const endpoint = body?.subscription?.endpoint, p256dh = body?.subscription?.keys?.p256dh, auth = body?.subscription?.keys?.auth;
  const slug = body?.store_slug;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string' || typeof slug !== 'string'
    || !endpoint.startsWith('https://') || endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100
    || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400, headers: cors });
  }

  const supabase = clienteServicio();
  if (!supabase) return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500, headers: cors });

  // Solo tiendas que existen (o el canal de la plataforma)
  if (slug !== CANAL_BOGA) {
    const { data: tienda } = await supabase.from('stores').select('slug,push_activo').eq('slug', slug).maybeSingle();
    if (!tienda) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404, headers: cors });
    // Solo las tiendas a las que el superadmin les activó los avisos pueden tener suscriptores
    if (!tienda.push_activo) return NextResponse.json({ error: 'Esta tienda no tiene avisos activados' }, { status: 403, headers: cors });
  }

  const { error: e1 } = await supabase.from('push_subs').upsert(
    { endpoint, p256dh, auth, user_agent: (request.headers.get('user-agent') || '').slice(0, 200) },
    { onConflict: 'endpoint' },
  );
  if (e1) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500, headers: cors });
  const { error: e2 } = await supabase.from('push_seguidas').upsert({ endpoint, store_slug: slug }, { onConflict: 'endpoint,store_slug' });
  if (e2) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500, headers: cors });

  return NextResponse.json({ ok: true }, { headers: cors });
}
