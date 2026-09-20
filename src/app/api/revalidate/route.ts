import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Al guardar, ocultar o borrar algo desde el superadmin (empleos, viajes, eventos…),
// esto refresca de una vez la copia guardada del endpoint público, en vez de
// esperar los hasta ~15 min que dura su caché (s-maxage + stale-while-revalidate).
// Sin esto, un cambio recién guardado tardaba en verse en la vista del usuario.
// Solo superadmin, y solo rutas de esta lista.

const PERMITIDAS = new Set([
  '/api/chamba', '/api/viajes', '/api/eventos', '/api/lugares',
  '/api/inmuebles', '/api/ventas', '/api/revista', '/api/catalog',
]);

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

  let paths: unknown = [];
  try { ({ paths } = await request.json()); } catch { /* sin cuerpo */ }
  const lista = (Array.isArray(paths) ? paths : []).filter((p): p is string => typeof p === 'string' && PERMITIDAS.has(p));
  lista.forEach((p) => revalidatePath(p));
  return NextResponse.json({ ok: true, refrescadas: lista });
}
