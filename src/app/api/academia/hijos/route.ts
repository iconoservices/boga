import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clienteServicio } from '@/lib/pushServidor';
import { hoyLima } from '@/lib/fechaLima';
import { moduloAcademia } from '@/lib/modulos';

// Los hijos de un padre que inició sesión en la app de la academia.
//   POST {store}                       → [{nombre, grupo, token, llegadaHoy}] de los hijos de esa cuenta
//   POST {store, accion:'vincular', codigo} → vincula la cuenta con el alumno que tiene ese código y devuelve la lista
// Va con la sesión (`Authorization: Bearer`). Un hijo es de esa cuenta si el dueño anotó el MISMO correo como
// «correo del padre» (se guarda en minúscula; el correo de la cuenta está verificado por el inicio de sesión) o si el padre lo vinculó con el código.

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,80}$/;
const CODIGO = /^[A-Z0-9]{6}$/;

// Freno por IP contra adivinar códigos (en memoria; defensa básica).
const VENTANA_MS = 10 * 60_000;
const MAX_POR_VENTANA = 20;
const visitas = new Map<string, { n: number; desde: number }>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const v = visitas.get(ip);
  if (!v || ahora - v.desde > VENTANA_MS) { visitas.set(ip, { n: 1, desde: ahora }); return false; }
  v.n += 1;
  return v.n > MAX_POR_VENTANA;
}

async function usuarioDe(request: Request): Promise<{ id: string; email: string } | null> {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: { user }, error } = await c.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: (user.email || '').toLowerCase() };
}

type Fila = { id: string; nombre: string; grupo: string | null; token: string };

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: 'Servidor sin configurar' }, { status: 500 });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';
  if (excedeLimite(ip)) return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });

  const yo = await usuarioDe(request);
  if (!yo) return NextResponse.json({ error: 'Inicia sesión para ver a tus hijos' }, { status: 401 });

  const body = await request.json().catch(() => null) as { store?: unknown; accion?: unknown; codigo?: unknown } | null;
  const slug = typeof body?.store === 'string' ? body.store.trim() : '';
  if (!SLUG.test(slug)) return NextResponse.json({ error: 'Academia inválida' }, { status: 400 });

  const { data: tienda } = await db.from('stores').select('modulos').eq('slug', slug).maybeSingle();
  if (!tienda || !moduloAcademia(tienda.modulos)) return NextResponse.json({ hijos: [] });

  if (body?.accion === 'vincular') {
    const codigo = (typeof body.codigo === 'string' ? body.codigo : '').trim().toUpperCase();
    if (!CODIGO.test(codigo)) return NextResponse.json({ error: 'El código tiene 6 letras o números' }, { status: 400 });
    const { data: alumno } = await db.from('alumnos').select('id').eq('store', slug).eq('codigo', codigo).eq('activo', true).maybeSingle();
    if (!alumno) return NextResponse.json({ error: 'No encontramos un alumno con ese código' }, { status: 404 });
    const { error } = await db.from('alumno_padres').upsert({ alumno_id: alumno.id, user_id: yo.id }, { onConflict: 'alumno_id,user_id' });
    if (error) return NextResponse.json({ error: 'No se pudo vincular' }, { status: 500 });
  }

  // Hijos por correo del padre + hijos vinculados con código
  const [porCorreo, vinculos] = await Promise.all([
    yo.email
      ? db.from('alumnos').select('id,nombre,grupo,token').eq('store', slug).eq('activo', true).eq('email_padre', yo.email)
      : Promise.resolve({ data: [] as Fila[] }),
    db.from('alumno_padres').select('alumno_id').eq('user_id', yo.id),
  ]);
  const idsVinculados = ((vinculos.data ?? []) as { alumno_id: string }[]).map((v) => v.alumno_id);
  const porVinculo = idsVinculados.length
    ? (await db.from('alumnos').select('id,nombre,grupo,token').eq('store', slug).eq('activo', true).in('id', idsVinculados)).data ?? []
    : [];

  const unicos = new Map<string, Fila>();
  for (const a of [...((porCorreo.data ?? []) as Fila[]), ...(porVinculo as Fila[])]) unicos.set(a.id, a);
  const lista = [...unicos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (!lista.length) return NextResponse.json({ hijos: [] });

  const { data: marcas } = await db.from('asistencias').select('alumno_id,llegada_at').eq('store', slug).eq('fecha', hoyLima()).in('alumno_id', lista.map((a) => a.id));
  const deHoy = new Map((marcas ?? []).map((m: { alumno_id: string; llegada_at: string }) => [m.alumno_id, m.llegada_at]));

  return NextResponse.json({
    hijos: lista.map((a) => ({ nombre: a.nombre, grupo: a.grupo, token: a.token, llegadaHoy: deHoy.get(a.id) ?? null })),
  });
}
