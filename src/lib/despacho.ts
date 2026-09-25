// Despacho de pedidos de taxi: a quién se le avisa y en qué orden. SOLO servidor.
//
// Cómo se logra el "más cercano" sin GPS de fondo (una web no puede seguir al chofer con la pantalla apagada):
//   1. Posición del chofer, en este orden de confianza:
//        a) GPS de los últimos 10 min (lo manda su app mientras la tiene abierta),
//        b) "estoy en tal zona" marcado a mano (vale 3 horas),
//        c) su paradero guardado.
//   2. Se ordena a los choferes por distancia al pasajero.
//   3. Los avisos salen por OLAS: primero los 3 más cercanos; si nadie acepta en 45 s, los 5 siguientes; a los
//      90 s, todos los demás. Si no se sabe dónde está nadie (o el pasajero no dio ubicación), sale una sola ola a todos.
//   4. Solo se le avisa al que está disponible: activo, sin pausa, dentro de su horario y con forma de recibir
//      el aviso (notificación activada o app abierta hace poco).

import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { disponibleAhora, normalizarHorario } from '@/lib/horario';
import { distanciaKm } from '@/lib/ciudades';
import { zonaMasCercana, zonaPorId } from '@/lib/zonasTransporte';

export const EXPIRA_MIN = 10;          // un pedido sin chofer caduca a los 10 minutos
export const GPS_FRESCO_MIN = 10;      // el GPS del chofer sirve si tiene menos de 10 minutos
export const APP_ABIERTA_MIN = 10;     // "app abierta hace poco" (para quien no activó los avisos)
export const OLAS: { cantidad: number; desdeSeg: number }[] = [
  { cantidad: 3, desdeSeg: 0 },
  { cantidad: 5, desdeSeg: 45 },
  { cantidad: Infinity, desdeSeg: 90 },
];

export interface Pedido {
  id: string; created_at: string; ciudad: string; tipo: string | null;
  pasajero_nombre: string; pasajero_tel: string;
  origen_texto: string | null; origen_lat: number | null; origen_lng: number | null; origen_zona: string | null;
  destino_texto: string | null; oferta: number | null;
  estado: string; driver_id: string | null; ola: number; inicio_busqueda_at: string;
}

interface Candidato {
  driverId: string; nombre: string; token: string;
  distanciaKm: number;                       // Infinity si no se sabe dónde está
  fuente: 'gps' | 'zona' | 'base' | 'ninguna';
}

const minDesde = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / 60_000 : Infinity);

/** Origen del pasajero: sus coordenadas, o el centro de la zona que eligió. */
export function origenDe(p: Pick<Pedido, 'origen_lat' | 'origen_lng' | 'origen_zona'>): { lat: number; lng: number } | null {
  if (p.origen_lat != null && p.origen_lng != null) return { lat: p.origen_lat, lng: p.origen_lng };
  const z = zonaPorId(p.origen_zona);
  return z ? { lat: z.lat, lng: z.lng } : null;
}

/** Zona del pedido: la que eligió el pasajero o, con GPS, la más cercana a su punto. */
export function zonaDePedido(p: Pick<Pedido, 'origen_lat' | 'origen_lng' | 'origen_zona'>) {
  if (p.origen_zona && zonaPorId(p.origen_zona)) return zonaPorId(p.origen_zona);
  return p.origen_lat != null && p.origen_lng != null ? zonaMasCercana(p.origen_lat, p.origen_lng) : null;
}

/** Dónde está un chofer según lo que sabemos: GPS reciente, zona marcada a mano o paradero. */
export function posicionChofer(a: {
  lat: number | null; lng: number | null; ubicado_at: string | null;
  zona: string | null; zona_hasta: string | null; base_lat: number | null; base_lng: number | null;
}): { lat: number; lng: number; fuente: 'gps' | 'zona' | 'base' } | null {
  if (a.lat != null && a.lng != null && minDesde(a.ubicado_at) <= GPS_FRESCO_MIN) return { lat: a.lat, lng: a.lng, fuente: 'gps' };
  const z = a.zona && a.zona_hasta && new Date(a.zona_hasta).getTime() > Date.now() ? zonaPorId(a.zona) : null;
  if (z) return { lat: z.lat, lng: z.lng, fuente: 'zona' };
  if (a.base_lat != null && a.base_lng != null) return { lat: a.base_lat, lng: a.base_lng, fuente: 'base' };
  return null;
}

export const haExpirado = (p: Pick<Pedido, 'inicio_busqueda_at'>) => minDesde(p.inicio_busqueda_at) > EXPIRA_MIN;

