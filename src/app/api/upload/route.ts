import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadToR2 } from '@/lib/r2';

// Antes de migrar a R2, subir una imagen pasaba por Supabase Storage, cuyas
// políticas exigían `auth.role() = 'authenticated'`. Al mover la subida acá
// esa condición hay que revalidarla a mano: sin esto, cualquiera podría
// escribir en el bucket con la llave del servidor.
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file');
  const folder = formData.get('folder');

  if (!(file instanceof File) || typeof folder !== 'string' || !folder) {
    return NextResponse.json({ error: 'Falta el archivo o la carpeta destino' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'bin';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadToR2(key, buffer, file.type || 'application/octet-stream');
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al subir a R2' }, { status: 500 });
  }
}
