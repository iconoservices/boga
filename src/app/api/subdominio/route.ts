import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { activarSubdominio, desactivarSubdominio, slugValidoParaSubdominio } from '@/lib/dominios';

// Da de alta o de baja <slug>.bogahub.app (Vercel + DNS de Cloudflare) cuando
// el superadmin prende o apaga el interruptor de subdominio de una tienda.
// Solo superadmin.

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabaseComoUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: esSuperadmin, error: authError } = await supabaseComoUsuario.rpc('is_superadmin');
  if (authError || esSuperadmin !== true) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: { slug?: unknown; activo?: unknown } = {};
  try { body = await request.json(); } catch { /* sin cuerpo */ }
  const { slug, activo } = body;
  if (typeof slug !== 'string' || !slugValidoParaSubdominio(slug)) {
    return NextResponse.json({ error: 'El slug no sirve como subdominio (solo minúsculas, números y guiones; no reservado).' }, { status: 400 });
  }

  const r = activo ? await activarSubdominio(slug) : await desactivarSubdominio(slug);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
