import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// POST /api/revista/revalidate — refresca el cache de /revista, los artículos
// y el sitemap sin esperar los 5 min de ISR. Lo llama /superadmin/revista
// después de guardar o publicar. Gated a redactor / superadmin.

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabaseComoUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: puede, error } = await supabaseComoUsuario.rpc('puede_editar_revista');
  if (error || puede !== true) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  revalidatePath('/revista', 'layout');
  revalidatePath('/sitemap.xml');
  return NextResponse.json({ ok: true });
}
