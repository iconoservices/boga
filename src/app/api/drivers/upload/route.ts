import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import { IMAGENES, firmaCoincide } from '@/lib/tiposArchivo';
import { ipDe } from '@/lib/transporteServidor';
import { frenar } from '@/lib/frenos';

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

    // Solo fotos de verdad (sin SVG ni extensiones inventadas: ver lib/tiposArchivo.ts)
    const ext = IMAGENES[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'Solo se permiten imágenes (JPG, PNG, WebP)' }, { status: 400 });
    }
    if (await frenar(`postulacion-foto:${ipDe(request)}`, 10, 10 * 60_000)) {
      return NextResponse.json({ error: 'Demasiadas fotos seguidas. Espera unos minutos.' }, { status: 429 });
    }

    // Validar peso máximo (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen excede el límite de 5 MB' }, { status: 400 });
    }

    const subcarpeta = tipo === 'perfil' ? 'perfiles' : 'vehiculos';
    const key = `drivers/postulaciones/${subcarpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!firmaCoincide(file.type, buffer)) {
      return NextResponse.json({ error: 'El archivo no es una imagen válida' }, { status: 400 });
    }

    const url = await uploadToR2(key, buffer, file.type);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[drivers/upload] error:', err);
    return NextResponse.json({ error: 'Error al procesar la imagen' }, { status: 500 });
  }
}
