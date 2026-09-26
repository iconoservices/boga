import { NextResponse } from 'next/server';
import { clienteServicio, quienEs } from '@/lib/pushServidor';
import { excedeLimite, ipDe, texto, UUID } from '@/lib/transporteServidor';

// Los repartidores propios de una tienda. Cada uno es una fila de `drivers` (tipo 'Repartidor', store_slug = la
// tienda) con su enlace secreto en `driver_acceso`: entra a la MISMA app del chofer (/transporte/chofer) y ahí ve
// solo sus entregas. Solo el dueño de la tienda (o el superadmin) los ve y los maneja.
//   GET    ?store=<slug>   → sus repartidores (con el enlace para pasárselo)
//   POST   {store, nombre, tel, placa?}  → crea uno
//   DELETE ?id=<uuid>      → lo quita (sus pedidos quedan sin repartidor)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIN_CACHE = { 'Cache-Control': 'no-store' };
const MAX_POR_TIENDA = 10;
const SLUG = /^[a-z0-9-]{1,60}$/;

async function autorizar(request: Request, slug: string) {
  const db = clienteServicio();
  if (!db) return { error: NextResponse.json({ error: 'Servicio no configurado' }, { status: 503, headers: SIN_CACHE }) } as const;
  if (!SLUG.test(slug)) return { error: NextResponse.json({ error: 'Tienda no válida' }, { status: 400, headers: SIN_CACHE }) } as const;
  const quien = await quienEs(request);
  if (!quien) return { error: NextResponse.json({ error: 'Inicia sesión' }, { status: 401, headers: SIN_CACHE }) } as const;
  const { data: t } = await db.from('stores').select('slug,name,user_id').eq('slug', slug).maybeSingle();
  if (!t || (!quien.esSuperadmin && t.user_id !== quien.userId)) {
    return { error: NextResponse.json({ error: 'Esta tienda no es tuya' }, { status: 403, headers: SIN_CACHE }) } as const;
  }
  return { db, tienda: t as { slug: string; name: string } } as const;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('store') || '';
  const a = await autorizar(request, slug);
  if ('error' in a) return a.error;
  const { data: filas, error } = await a.db.from('drivers').select('id,nombre,tel,placa,created_at').eq('store_slug', slug).eq('tipo', 'Repartidor').order('created_at');
  // Sin las columnas nuevas (SQL sin correr) no hay repartidores todavía.
  if (error) return NextResponse.json({ repartidores: [], sinSql: true }, { headers: SIN_CACHE });
  const ids = (filas ?? []).map((f) => f.id as string);
  const { data: accesos } = ids.length ? await a.db.from('driver_acceso').select('driver_id,token,visto_at').in('driver_id', ids) : { data: [] };
  const porId = new Map((accesos ?? []).map((x) => [x.driver_id as string, x]));
  return NextResponse.json({
    repartidores: (filas ?? []).map((f) => ({
      id: f.id, nombre: f.nombre, tel: f.tel, placa: f.placa,
      token: (porId.get(f.id as string)?.token as string | undefined) ?? null,
      visto: (porId.get(f.id as string)?.visto_at as string | undefined) ?? null,
    })),
  }, { headers: SIN_CACHE });
}

export async function POST(request: Request) {
  if (excedeLimite(`repartidor-nuevo:${ipDe(request)}`, 20, 60_000)) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429, headers: SIN_CACHE });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const a = await autorizar(request, texto(body?.store, 60));
  if ('error' in a) return a.error;

  const nombre = texto(body?.nombre, 60);
  const tel = texto(body?.tel, 30).replace(/\D/g, '');
  const placa = texto(body?.placa, 15) || null;
  if (!nombre) return NextResponse.json({ error: 'Escribe el nombre del repartidor' }, { status: 400, headers: SIN_CACHE });
  if (tel.length < 9) return NextResponse.json({ error: 'Escribe su WhatsApp (9 dígitos)' }, { status: 400, headers: SIN_CACHE });

  const { count } = await a.db.from('drivers').select('id', { count: 'exact', head: true }).eq('store_slug', a.tienda.slug).eq('tipo', 'Repartidor');
  if ((count ?? 0) >= MAX_POR_TIENDA) return NextResponse.json({ error: `Máximo ${MAX_POR_TIENDA} repartidores por tienda` }, { status: 400, headers: SIN_CACHE });

  const { data: d, error } = await a.db.from('drivers')
    .insert({ nombre, tipo: 'Repartidor', tel: tel.length === 9 ? `51${tel}` : tel, placa, status: 'activo', store_slug: a.tienda.slug })
    .select('id').single();
  if (error || !d) return NextResponse.json({ error: 'No se pudo crear (¿ya corriste el SQL de delivery?)' }, { status: 500, headers: SIN_CACHE });
  const { data: acc, error: e2 } = await a.db.from('driver_acceso').insert({ driver_id: d.id }).select('token').single();
  if (e2 || !acc) {
    await a.db.from('drivers').delete().eq('id', d.id);
    return NextResponse.json({ error: 'No se pudo crear su acceso' }, { status: 500, headers: SIN_CACHE });
  }
  return NextResponse.json({ ok: true, repartidor: { id: d.id, nombre, tel, placa, token: acc.token, visto: null } }, { headers: SIN_CACHE });
}

export async function DELETE(request: Request) {
  const db = clienteServicio();
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!db || !UUID.test(id)) return NextResponse.json({ error: 'Repartidor no válido' }, { status: 400, headers: SIN_CACHE });
  const { data: d } = await db.from('drivers').select('id,store_slug,tipo').eq('id', id).maybeSingle();
  if (!d || d.tipo !== 'Repartidor' || !d.store_slug) return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404, headers: SIN_CACHE });
  const a = await autorizar(request, d.store_slug as string);
  if ('error' in a) return a.error;
  await a.db.from('drivers').delete().eq('id', id);
  return NextResponse.json({ ok: true }, { headers: SIN_CACHE });
}
