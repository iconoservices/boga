import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';

// Subida pública y segura de fotos para postulantes de Taxi Seguro.
// No requiere sesión porque el chofer aún no tiene cuenta.
// Valida que sea imagen y tamaño razonable (máx 5MB).
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const tipo = formData.get('tipo'); // 'perfil' | 'vehiculo'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // Validar tipo MIME
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes (JPG, PNG, WebP)' }, { status: 400 });
    }

    // Validar peso máximo (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen excede el límite de 5 MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const subcarpeta = tipo === 'perfil' ? 'perfiles' : 'vehiculos';
    const key = `drivers/postulaciones/${subcarpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadToR2(key, buffer, file.type || 'image/jpeg');
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[drivers/upload] error:', err);
    return NextResponse.json({ error: err.message || 'Error al procesar la imagen' }, { status: 500 });
  }
}