/** Choferes que podrían recibir este pedido, ya ordenados del más cercano al más lejano. */
export async function candidatosOrdenados(db: SupabaseClient, pedido: Pedido): Promise<Candidato[]> {
  const { data: acceso } = await db
    .from('driver_acceso')
    .select('driver_id,token,pausado,base_lat,base_lng,lat,lng,ubicado_at,zona,zona_hasta,zonas,visto_at');
  if (!acceso || acceso.length === 0) return [];

  const ids = acceso.map((a) => a.driver_id as string);
  const [{ data: choferes }, { data: pushes }] = await Promise.all([
    db.from('drivers').select('id,nombre,tipo,ciudad,status,horario_semana').in('id', ids),
    db.from('driver_push').select('driver_id').in('driver_id', ids),
  ]);
  const conPush = new Set((pushes ?? []).map((p) => p.driver_id as string));
  const porId = new Map((choferes ?? []).map((c) => [c.id as string, c]));
  const origen = origenDe(pedido);
  const zonaPedido = zonaDePedido(pedido)?.id ?? null;

  const candidatos: Candidato[] = [];
  for (const a of acceso) {
    const c = porId.get(a.driver_id as string);
    if (!c || c.status !== 'activo' || c.ciudad !== pedido.ciudad) continue;
    if (pedido.tipo && c.tipo !== pedido.tipo) continue;
    if (a.pausado) continue;
    if (disponibleAhora(normalizarHorario(c.horario_semana)) === false) continue;
    // Debe haber forma de avisarle: notificación activada, o la app abierta hace poco (la ve al refrescar).
    if (!conPush.has(a.driver_id as string) && !(minDesde(a.visto_at) <= APP_ABIERTA_MIN)) continue;

    const pos = posicionChofer(a as Parameters<typeof posicionChofer>[0]);
    const dist = origen && pos ? distanciaKm(origen.lat, origen.lng, pos.lat, pos.lng) : Infinity;

    // "Zonas que cubro": si el chofer marcó dónde trabaja y este pedido cae fuera, no se le molesta,
    // salvo que en este momento esté muy cerca del pasajero.
    const cubre = (a.zonas as string[] | null) ?? [];
    if (cubre.length > 0 && zonaPedido && !cubre.includes(zonaPedido) && !(dist <= 2.5)) continue;

    candidatos.push({ driverId: a.driver_id as string, nombre: c.nombre as string, token: a.token as string, distanciaKm: dist, fuente: pos?.fuente ?? 'ninguna' });
  }
  return candidatos.sort((x, y) => x.distanciaKm - y.distanciaKm);
}

// ─── Avisos ───
function vapidListo(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jnmcsky@gmail.com', pub, priv);
  return true;
}

/** Manda un aviso a todos los celulares de un chofer. Devuelve si al menos uno lo recibió. */
export async function avisarChofer(db: SupabaseClient, driverId: string, carga: Record<string, unknown>): Promise<boolean> {
  if (!vapidListo()) return false;
  const { data: filas } = await db.from('driver_push').select('endpoint, push_subs(endpoint,p256dh,auth)').eq('driver_id', driverId);
  const subs = (filas ?? [])
    .map((f) => (Array.isArray(f.push_subs) ? f.push_subs[0] : f.push_subs) as { endpoint: string; p256dh: string; auth: string } | null)
    .filter((s): s is { endpoint: string; p256dh: string; auth: string } => !!s);
  if (subs.length === 0) return false;

  const cuerpo = JSON.stringify(carga);
  const muertas: string[] = [];
  let alguno = false;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, cuerpo, { TTL: 300, urgency: 'high' });
      alguno = true;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) muertas.push(s.endpoint);
    }
  }));
  if (muertas.length) await db.from('push_subs').delete().in('endpoint', muertas);
  return alguno;
}

/**
 * Cuando un chofer acepta el viaje (o el pasajero lo cancela), a los demás choferes a quienes se les había avisado se
 * les reemplaza la notificación del pedido por "ya no está disponible", que se cierra sola. Así no se quedan con un
 * aviso viejo en la pantalla ni pierden tiempo tocándolo.
 */
export async function avisarCierre(db: SupabaseClient, pedidoId: string, motivo: 'tomado' | 'cancelado', excepto?: string): Promise<void> {
  const { data } = await db.from('ride_avisos').select('driver_id').eq('ride_id', pedidoId);
  const ids = (data ?? []).map((a) => a.driver_id as string).filter((id) => id !== excepto);
  await Promise.all(ids.map((id) => avisarChofer(db, id, {
    title: motivo === 'tomado' ? 'Otro chofer ya tomó este viaje' : 'El pasajero canceló el pedido',
    body: 'Sigue atento: te avisaremos del próximo.',
    url: '/transporte/chofer',
    tag: `taxi-${pedidoId}`,
    requireInteraction: false,
    cerrarEnSeg: 6,
  })));
}

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] || 'Pasajero';

