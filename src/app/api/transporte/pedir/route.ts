import { NextResponse } from 'next/server';
import { normalizarCelular } from '@/lib/cliente';
import { avanzarOlas, EXPIRA_MIN } from '@/lib/despacho';
import { zonaPorId, TIPOS_PEDIDO } from '@/lib/zonasTransporte';
import { coordenada, excedeLimite, ipDe, servicio, texto } from '@/lib/transporteServidor';

// Un pasajero pide un taxi. Se guarda el pedido y sale la primera ola de avisos a los choferes disponibles
// más cercanos (ver lib/despacho.ts). Devuelve el id del pedido: quien lo tiene puede ver su estado.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const db = servicio();
  if (!db) return NextResponse.json({ error: 'El servicio de taxi no está configurado todavía.' }, { status: 503 });

  if (excedeLimite(`pedir:${ipDe(request)}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: 'Hiciste muchos pedidos seguidos. Espera unos minutos.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });

  const nombre = texto(body.nombre, 60);
  const telefono = normalizarCelular(texto(body.telefono, 30));
  const destino = texto(body.destino, 120);
  const origenTexto = texto(body.origen_texto, 120);
  const punto = coordenada(body.lat, body.lng);
  const zona = zonaPorId(texto(body.zona, 30))?.id ?? null;
  const tipo = (TIPOS_PEDIDO as readonly string[]).includes(texto(body.tipo, 20)) ? texto(body.tipo, 20) : null;
  const ofertaNum = Number(body.oferta);
  const oferta = Number.isFinite(ofertaNum) && ofertaNum >= 1 && ofertaNum <= 300 ? Math.round(ofertaNum * 100) / 100 : null;

  if (nombre.length < 2) return NextResponse.json({ error: 'Escribe tu nombre.' }, { status: 400 });
  if (!telefono) return NextResponse.json({ error: 'Escribe un celular de 9 dígitos que empiece con 9.' }, { status: 400 });
  if (!punto && !zona && !origenTexto) return NextResponse.json({ error: 'Dinos dónde estás: usa tu ubicación, elige una zona o escribe una referencia.' }, { status: 400 });
  if (!destino) return NextResponse.json({ error: '¿A dónde vas?' }, { status: 400 });

  // Un pasajero, un pedido a la vez: si ya tiene uno buscando, se devuelve ese.
  const desde = new Date(Date.now() - EXPIRA_MIN * 60_000).toISOString();
  const { data: abierto } = await db
    .from('ride_requests').select('id').eq('pasajero_tel', telefono).eq('estado', 'buscando').gte('inicio_busqueda_at', desde).limit(1).maybeSingle();
  if (abierto) return NextResponse.json({ ok: true, id: abierto.id, yaTenia: true });

  const hace1h = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from('ride_requests').select('id', { count: 'exact', head: true }).eq('pasajero_tel', telefono).gte('created_at', hace1h);
  if ((count ?? 0) >= 6) return NextResponse.json({ error: 'Ya hiciste varios pedidos en la última hora. Intenta más tarde.' }, { status: 429 });

  const { data: pedido, error } = await db
    .from('ride_requests')
    .insert({
      pasajero_nombre: nombre,
      pasajero_tel: telefono,
      tipo,
      origen_texto: origenTexto || null,
      origen_lat: punto?.lat ?? null,
      origen_lng: punto?.lng ?? null,
      origen_zona: zona,
      destino_texto: destino,
      oferta,
    })
    .select('id')
    .single();
  if (error || !pedido) {
    console.error('[transporte/pedir]', error?.message);
    return NextResponse.json({ error: 'No se pudo registrar tu pedido. Intenta de nuevo.' }, { status: 500 });
  }

  await avanzarOlas(db, pedido.id);
  const { count: avisados } = await db.from('ride_avisos').select('driver_id', { count: 'exact', head: true }).eq('ride_id', pedido.id);
  return NextResponse.json({ ok: true, id: pedido.id, avisados: avisados ?? 0 });
}
