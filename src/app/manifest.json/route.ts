import { NextRequest } from 'next/server';
import { getStoreByDomain } from '@/lib/stores.config';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  const store = getStoreByDomain(subdomain);

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
