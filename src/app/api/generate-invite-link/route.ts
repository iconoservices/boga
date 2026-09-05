import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { esSuperadmin } from '@/lib/superadmin';

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

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !esSuperadmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { email, redirectTo } = await request.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Falta el correo' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data.properties?.action_link });
}
