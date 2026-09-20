import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadToR2 } from '@/lib/r2';

// Antes de migrar a R2, subir una imagen pasaba por Supabase Storage, cuyas
// políticas exigían `auth.role() = 'authenticated'`. Al mover la subida acá
// esa condición hay que revalidarla a mano: sin esto, cualquiera podría
// escribir en el bucket con la llave del servidor.

export async function POST(request: Request) {
  // Se crea al atender la petición, no al cargar el módulo: si falta la llave
  // (p. ej. variable no configurada en Vercel) el deploy no se cae al construir,
  // solo falla esta ruta cuando se usa.
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado: la petición no trajo la sesión (vuelve a iniciar sesión)' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    // Se dice la causa real: "invalid JWT / expired" = la sesión venció (volver a entrar);
    // "Invalid API key" = la llave SUPABASE_SERVICE_ROLE_KEY de Vercel está mal o vacía.
    console.error('[upload] getUser falló:', authError?.message);
    return NextResponse.json({ error: `No autorizado: ${authError?.message || 'sesión inválida'}` }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const folder = formData.get('folder');

  if (!(file instanceof File) || typeof folder !== 'string' || !folder) {
    return NextResponse.json({ error: 'Falta el archivo o la carpeta destino' }, { status: 400 });
  }

  // Las fotos de la Revista solo las suben redactores / superadmin. Se pregunta
  // con el token de quien llama (misma función que la RLS).
  if (folder.split('/')[0] === 'revista') {
    const supabaseComoUsuario = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: puede } = await supabaseComoUsuario.rpc('puede_editar_revista');
    if (puede !== true) {
      return NextResponse.json({ error: 'No autorizado para la Revista' }, { status: 403 });
    }
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
