import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { clienteServicio, quienEs } from '@/lib/pushServidor';
import { TOKEN_ALUMNO, horaLegibleLima } from '@/lib/academia';
import { hoyLima } from '@/lib/fechaLima';
import { moduloAcademia } from '@/lib/modulos';
import { frenar } from '@/lib/frenos';
import { ipDe } from '@/lib/transporteServidor';

// Toma la asistencia: el profesor escanea el QR del carnet del alumno y queda marcada su llegada de hoy.
//   POST {store, token, pin?}  (con el PIN del profesor, o con la sesión del dueño en `Authorization: Bearer`)
// Una sola marca por alumno por día (hora de Lima). Si el padre activó los avisos, le llega "<alumno> llegó".
// Escribe el servidor con la llave de servicio: el profesor no tiene sesión.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SLUG = /^[a-z0-9-]{1,80}$/;

// Freno contra adivinar el PIN: 8 fallos por IP cada 10 minutos, compartido entre instancias (lib/frenos.ts).
const VENTANA_MS = 10 * 60_000;
const MAX_FALLOS = 8;
const bloqueado = (ip: string) => frenar(`academia-pin:${ip}`, MAX_FALLOS, VENTANA_MS, false);
const anotarFallo = (ip: string) => frenar(`academia-pin:${ip}`, MAX_FALLOS, VENTANA_MS);

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'Servidor no configurado' }, { status: 500 });

  const body = await request.json().catch(() => null) as { store?: unknown; token?: unknown; pin?: unknown } | null;
  const slug = typeof body?.store === 'string' ? body.store.trim() : '';
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';
  if (!SLUG.test(slug)) return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'Academia inválida' }, { status: 400 });

  const ip = ipDe(request);
  if (await bloqueado(ip)) return NextResponse.json({ ok: false, resultado: 'sin_permiso', mensaje: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });

  const { data: tienda } = await db.from('stores').select('slug,name,user_id,modulos').eq('slug', slug).maybeSingle();
  if (!tienda || !moduloAcademia(tienda.modulos)) {
    return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'Esta academia no tiene la asistencia activada' }, { status: 403 });
  }

  // ¿Quién escanea? El dueño (o superadmin) con su sesión, o el profesor con el PIN.
  let autorizado = false;
  if (request.headers.get('authorization')) {
    const quien = await quienEs(request);
    autorizado = !!quien && (quien.esSuperadmin || quien.userId === tienda.user_id);
  }
  if (!autorizado && pin) {
    const { data: cfg } = await db.from('academia_config').select('pin').eq('store', slug).maybeSingle();
    autorizado = !!cfg?.pin && cfg.pin === pin;
  }
  if (!autorizado) {
    await anotarFallo(ip);
    return NextResponse.json({ ok: false, resultado: 'sin_permiso', mensaje: 'PIN incorrecto o sesión vencida' }, { status: 401 });
  }

  if (!TOKEN_ALUMNO.test(token)) return NextResponse.json({ ok: false, resultado: 'no_encontrado', mensaje: 'Este QR no es un carnet de alumno' });

  const { data: alumno } = await db.from('alumnos').select('id,nombre,grupo,store,activo').eq('token', token).maybeSingle();
  if (!alumno || alumno.store !== slug) return NextResponse.json({ ok: false, resultado: 'no_encontrado', mensaje: 'Alumno no encontrado en esta academia' });
  if (!alumno.activo) return NextResponse.json({ ok: false, resultado: 'error', nombre: alumno.nombre, evento: alumno.grupo || undefined, mensaje: 'Alumno dado de baja' });

  const hoy = hoyLima();
  const { data: previa } = await db.from('asistencias').select('llegada_at').eq('alumno_id', alumno.id).eq('fecha', hoy).maybeSingle();
  if (previa) {
    return NextResponse.json({
      ok: false, resultado: 'ya_usado', nombre: alumno.nombre, evento: alumno.grupo || undefined,
      usado_at: previa.llegada_at, mensaje: `Ya marcó asistencia hoy a las ${horaLegibleLima(previa.llegada_at)}`,
    });
  }

  const ahora = new Date().toISOString();
  const { error } = await db.from('asistencias').insert({ alumno_id: alumno.id, store: slug, fecha: hoy, llegada_at: ahora });
  // Dos escaneos casi a la vez: el índice único deja pasar uno solo.
  if (error?.code === '23505') {
    return NextResponse.json({ ok: false, resultado: 'ya_usado', nombre: alumno.nombre, evento: alumno.grupo || undefined, mensaje: 'Ya marcó asistencia hoy' });
  }
  if (error) return NextResponse.json({ ok: false, resultado: 'error', mensaje: 'No se pudo registrar la asistencia' }, { status: 500 });

  // Aviso al padre (si instaló el carnet y aceptó las notificaciones). Si falla, la asistencia ya quedó marcada.
  await avisarAlPadre(db, alumno.id, alumno.nombre, tienda.name, token, ahora).catch(() => {});

  return NextResponse.json({
    ok: true, resultado: 'valido', nombre: alumno.nombre, evento: alumno.grupo || undefined,
    usado_at: ahora, mensaje: `Llegó a las ${horaLegibleLima(ahora)}`,
  });
}

async function avisarAlPadre(db: NonNullable<ReturnType<typeof clienteServicio>>, alumnoId: string, nombre: string, academia: string, token: string, llegada: string) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  const { data: enlaces } = await db.from('alumno_push').select('endpoint').eq('alumno_id', alumnoId);
  if (!enlaces?.length) return;
  const { data: subs } = await db.from('push_subs').select('endpoint,p256dh,auth').in('endpoint', enlaces.map((e: { endpoint: string }) => e.endpoint));
  if (!subs?.length) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jnmcsky@gmail.com', pub, priv);
  const carga = JSON.stringify({
    title: `${nombre} llegó a clase`,
    body: `${academia} · ${horaLegibleLima(llegada)}`,
    url: `/academia/alumno/${token}`,
    tag: `asistencia-${alumnoId}`,
  });
  await Promise.all(subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 3600 });
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) await db.from('push_subs').delete().eq('endpoint', s.endpoint);
    }
  }));
}
