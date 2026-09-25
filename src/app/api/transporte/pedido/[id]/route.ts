import { NextResponse } from 'next/server';
import { avanzarOlas, avisarCierre, haExpirado, OLAS } from '@/lib/despacho';
import { choferPublico, excedeLimite, ipDe, servicio, UUID, type ChoferAutenticado } from '@/lib/transporteServidor';

// Estado de un pedido de taxi, para la página del pasajero (que lo consulta cada pocos segundos).
// Al consultarlo también salen las olas de avisos que ya tocan. El id del pedido es el "permiso": es un UUID
// imposible de adivinar, así que quien lo tiene (el pasajero, o alguien a quien le compartió el viaje) puede verlo.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (excedeLimite(`estado:${ipDe(request)}`, 120, 60_000)) return NextResponse.json({ error: 'Demasiadas consultas' }, { status: 429 });
  const db = servicio();
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });

  await avanzarOlas(db, id);

  const { data: p } = await db.from('ride_requests').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  const { data: avisos } = await db.from('ride_avisos').select('ola,distancia_km,fuente').eq('ride_id', id).order('distancia_km', { ascending: true, nullsFirst: false });
  const cercano = (avisos ?? []).map((a) => a.distancia_km).filter((d): d is number => d != null)[0] ?? null;

  let chofer = null;
  if ((p.estado === 'asignado' || p.estado === 'completado') && p.driver_id) {
    const { data: c } = await db.from('drivers').select('id,nombre,tipo,placa,modelo,tel,img,veh_img,comite,ciudad').eq('id', p.driver_id).maybeSingle();
    if (c) chofer = choferPublico(c as ChoferAutenticado['chofer']);
  }

  return NextResponse.json({
    id: p.id,
    estado: p.estado,
    tipo: p.tipo,
    origen: p.origen_texto,
    destino: p.destino_texto,
    oferta: p.oferta,
    creado: p.created_at,
    busquedaDesde: p.inicio_busqueda_at,
    caduca: !haExpirado(p),
    ola: p.ola,
    olasTotales: OLAS.length,
    avisados: (avisos ?? []).length,
    masCercanoKm: cercano,
    chofer,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

// El pasajero cancela su pedido.
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  const db = servicio();
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { accion?: string } | null;
  if (body?.accion !== 'cancelar') return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  const { data } = await db.from('ride_requests').update({ estado: 'cancelado', terminado_at: new Date().toISOString() })
    .eq('id', id).in('estado', ['buscando', 'asignado']).select('id');
  const ok = !!data && data.length > 0;
  if (ok) await avisarCierre(db, id, 'cancelado');   // a los choferes avisados (incluido el que lo había aceptado)
  return NextResponse.json({ ok });
}
