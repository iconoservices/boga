import { NextResponse } from 'next/server';
import { clienteServicio } from '@/lib/pushServidor';
import { TOKEN_ALUMNO } from '@/lib/academia';

// El padre, desde el carnet de su hijo (/academia/alumno/<token>), activa o apaga el aviso "llegó a clase".
//   POST {t, accion: 'suscribir'|'baja', subscription?, endpoint?}
// El token del alumno es el permiso (es secreto, como el enlace del chofer).

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500 });

  const body = await request.json().catch(() => null) as {
    t?: unknown; accion?: unknown; endpoint?: unknown;
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  } | null;
  const token = typeof body?.t === 'string' ? body.t : '';
  if (!TOKEN_ALUMNO.test(token)) return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 });

  const { data: alumno } = await db.from('alumnos').select('id').eq('token', token).maybeSingle();
  if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });

  if (body?.accion === 'suscribir') {
    const s = body.subscription;
    const endpoint = s?.endpoint, p256dh = s?.keys?.p256dh, auth = s?.keys?.auth;
    if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }
    const { error: e1 } = await db.from('push_subs').upsert(
      { endpoint, p256dh, auth, user_agent: (request.headers.get('user-agent') || '').slice(0, 200) },
      { onConflict: 'endpoint' },
    );
    const { error: e2 } = e1 ? { error: e1 } : await db.from('alumno_push').upsert({ alumno_id: alumno.id, endpoint }, { onConflict: 'alumno_id,endpoint' });
    if (e2) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body?.accion === 'baja') {
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.slice(0, 1000) : '';
    if (endpoint) await db.from('alumno_push').delete().eq('alumno_id', alumno.id).eq('endpoint', endpoint);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}
