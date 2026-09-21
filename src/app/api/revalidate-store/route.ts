import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { purgeCloudflare, rutasCatalogo } from '@/lib/cloudflare';

// Al guardar un producto o tu tienda desde el panel del negocio, refresca de
// una vez la copia guardada del catálogo (la de Vercel y la de Cloudflare), en
// vez de esperar los 2-5 min de la caché. Solo el dueño de esa tienda o un
// superadmin.

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let slug: unknown;
  try { ({ slug } = await request.json()); } catch { /* sin cuerpo */ }
  if (typeof slug !== 'string' || !slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 });

  const supabaseComoUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await supabaseComoUsuario.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [{ data: tienda }, { data: esSuperadmin }] = await Promise.all([
    supabaseComoUsuario.from('stores').select('user_id').eq('slug', slug).maybeSingle(),
    supabaseComoUsuario.rpc('is_superadmin'),
  ]);
  if (esSuperadmin !== true && tienda?.user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  rutasCatalogo(slug).forEach((p) => { if (!p.includes('?')) revalidatePath(p); });
  revalidateTag('stores', { expire: 0 });
  await purgeCloudflare(rutasCatalogo(slug));
  return NextResponse.json({ ok: true });
}
