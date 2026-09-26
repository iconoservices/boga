import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { purgeTodoCloudflare } from '@/lib/cloudflare';

// Botón "Refrescar todo" del superadmin: borra la caché de Vercel (endpoints
// públicos, catálogo de cada tienda y las páginas de tienda) y la de Cloudflare.
// Sirve después de cambiar datos directo en Supabase (SQL o su panel), que no
// pasan por ningún guardado de la app y por eso no refrescan nada solos.
// Solo superadmin.

const ENDPOINTS = [
  '/api/catalog', '/api/drivers', '/api/chamba', '/api/viajes', '/api/eventos', '/api/lugares',
  '/api/inmuebles', '/api/ventas', '/api/revista', '/api/sorteos', '/api/organizers',
];

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

  // Los productos de cada tienda tienen su propio endpoint cacheado.
  const { data: tiendas } = await supabaseComoUsuario.from('stores').select('slug');
  const slugs = (tiendas ?? []).map((t: { slug: string }) => t.slug);

  ENDPOINTS.forEach((p) => revalidatePath(p));
  revalidatePath('/'); // el Inicio se genera en el servidor con estos mismos datos
  slugs.forEach((s) => revalidatePath(`/api/catalog/${s}`));
  revalidateTag('stores', { expire: 0 });
  const cloudflare = await purgeTodoCloudflare();

  return NextResponse.json({ ok: true, tiendas: slugs.length, cloudflare });
}
