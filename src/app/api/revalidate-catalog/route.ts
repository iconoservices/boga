import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { purgeCloudflare, rutasCatalogo } from '@/lib/cloudflare';

// Al guardar/borrar un banner (o cualquier otro cambio del catalogo) desde
// superadmin, esto fuerza que /api/catalog se vuelva a pedir de una en vez de
// esperar los hasta ~10-12 min que dura el cache (s-maxage=120 +
// stale-while-revalidate=600). Sin esto, un cambio recien guardado podia
// tardar bastante en verse en /market, /explore o el Inicio.

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

  revalidatePath('/api/catalog');
  await purgeCloudflare(rutasCatalogo());
  return NextResponse.json({ ok: true });
}
