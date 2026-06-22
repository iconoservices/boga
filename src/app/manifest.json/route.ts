import { NextRequest } from 'next/server';
import { getStoreByDomain, getStore } from '@/lib/stores.config';

export async function GET(request: NextRequest) {
  let store = null;

  // 1) Try subdomain (works for bravoz.bogaperu.vercel.app)
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  store = getStoreByDomain(subdomain);

  // 2) Try referer path (works for bogaperu.vercel.app/polleria)
  if (!store) {
    const referer = request.headers.get('referer') || '';
    const match = referer.match(/\/(preview\/)?(\w+)/);
    if (match) {
      store = getStore(match[2]);
    }
  }

  const manifest = {
    name: store?.name || 'Boga Dash',
    short_name: store ? store.name.slice(0, 12) : 'BogaDash',
    description: store?.tagline || 'Tu panel de administración empresarial.',
    start_url: store ? `/${store.slug}` : '/dashboard',
    display: 'standalone',
    background_color: store?.theme.background || '#ffffff',
    theme_color: store?.theme.primary || '#5244e1',
    lang: 'es',
    scope: '/',
    orientation: 'portrait',
    icons: [
      {
        src: '/pwa-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
