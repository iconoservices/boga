import { NextResponse } from 'next/server';
import { clienteServicio, cabecerasCors } from '@/lib/pushServidor';

// Deja de seguir una tienda. Si el navegador ya no sigue ninguna, se borra la suscripción entera
// y la respuesta dice `quedan: 0` para que el cliente también se dé de baja del navegador.

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecerasCors(request) });
}

export async function POST(request: Request) {
  const cors = cabecerasCors(request);
  const body = await request.json().catch(() => null) as { endpoint?: unknown; store_slug?: unknown } | null;
  const endpoint = body?.endpoint, slug = body?.store_slug;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000
    || typeof slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400, headers: cors });
  }
  const supabase = clienteServicio();
  if (!supabase) return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500, headers: cors });

  await supabase.from('push_seguidas').delete().eq('endpoint', endpoint).eq('store_slug', slug);
  const { count } = await supabase.from('push_seguidas').select('endpoint', { count: 'exact', head: true }).eq('endpoint', endpoint);
  const quedan = count ?? 0;
  if (quedan === 0) await supabase.from('push_subs').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true, quedan }, { headers: cors });
}