/**
 * Hace salir las olas de avisos que ya tocan según el tiempo transcurrido. Es seguro llamarla muchas veces y
 * desde varios lados a la vez (la página del pasajero y la app de los choferes la llaman al refrescar): cada ola
 * se "reserva" con una actualización atómica, así sale una sola vez.
 */
export async function avanzarOlas(db: SupabaseClient, pedidoId: string): Promise<void> {
  for (let vuelta = 0; vuelta < OLAS.length; vuelta++) {
    const { data: fila } = await db.from('ride_requests').select('*').eq('id', pedidoId).maybeSingle();
    const pedido = fila as Pedido | null;
    if (!pedido || pedido.estado !== 'buscando') return;
    if (haExpirado(pedido)) {
      await db.from('ride_requests').update({ estado: 'expirado' }).eq('id', pedidoId).eq('estado', 'buscando');
      return;
    }

    const segundos = (Date.now() - new Date(pedido.inicio_busqueda_at).getTime()) / 1000;
    const objetivo = OLAS.reduce((n, o, i) => (segundos >= o.desdeSeg ? i + 1 : n), 0);
    if (pedido.ola >= objetivo) return;

    // Reservar la ola siguiente: si otro llamado ya la reservó, esta actualización no toca ninguna fila.
    const { data: reservada } = await db
      .from('ride_requests').update({ ola: pedido.ola + 1 }).eq('id', pedidoId).eq('ola', pedido.ola).eq('estado', 'buscando').select('id');
    if (!reservada || reservada.length === 0) return;
    const numeroOla = pedido.ola + 1;

    const zonaPedido = zonaDePedido(pedido);
    const [todos, { data: yaAvisados }] = await Promise.all([
      candidatosOrdenados(db, pedido),
      db.from('ride_avisos').select('driver_id').eq('ride_id', pedidoId),
    ]);
    const avisados = new Set((yaAvisados ?? []).map((a) => a.driver_id as string));
    const pendientes = todos.filter((c) => !avisados.has(c.driverId));

    // Sin ubicación del pasajero o sin saber dónde está nadie, no hay "cercanía": sale todo en la primera ola.
    const haySentido = !!origenDe(pedido) && todos.some((c) => Number.isFinite(c.distanciaKm));
    const cupo = haySentido ? OLAS[numeroOla - 1].cantidad : numeroOla === 1 ? Infinity : 0;
    const lote = pendientes.slice(0, cupo);

    for (const c of lote) {
      const cerca = Number.isFinite(c.distanciaKm);
      const km = cerca ? ` · a ${c.distanciaKm < 1 ? `${Math.max(50, Math.round(c.distanciaKm * 100) * 10)} m` : `${c.distanciaKm.toFixed(1)} km`}` : '';
      const ok = await avisarChofer(db, c.driverId, {
        // El lugar va en el título: cada chofer decide de un vistazo si le sirve.
        title: zonaPedido ? `🛺 Pedido en ${zonaPedido.nombre.split(' / ')[0]}` : '🛺 Nuevo pedido de taxi',
        body: `${primerNombre(pedido.pasajero_nombre)}: ${pedido.origen_texto || 'ubicación en el mapa'} → ${pedido.destino_texto || 'destino'}${pedido.oferta ? ` · ofrece S/ ${pedido.oferta}` : ''}${km}`,
        url: `/transporte/chofer?pedido=${pedidoId}`,
        tag: `taxi-${pedidoId}`,
        requireInteraction: true,
        vibrate: [250, 120, 250, 120, 400],
        // Botón "Aceptar" dentro de la notificación (Android y computadora). El token va cifrado dentro del aviso:
        // solo el celular de ese chofer puede leerlo.
        actions: [{ action: 'aceptar', title: '✓ Aceptar viaje' }],
        aceptar: { t: c.token, id: pedidoId },
      });
      await db.from('ride_avisos').upsert(
        { ride_id: pedidoId, driver_id: c.driverId, ola: numeroOla, distancia_km: cerca ? Number(c.distanciaKm.toFixed(2)) : null, fuente: c.fuente, push_ok: ok },
        { onConflict: 'ride_id,driver_id' },
      );
    }
  }
}
