import { NextResponse } from 'next/server';
import { avanzarOlas, haExpirado, origenDe, posicionChofer, type Pedido } from '@/lib/despacho';
import { distanciaKm } from '@/lib/ciudades';
import { zonaPorId } from '@/lib/zonasTransporte';
import { choferPorToken, coordenada, excedeLimite, ipDe, servicio, texto } from '@/lib/transporteServidor';

// La app privada del chofer (se entra con su enlace secreto, sin contraseña).
//   GET  ?t=<token>  → sus datos, los pedidos que le avisaron y su viaje en curso. Al consultarlo salen las olas que tocan.
//   POST {t, accion} → aceptar · completar · liberar · pausa · ubicacion · zona · base · suscribir · baja

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] || 'Pasajero';
const pin = (p: Pick<Pedido, 'origen_lat' | 'origen_lng'>) =>
  p.origen_lat != null && p.origen_lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${p.origen_lat},${p.origen_lng}` : null;

export async function GET(request: Request) {
  const db = servicio();
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  if (excedeLimite(`chofer:${ipDe(request)}`, 200, 60_000)) return NextResponse.json({ error: 'Demasiadas consultas' }, { status: 429 });
  const yo = await choferPorToken(db, new URL(request.url).searchParams.get('t'));
  if (!yo) return NextResponse.json({ error: 'Enlace inválido. Pídele a Boga tu enlace de chofer.' }, { status: 401 });

  await db.from('driver_acceso').update({ visto_at: new Date().toISOString() }).eq('driver_id', yo.driverId);

  // Refrescar la app del chofer también hace salir las olas de los pedidos que están buscando.
  const { data: buscando } = await db.from('ride_requests').select('id').eq('estado', 'buscando').eq('ciudad', yo.chofer.ciudad);
  for (const b of buscando ?? []) await avanzarOlas(db, b.id as string);

  const [{ data: avisos }, { data: acceso }, { count: celulares }] = await Promise.all([
    db.from('ride_avisos').select('ride_id,distancia_km').eq('driver_id', yo.driverId),
    db.from('driver_acceso').select('pausado,base_lat,base_lng,lat,lng,ubicado_at,zona,zona_hasta,zonas').eq('driver_id', yo.driverId).maybeSingle(),
    db.from('driver_push').select('endpoint', { count: 'exact', head: true }).eq('driver_id', yo.driverId),
  ]);

  const idsAvisados = (avisos ?? []).map((a) => a.ride_id as string);
  const distancias = new Map((avisos ?? []).map((a) => [a.ride_id as string, a.distancia_km as number | null]));
  const { data: filas } = idsAvisados.length
    ? await db.from('ride_requests').select('*').in('id', idsAvisados).eq('estado', 'buscando')
    : { data: [] as Pedido[] };
  const pedidos = ((filas ?? []) as Pedido[])
    .filter((p) => !haExpirado(p))
    .map((p) => {
      // Distancia en vivo desde donde está el chofer AHORA (su GPS al abrir la app, su zona o su paradero);
      // si no se sabe, la que se calculó cuando se le avisó.
      const pos = acceso ? posicionChofer(acceso as Parameters<typeof posicionChofer>[0]) : null;
      const origen = origenDe(p);
      const enVivo = pos && origen ? distanciaKm(origen.lat, origen.lng, pos.lat, pos.lng) : null;
      return { pedido: p, km: enVivo ?? distancias.get(p.id) ?? null };
    })
    .map(({ pedido: p, km }) => ({
      id: p.id,
      pasajero: primerNombre(p.pasajero_nombre),
      origen: p.origen_texto,
      destino: p.destino_texto,
      oferta: p.oferta,
      tipo: p.tipo,
      distanciaKm: km,
      haceSeg: Math.round((Date.now() - new Date(p.inicio_busqueda_at).getTime()) / 1000),
    }));

  // Su viaje en curso (con los datos completos del pasajero: ya lo aceptó).
  const { data: enCurso } = await db.from('ride_requests').select('*').eq('driver_id', yo.driverId).eq('estado', 'asignado').order('asignado_at', { ascending: false }).limit(1).maybeSingle();
  const actual = enCurso
    ? {
        id: enCurso.id, pasajero: enCurso.pasajero_nombre, tel: enCurso.pasajero_tel, origen: enCurso.origen_texto,
        destino: enCurso.destino_texto, oferta: enCurso.oferta, pin: pin(enCurso as Pedido),
      }
    : null;

  const zonaVigente = acceso?.zona && acceso.zona_hasta && new Date(acceso.zona_hasta).getTime() > Date.now() ? acceso.zona : null;
  return NextResponse.json({
    chofer: { nombre: yo.chofer.nombre, tipo: yo.chofer.tipo, placa: yo.chofer.placa },
    pausado: !!acceso?.pausado,
    tieneBase: acceso?.base_lat != null && acceso?.base_lng != null,
    zona: zonaVigente,
    zonasCubre: (acceso?.zonas as string[] | null) ?? [],
    gpsReciente: !!acceso?.ubicado_at && Date.now() - new Date(acceso.ubicado_at).getTime() < 10 * 60_000,
    avisosActivados: (celulares ?? 0) > 0,
    pedidos,
    actual,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const db = servicio();
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  if (excedeLimite(`chofer-post:${ipDe(request)}`, 120, 60_000)) return NextResponse.json({ error: 'Demasiadas acciones' }, { status: 429 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const yo = await choferPorToken(db, body?.t);
  if (!yo || !body) return NextResponse.json({ error: 'Enlace inválido' }, { status: 401 });
  const accion = texto(body.accion, 20);

  switch (accion) {
    case 'aceptar': {
      const id = texto(body.pedido_id, 60);
      // Solo un pedido del que le avisaron.
      const { data: aviso } = await db.from('ride_avisos').select('ride_id').eq('ride_id', id).eq('driver_id', yo.driverId).maybeSingle();
      if (!aviso) return NextResponse.json({ ok: false, motivo: 'no_avisado' }, { status: 403 });
      const { data: ocupado } = await db.from('ride_requests').select('id').eq('driver_id', yo.driverId).eq('estado', 'asignado').limit(1).maybeSingle();
      if (ocupado) return NextResponse.json({ ok: false, motivo: 'ocupado' });
      // Atómico: si dos choferes tocan a la vez, solo el primero cambia la fila; el otro recibe "ya lo tomaron".
      const { data: tomado } = await db.from('ride_requests')
        .update({ estado: 'asignado', driver_id: yo.driverId, asignado_at: new Date().toISOString() })
        .eq('id', id).eq('estado', 'buscando').select('*');
      if (!tomado || tomado.length === 0) {
        const { data: p } = await db.from('ride_requests').select('estado').eq('id', id).maybeSingle();
        return NextResponse.json({ ok: false, motivo: p?.estado === 'buscando' ? 'error' : p?.estado === 'expirado' || p?.estado === 'cancelado' ? 'cerrado' : 'tomado' });
      }
      const p = tomado[0] as Pedido;
      return NextResponse.json({ ok: true, actual: { id: p.id, pasajero: p.pasajero_nombre, tel: p.pasajero_tel, origen: p.origen_texto, destino: p.destino_texto, oferta: p.oferta, pin: pin(p) } });
    }
    case 'completar': {
      const { data } = await db.from('ride_requests').update({ estado: 'completado', terminado_at: new Date().toISOString() })
        .eq('id', texto(body.pedido_id, 60)).eq('driver_id', yo.driverId).eq('estado', 'asignado').select('id');
      return NextResponse.json({ ok: !!data && data.length > 0 });
    }
    case 'liberar': {
      // El chofer ya no puede hacer el viaje: el pedido vuelve a buscarse (con los otros choferes) sin perder tiempo.
      const id = texto(body.pedido_id, 60);
      const { data } = await db.from('ride_requests')
        .update({ estado: 'buscando', driver_id: null, asignado_at: null, ola: 0, inicio_busqueda_at: new Date().toISOString() })
        .eq('id', id).eq('driver_id', yo.driverId).eq('estado', 'asignado').select('id');
      if (data && data.length > 0) {
        await db.from('ride_avisos').delete().eq('ride_id', id).neq('driver_id', yo.driverId);
        await avanzarOlas(db, id);
      }
      return NextResponse.json({ ok: !!data && data.length > 0 });
    }
    case 'pausa': {
      await db.from('driver_acceso').update({ pausado: body.pausado === true }).eq('driver_id', yo.driverId);
      return NextResponse.json({ ok: true });
    }
    case 'ubicacion': {
      const c = coordenada(body.lat, body.lng);
      if (!c) return NextResponse.json({ ok: false }, { status: 400 });
      await db.from('driver_acceso').update({ lat: c.lat, lng: c.lng, ubicado_at: new Date().toISOString() }).eq('driver_id', yo.driverId);
      return NextResponse.json({ ok: true });
    }
    case 'zonas': {
      // Zonas donde trabaja (vacío = cualquiera). Solo ids de zonas que existen.
      const ids = Array.isArray(body.zonas) ? (body.zonas as unknown[]).map((x) => texto(x, 30)).filter((x) => !!zonaPorId(x)) : [];
      await db.from('driver_acceso').update({ zonas: Array.from(new Set(ids)) }).eq('driver_id', yo.driverId);
      return NextResponse.json({ ok: true });
    }
    case 'zona': {
      const z = zonaPorId(texto(body.zona, 30));
      await db.from('driver_acceso').update(z
        ? { zona: z.id, zona_hasta: new Date(Date.now() + 3 * 3_600_000).toISOString() }
        : { zona: null, zona_hasta: null }).eq('driver_id', yo.driverId);
      return NextResponse.json({ ok: true });
    }
    case 'base': {
      const c = coordenada(body.lat, body.lng);
      if (!c) return NextResponse.json({ ok: false }, { status: 400 });
      await db.from('driver_acceso').update({ base_lat: c.lat, base_lng: c.lng }).eq('driver_id', yo.driverId);
      return NextResponse.json({ ok: true });
    }
    case 'suscribir': {
      const s = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
      const endpoint = s?.endpoint, p256dh = s?.keys?.p256dh, auth = s?.keys?.auth;
      if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000) {
        return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
      }
      const { error: e1 } = await db.from('push_subs').upsert({ endpoint, p256dh, auth, user_agent: (request.headers.get('user-agent') || '').slice(0, 200) }, { onConflict: 'endpoint' });
      const { error: e2 } = e1 ? { error: e1 } : await db.from('driver_push').upsert({ driver_id: yo.driverId, endpoint }, { onConflict: 'driver_id,endpoint' });
      if (e1 || e2) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case 'baja': {
      const endpoint = texto(body.endpoint, 1000);
      if (endpoint) await db.from('driver_push').delete().eq('driver_id', yo.driverId).eq('endpoint', endpoint);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }
}
