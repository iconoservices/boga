import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { clienteServicio, cabecerasCors, quienEs, puedeGestionar } from '@/lib/pushServidor';
import { PUSH_LIMITES, CANAL_BOGA, dentroDeHorario, cupoMensual, inicioDeMesLima } from '@/lib/pushLimites';

// Campañas de notificaciones de una tienda (o del canal 'boga' de la plataforma).
//   GET  ?store=<slug>  → estado: seguidores, cupo restante y últimas campañas.
//   POST {store_slug, titulo, cuerpo, url?} → envía a quienes siguen esa tienda.
// Puede usarlo el DUEÑO de esa tienda o el superadmin (se comprueba en el servidor con su sesión).

export const runtime = 'nodejs';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cabecerasCors(request) });
}

async function cupo(supabase: NonNullable<ReturnType<typeof clienteServicio>>, slug: string) {
  const hace24h = new Date(Date.now() - 86_400_000).toISOString();
  const desdeMes = inicioDeMesLima().toISOString();
  const cuenta = (desde: string) =>
    supabase.from('push_campanas').select('id', { count: 'exact', head: true }).eq('store_slug', slug).gte('creada_at', desde);
  const [mes, dia, tienda, cred] = await Promise.all([
    cuenta(desdeMes), cuenta(hace24h),
    supabase.from('stores').select('subdominio_activo').eq('slug', slug).maybeSingle(),
    // Sin la columna (SQL sin correr) el saldo es 0 y todo sigue funcionando con el cupo del plan.
    supabase.from('stores').select('push_creditos').eq('slug', slug).maybeSingle(),
  ]);
  const usadasMes = mes.count ?? 0, usadasDia = dia.count ?? 0;
  const cupoMes = cupoMensual(!!tienda.data?.subdominio_activo);
  const creditos = cred.error ? 0 : Number((cred.data as { push_creditos?: number } | null)?.push_creditos) || 0;
  const usaCredito = usadasMes >= cupoMes;
  return {
    usadasMes, usadasDia, cupoMes, creditos,
    restantesMes: Math.max(0, cupoMes - usadasMes),
    usaCredito,
    puedeHoy: usadasDia < PUSH_LIMITES.maxPorDia && (!usaCredito || creditos > 0),
  };
}

