// Borra de la caché de Cloudflare las copias de rutas públicas (p. ej. el
// catálogo) para que un cambio recién guardado se vea al toque, en vez de
// esperar el TTL de la regla de caché. Usa CLOUDFLARE_API_TOKEN (permiso solo
// "Cache Purge") y CLOUDFLARE_ZONE_ID, que viven en Vercel. Sin ellas (p. ej. en
// local) no hace nada. Nunca rompe el guardado si falla.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export async function purgeCloudflare(paths: string[]): Promise<void> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  if (paths.length === 0) return;
  if (!token || !zone) {
    console.warn('[purgeCloudflare] faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ZONE_ID: no se purgó nada');
    return;
  }
  try {
    const files = paths.map((p) => `${SITE_URL}${p}`);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) {
      console.error('[purgeCloudflare] Cloudflare respondió', res.status, (await res.text()).slice(0, 300));
    }
  } catch (err) {
    /* si falla, el cambio igual se ve cuando venza la caché */
    console.error('[purgeCloudflare] falló la llamada a Cloudflare:', err);
  }
}

// Rutas del catálogo afectadas por un cambio en una tienda. La caché de
// Cloudflare distingue por query string, así que cada variante se borra aparte.
export function rutasCatalogo(slug?: string): string[] {
  return [
    '/api/catalog',
    '/api/catalog?page=market',
    '/api/catalog?page=home',
    '/api/catalog?page=negocios',
    ...(slug ? [`/api/catalog/${encodeURIComponent(slug)}`] : []),
  ];
}

// Borra TODA la caché de la zona. Es lo único que cubre rutas con parámetro
// (p. ej. /api/catalog/<tienda>), porque borrar por prefijo es solo de Enterprise.
// Se usa desde el botón "Refrescar todo" del superadmin, después de tocar datos
// directo en Supabase.
export async function purgeTodoCloudflare(): Promise<boolean> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zone) return false;
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ purge_everything: true }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
