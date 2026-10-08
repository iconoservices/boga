// Carga una imagen (logo, foto de producto) lista para meterla en un PDF de jsPDF.
// jsPDF solo entiende JPEG/PNG, y las fotos de la tienda suelen ser WebP: se redibujan en un canvas
// (fondo blanco) y salen como JPEG. Las remotas pasan por /api/img-proxy porque R2 no manda CORS.

export type ImagenPdf = { data: string; w: number; h: number };

export async function cargarImagenPdf(url: string | undefined | null, max = 400): Promise<ImagenPdf | null> {
  if (!url || typeof window === 'undefined') return null;
  try {
    const remota = /^https?:\/\//i.test(url) && new URL(url).origin !== window.location.origin;
    const res = await fetch(remota ? `/api/img-proxy?u=${encodeURIComponent(url)}` : url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((ok, fail) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => fail(new Error('imagen no válida'));
        i.src = objUrl;
      });
      if (!img.naturalWidth || !img.naturalHeight) return null;
      const esc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * esc);
      const h = Math.round(img.naturalHeight * esc);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return { data: canvas.toDataURL('image/jpeg', 0.85), w, h };
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  } catch {
    return null;
  }
}

/** Mide cuánto ocupa la imagen dentro de una caja (maxW x maxH) sin deformarla. */
export function ajustarImagen(img: ImagenPdf, maxW: number, maxH: number) {
  const r = Math.min(maxW / img.w, maxH / img.h);
  return { w: img.w * r, h: img.h * r };
}

/** El PDF (helvetica) no dibuja emojis ni símbolos fuera de Latin-1. */
export const textoPdf = (t: unknown) =>
  String(t ?? '')
    .replace(/[•·▪●]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0000-ÿ]/g, '')
    .trim();

/** '#rrggbb' (o '#rgb') a [r, g, b]; si no se entiende, gris oscuro. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [39, 39, 42];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
