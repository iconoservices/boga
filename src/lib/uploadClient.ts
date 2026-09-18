import { supabase } from '@/lib/supabase';

// Redimensiona y recomprime en el navegador antes de subir — las fotos de
// celular suelen venir de 3000-4000px y varios MB, mucho más de lo que
// cualquier tarjeta o banner necesita. Baja el lado mayor a 1600px y
// recomprime a calidad ~82%, que a ese tamaño se ve indistinguible del
// original pero pesa una fracción. PNG se mantiene PNG (logos con
// transparencia); el resto sale en JPEG. Si algo falla o no hay ganancia,
// sube el archivo tal cual.
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) return file; // ya es chica, no vale la pena tocarla

    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outType, quality));
    if (!blob || blob.size >= file.size) return file; // la version comprimida no gano nada

    const newName = file.name.replace(/\.\w+$/, outType === 'image/png' ? '.png' : '.jpg');
    return new File([blob], newName, { type: outType });
  } catch {
    return file;
  }
}

// Helper de cliente: sube un archivo a R2 vía /api/upload (la llave secreta de
// R2 vive solo en el servidor, nunca en el bundle del navegador). Manda el
// token de la sesión porque la ruta solo acepta usuarios logueados.
export async function uploadFile(file: File, folder: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Tenés que iniciar sesión para subir imágenes');

  const optimized = await compressImage(file);

  const formData = new FormData();
  formData.append('file', optimized);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir el archivo');
  return data.url as string;
}
