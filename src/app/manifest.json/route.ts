import { NextRequest } from 'next/server';
import { getTemplate } from '@/lib/templates.config';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  let tmpl = null;
  let storeName: string | null = null;
  let storeSlug: string | null = null;

  const slug = request.nextUrl.searchParams.get('slug');
  if (slug) {
    tmpl = getTemplate(slug);
  }

  let dbLogo: string | null = null;
  if (slug) {
    const { data } = await supabase.from('stores').select('name, logo_image').eq('slug', slug).maybeSingle();
    if (data) {
      storeName = data.name;
      storeSlug = slug;
      if (data.logo_image) dbLogo = data.logo_image;
    }
  }

  if (!tmpl) {
    const referer = request.headers.get('referer') || '';
    const match = referer.match(/\/(preview\/)?(\w+)/);
    if (match) {
      tmpl = getTemplate(match[2]);
    }
  }

  const iconSrc = dbLogo || tmpl?.heroImage || '/pwa-icon.png';
  const isSvg = iconSrc.endsWith('.svg');
  const iconType = isSvg ? 'image/svg+xml' : 'image/png';

  const displayName = storeName || tmpl?.name || 'Boga Dash';
  const bgColor = tmpl?.theme?.background || '#ffffff';
  const themeColor = tmpl?.theme?.primary || '#5244e1';

  const manifest = {
    name: displayName,
    short_name: displayName.slice(0, 12),
    description: storeName ? `${storeName} en Boga Market` : (tmpl ? `Plantilla: ${tmpl.name}` : 'Tu panel de administración empresarial.'),
    start_url: storeSlug ? `/${storeSlug}` : (tmpl ? `/preview/${tmpl.id}` : '/dashboard'),
    display: 'standalone',
    background_color: bgColor,
    theme_color: themeColor,
    lang: 'es',
    scope: '/',
    orientation: 'portrait',
    icons: [
      {
        src: iconSrc,
        sizes: '512x512',
        type: iconType,
        purpose: 'any maskable',
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
