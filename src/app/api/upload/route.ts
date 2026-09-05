import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

export async function POST(request: Request) {
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
