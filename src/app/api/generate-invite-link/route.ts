import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// service_role: nunca al navegador. Solo esta ruta la usa, para poder
// generar el link de invitación sin depender de que Supabase mande el
// correo (así se puede copiar y mandar por WhatsApp).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Quién es superadmin lo decide public.is_superadmin() en la base, la misma
  // función que usan las políticas RLS — no una lista aparte acá. Se pregunta
  // con el token de quien llama, así que un token inválido también da false.
  const supabaseComoUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: esSuperadmin, error: authError } = await supabaseComoUsuario.rpc('is_superadmin');
  if (authError || esSuperadmin !== true) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { email, redirectTo, slug } = await request.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Falta el correo' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // generateLink ya crea la cuenta si no existia y devuelve su id de una, sin
  // esperar a que la persona toque el link: eso permite asignarle la tienda
  // en el mismo momento de invitarla, en vez de tener que volver despues a
  // mano cuando entre por primera vez.
  if (typeof slug === 'string' && slug && data.user?.id) {
    const { error: assignError } = await supabaseAdmin
      .from('stores')
      .update({ user_id: data.user.id })
      .eq('slug', slug);
    if (assignError) {
      return NextResponse.json({ error: `Se generó el link pero no se pudo asignar la tienda: ${assignError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ link: data.properties?.action_link, userId: data.user?.id ?? null });
}