export async function GET(request: Request) {
  const cors = cabecerasCors(request);
  const slug = new URL(request.url).searchParams.get('store') || '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.json({ error: 'Falta la tienda' }, { status: 400, headers: cors });

  const quien = await quienEs(request);
  if (!quien) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers: cors });
  const supabase = clienteServicio();
  if (!supabase) return NextResponse.json({ error: 'Servidor sin configurar (falta SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500, headers: cors });
  if (!(await puedeGestionar(supabase, quien, slug, CANAL_BOGA))) {
    return NextResponse.json({ error: 'No tienes permiso sobre esta tienda' }, { status: 403, headers: cors });
  }

  const [seguidores, ultimas, q] = await Promise.all([
    supabase.from('push_seguidas').select('endpoint', { count: 'exact', head: true }).eq('store_slug', slug),
    supabase.from('push_campanas').select('id,titulo,cuerpo,url,enviados,fallidos,creada_at').eq('store_slug', slug).order('creada_at', { ascending: false }).limit(8),
    cupo(supabase, slug),
  ]);
  const sinTope = quien.esSuperadmin && PUSH_LIMITES.superadminSinTope;
  return NextResponse.json({
    seguidores: seguidores.count ?? 0,
    ultimas: ultimas.data ?? [],
    limites: { maxPorDia: PUSH_LIMITES.maxPorDia, horaDesde: PUSH_LIMITES.horaDesde, horaHasta: PUSH_LIMITES.horaHasta },
    dentroDeHorario: dentroDeHorario(),
    sinTope,
    ...q,
    puedeHoy: sinTope ? true : q.puedeHoy,
    tablasListas: !seguidores.error,
  }, { headers: cors });
}

export async function POST(request: Request) {
  const cors = cabecerasCors(request);
  const quien = await quienEs(request);
  if (!quien) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401, headers: cors });

  const supabase = clienteServicio();
  if (!supabase) return NextResponse.json({ error: 'Servidor sin configurar (falta SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500, headers: cors });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: 'Faltan las claves VAPID en el servidor' }, { status: 500, headers: cors });

  const body = await request.json().catch(() => null) as { store_slug?: unknown; titulo?: unknown; cuerpo?: unknown; url?: unknown; prueba_endpoint?: unknown } | null;
  const slug = typeof body?.store_slug === 'string' ? body.store_slug : '';
  const titulo = typeof body?.titulo === 'string' ? body.titulo.trim() : '';
  const cuerpo = typeof body?.cuerpo === 'string' ? body.cuerpo.trim() : '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.json({ error: 'Falta la tienda' }, { status: 400, headers: cors });
  if (!titulo || titulo.length > 60) return NextResponse.json({ error: 'El título es obligatorio (máximo 60 caracteres)' }, { status: 400, headers: cors });
  if (!cuerpo || cuerpo.length > 160) return NextResponse.json({ error: 'El texto es obligatorio (máximo 160 caracteres)' }, { status: 400, headers: cors });

  if (!(await puedeGestionar(supabase, quien, slug, CANAL_BOGA))) {
    return NextResponse.json({ error: 'No tienes permiso para enviar avisos de esta tienda' }, { status: 403, headers: cors });
  }

  // El aviso solo puede llevar a una ruta de la misma app (nunca a otro sitio)
  let url = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!url.startsWith('/') || url.startsWith('//')) url = slug === CANAL_BOGA ? '/' : `/${slug}`;

  // Modo prueba: se envía SOLO al dispositivo de quien lo pide (su propia suscripción). No avisa a
  // nadie más, no gasta cupo, no queda en el historial y no exige horario: sirve para ver cómo se ve.
  if (typeof body?.prueba_endpoint === 'string') {
    const { data: propia } = await supabase.from('push_subs').select('endpoint,p256dh,auth').eq('endpoint', body.prueba_endpoint).maybeSingle();
    if (!propia) return NextResponse.json({ error: 'Este dispositivo todavía no está suscrito. Activa antes la campana en este navegador.' }, { status: 400, headers: cors });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jnmcsky@gmail.com', pub, priv);
    let iconoPrueba: string | undefined;
    if (slug !== CANAL_BOGA) {
      const { data: t } = await supabase.from('stores').select('logo_image,hero_image').eq('slug', slug).maybeSingle();
      iconoPrueba = t?.logo_image || t?.hero_image || undefined;
    }
    try {
      await webpush.sendNotification(
        { endpoint: propia.endpoint, keys: { p256dh: propia.p256dh, auth: propia.auth } },
        JSON.stringify({ title: titulo, body: cuerpo, url, tag: `${slug}-prueba`, icon: iconoPrueba }),
        { TTL: 3600 },
      );
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) await supabase.from('push_subs').delete().eq('endpoint', propia.endpoint);
      return NextResponse.json({ error: `No se pudo entregar la prueba (${code ?? 'error'}). Activa la campana otra vez.` }, { status: 502, headers: cors });
    }
    return NextResponse.json({ ok: true, prueba: true }, { headers: cors });
  }

  if (!dentroDeHorario()) {
    return NextResponse.json({ error: `Solo se envía entre las ${PUSH_LIMITES.horaDesde}:00 y las ${PUSH_LIMITES.horaHasta}:00 (hora de Lima).` }, { status: 409, headers: cors });
  }
  const sinTope = quien.esSuperadmin && PUSH_LIMITES.superadminSinTope;
  let gastaCredito = false;
  let creditosAntes = 0;
  if (!sinTope) {
    const q = await cupo(supabase, slug);
    if (!q.puedeHoy) {
      return NextResponse.json({
        error: q.usadasDia >= PUSH_LIMITES.maxPorDia
          ? 'Ya enviaste una campaña en las últimas 24 horas.'
          : `Usaste las ${q.cupoMes} notificaciones de este mes. Se renuevan el día 1, o puedes comprar un paquete de notificaciones extra.`,
      }, { status: 429, headers: cors });
    }
    gastaCredito = q.usaCredito;
    creditosAntes = q.creditos;
  }

  // Suscriptores: los navegadores que siguen esta tienda
  const { data: filas, error: errSubs } = await supabase
    .from('push_seguidas')
    .select('endpoint, push_subs(endpoint,p256dh,auth)')
    .eq('store_slug', slug);
  if (errSubs) return NextResponse.json({ error: 'No se pudieron leer los suscriptores (¿corriste supabase_push.sql?)' }, { status: 500, headers: cors });
  const subs = (filas ?? [])
    .map((f) => (Array.isArray(f.push_subs) ? f.push_subs[0] : f.push_subs) as { endpoint: string; p256dh: string; auth: string } | null)
    .filter((s): s is { endpoint: string; p256dh: string; auth: string } => !!s);
  if (subs.length === 0) return NextResponse.json({ error: 'Todavía nadie sigue los avisos de esta tienda.' }, { status: 400, headers: cors });

  // Nombre e ícono de la tienda en el aviso
  let icon: string | undefined;
  if (slug !== CANAL_BOGA) {
    const { data: t } = await supabase.from('stores').select('logo_image,hero_image').eq('slug', slug).maybeSingle();
    icon = t?.logo_image || t?.hero_image || undefined;
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jnmcsky@gmail.com', pub, priv);
  const carga = JSON.stringify({ title: titulo, body: cuerpo, url, tag: `${slug}-campana`, icon });

  let enviados = 0, fallidos = 0;
  const muertas: string[] = [];
  const LOTE = 25;
  for (let i = 0; i < subs.length; i += LOTE) {
    const resultados = await Promise.allSettled(
      subs.slice(i, i + LOTE).map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86_400 }),
      ),
    );
    resultados.forEach((r, j) => {
      if (r.status === 'fulfilled') enviados++;
      else {
        fallidos++;
        const code = (r.reason as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) muertas.push(subs[i + j].endpoint); // el navegador ya no la acepta
      }
    });
  }
  if (muertas.length) await supabase.from('push_subs').delete().in('endpoint', muertas);

  await supabase.from('push_campanas').insert({ store_slug: slug, titulo, cuerpo, url, enviada_por: quien.userId, enviados, fallidos });
  // Fuera del cupo del mes: gasta 1 aviso del saldo comprado (solo si el saldo no cambió mientras tanto)
  if (gastaCredito) await supabase.from('stores').update({ push_creditos: creditosAntes - 1 }).eq('slug', slug).eq('push_creditos', creditosAntes);
  return NextResponse.json({ ok: true, enviados, fallidos, limpiadas: muertas.length }, { headers: cors });
}
