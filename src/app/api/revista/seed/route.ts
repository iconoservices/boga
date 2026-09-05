import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NOTAS_SEED } from '@/lib/revista';
import { notaAFila } from '@/lib/revista.data';

// POST /api/revista/seed — carga las 26 notas originales (NOTAS_SEED) en la
// tabla revista_notas como 'publicada'. Idempotente: no pisa notas que ya
// existan (onConflict slug, ignoreDuplicates). Solo superadmin.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const { data: { user } } = await supabaseComoUsuario.auth.getUser();

  const filas = NOTAS_SEED.map((n) => notaAFila(n, user?.id ?? null));

  const { data, error } = await supabaseAdmin
    .from('revista_notas')
    .upsert(filas, { onConflict: 'slug', ignoreDuplicates: true })
    .select('slug');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ importadas: data?.length ?? 0, total: filas.length });
}
