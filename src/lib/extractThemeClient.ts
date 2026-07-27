import type { StoreTheme } from './templates.config';

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
    const palette = await Vibrant.from(imageUrl).getPalette();

    const vibrant    = palette.Vibrant?.hex    ?? null;
    const darkVib    = palette.DarkVibrant?.hex ?? null;
    const lightVib   = palette.LightVibrant?.hex ?? null;
    const muted      = palette.Muted?.hex      ?? null;
    const darkMuted  = palette.DarkMuted?.hex  ?? null;
    const lightMuted = palette.LightMuted?.hex ?? null;

    if (!vibrant) return null;

    const darkPop  = (palette.DarkVibrant?.population  ?? 0) + (palette.DarkMuted?.population  ?? 0);
    const lightPop = (palette.LightVibrant?.population ?? 0) + (palette.LightMuted?.population ?? 0);
    const isDark   = darkPop > lightPop;

    const primary            = vibrant;
    const bg                 = isDark ? (darkVib  ?? '#131313') : (lightVib  ?? '#f9f9ff');
    const surface            = isDark ? (darkMuted ?? '#1c1b1b') : '#ffffff';
    const surfaceContainer   = isDark ? '#201f1f' : (lightMuted ?? '#ecedf7');
    const onBg               = isDark ? '#e5e2e1' : '#191b23';
    const onSurfaceVar       = isDark ? '#c8c3b0' : '#424754';
    const outline            = isDark ? '#4d4645' : '#c2c6d6';

    return {
      primary,
      onPrimary: '#ffffff',
      primaryContainer: muted ?? primary,
      secondary: muted ?? '#545f73',
      secondaryContainer: lightMuted ?? '#d5e0f8',
      background: bg,
      surface,
      surfaceContainer,
      surfaceContainerLow:    isDark ? '#1c1b1b' : '#f2f3fd',
      surfaceContainerLowest: isDark ? '#0e0e0e' : '#ffffff',
      surfaceContainerHigh:   isDark ? '#2a2a2a' : '#e6e7f2',
      onBackground: onBg,
      onSurface: onBg,
      onSurfaceVariant: onSurfaceVar,
      outlineVariant: outline,
      fontHeadline: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
      fontLabel: "'Inter', sans-serif",
    };
  } catch {
    return null;
  }
}
