import type { StoreTheme } from './templates.config';
import { temaDesdePaleta } from './paleta';

/**
 * Extrae una paleta de colores de una imagen, para usar en el navegador (los
 * paneles de admin/superadmin corren client-side). Misma logica que
 * `extractThemeFromImage` en `app/[slug]/page.tsx`, pero con `node-vibrant/browser`
 * en vez de `node-vibrant/node` — esa version no corre fuera de un server
 * component, asi que no se puede compartir el mismo import entre los dos.
 */
export async function extractThemeFromImageClient(imageUrl: string): Promise<StoreTheme | null> {
  try {
    const { Vibrant } = await import('node-vibrant/browser');
    // Una imagen ya subida vive en otro dominio (fotos.bogahub.app) sin CORS: el navegador no deja leer sus píxeles.
    // Se pide por /api/img-proxy (mismo dominio). Las recién elegidas del equipo (blob:) se leen directo.
    const remota = /^https?:\/\//i.test(imageUrl) && new URL(imageUrl).origin !== window.location.origin;
    const palette = await Vibrant.from(remota ? `/api/img-proxy?u=${encodeURIComponent(imageUrl)}` : imageUrl).getPalette();

    // La decisión de colores vive en lib/paleta.ts (la comparte el servidor): manda lo que más aparece en el logo.
    return temaDesdePaleta(palette);
  } catch {
    return null;
  }
}
