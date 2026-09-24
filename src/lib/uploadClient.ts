import { supabase } from '@/lib/supabase';

// Redimensiona y recomprime en el navegador antes de subir — las fotos de
// celular suelen venir de 3000-4000px y varios MB, mucho más de lo que
// cualquier tarjeta o banner necesita. Baja el lado mayor a 1600px y
// recomprime a calidad ~82%, que a ese tamaño se ve indistinguible del
// original pero pesa una fracción. PNG se mantiene PNG solo si tiene
// transparencia (logos); un PNG sin transparencia (una foto o banner guardado como PNG, que
// pesa varios MB y no se comprime por calidad) se pasa a WebP, o a JPEG si el navegador no
// sabe codificar WebP. El resto sale en JPEG. Si algo falla o no hay ganancia,
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

    // ¿Tiene transparencia? Si algún píxel no es opaco, es un logo/ícono y debe seguir siendo PNG.
    const tieneTransparencia = (() => {
      if (file.type !== 'image/png') return false;
      const px = ctx.getImageData(0, 0, w, h).data;
      for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
      return false;
    })();

    const aBlob = (tipo: string): Promise<Blob | null> => new Promise((resolve) => canvas.toBlob(resolve, tipo, quality));
    let blob: Blob | null;
    if (file.type === 'image/png' && tieneTransparencia) {
      blob = await aBlob('image/png');
    } else if (file.type === 'image/png') {
      blob = await aBlob('image/webp');
      if (!blob || blob.type !== 'image/webp') blob = await aBlob('image/jpeg'); // Safari no codifica WebP
    } else {
      blob = await aBlob('image/jpeg');
    }
    if (!blob || blob.size >= file.size) return file; // la version comprimida no gano nada

    const ext = blob.type === 'image/png' ? '.png' : blob.type === 'image/webp' ? '.webp' : '.jpg';
    return new File([blob], file.name.replace(/\.\w+$/, ext), { type: blob.type });
  } catch {
    return file;
  }
}

// Helper de cliente: sube un archivo a R2 vía /api/upload (la llave secreta de
// R2 vive solo en el servidor, nunca en el bundle del navegador). Manda el
// token de la sesión porque la ruta solo acepta usuarios logueados.
// Llama a una ruta protegida con el token de la sesión. Si el servidor dice que la
// sesión ya no existe ("Auth session missing"), intenta renovarla UNA vez y repite;
// si tampoco se puede, avisa con claridad que hay que volver a entrar.
async function llamarConSesion(url: string, armar: (token: string) => RequestInit): Promise<{ res: Response; data: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Tienes que iniciar sesión para subir imágenes');

  const intentar = async (token: string) => {
    const res = await fetch(url, armar(token));
    const data = await res.json().catch(() => ({} as Record<string, any>));
    return { res, data };
  };

  let r = await intentar(session.access_token);
  const sesionPerdida = !r.res.ok && /session|sesi[oó]n|jwt|token/i.test(String(r.data?.error || ''));
  if (sesionPerdida) {
    const { data: renovada, error } = await supabase.auth.refreshSession();
    if (error || !renovada.session) {
      throw new Error('Tu sesión venció. Cierra sesión y vuelve a entrar para subir imágenes.');
    }
    r = await intentar(renovada.session.access_token);
  }
  return r;
}

export async function uploadFile(file: File, folder: string): Promise<string> {
  const optimized = await compressImage(file);
  const formData = new FormData();
  formData.append('file', optimized);
  formData.append('folder', folder);

  const { res, data } = await llamarConSesion('/api/upload', (token) => ({
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }));
  if (!res.ok) throw new Error(data.error || `Error al subir el archivo (código ${res.status})`);
  return data.url as string;
}

/** true si la imagen vive en otra web (Facebook, etc.) y no en nuestro almacén. */
export function esImagenExterna(url?: string | null): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    return !new URL(url).hostname.endsWith('bogahub.app');
  } catch {
    return false;
  }
}

/** Guarda en nuestro almacén (R2) una copia de una imagen externa y devuelve la nueva dirección. */
export async function mirrorImage(url: string, folder: string): Promise<string> {
  const { res, data } = await llamarConSesion('/api/mirror-image', (token) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url, folder }),
  }));
  if (!res.ok) throw new Error(data.error || 'No se pudo guardar la copia de la imagen');
  return data.url as string;
}
