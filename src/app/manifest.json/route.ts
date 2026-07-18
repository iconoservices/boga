import { NextRequest } from 'next/server';
import { getTemplate } from '@/lib/templates.config';
import { BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';

// El icono puede venir de una subida del comercio (jpg, png, webp) o de un
// asset propio (svg). Declarar un tipo que no corresponde hace que el navegador
// pueda descartar el icono y dejar la tienda sin poder instalarse.
function mimeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'svg': return 'image/svg+xml';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}

export async function GET(request: NextRequest) {
  let tmpl = null;
  let storeName: string | null = null;
  let storeSlug: string | null = null;

  const slug = request.nextUrl.searchParams.get('slug');
  if (slug) {
    tmpl = getTemplate(slug);
  }

  // Sin slug de tienda hay dos apps propias de la plataforma: el marketplace
  // publico (raiz) y el panel de administracion. Por defecto, el marketplace.
  const app = request.nextUrl.searchParams.get('app');
  if (!slug) {
    const isAdmin = app === 'admin';
    const manifest = isAdmin
      ? {
          id: '/admin',
          name: 'Boga Dash',
          short_name: 'Boga Dash',
          description: 'Tu panel de administración empresarial.',
          start_url: '/admin',
          scope: '/admin',
          theme_color: '#5244e1',
        }
      : {
          id: '/',
          name: 'Boga Market',
          short_name: 'Boga Market',
          description: 'Descubre tiendas y productos cerca de ti.',
          start_url: '/',
          scope: '/',
          theme_color: '#b8130e',
        };

    return new Response(
      JSON.stringify({
        ...manifest,
        display: 'standalone',
        background_color: '#ffffff',
        lang: 'es',
        orientation: 'portrait',
        icons: [
          {
            src: BOGA_DEFAULT_ICON,
            sizes: '512x512',
            type: mimeFromUrl(BOGA_DEFAULT_ICON),
            purpose: 'any maskable',
          },
        ],
      }),
      { headers: { 'Content-Type': 'application/manifest+json' } }
    );
  }

  let dbLogo: string | null = null;
  let dbHero: string | null = null;
  let dbTheme: Record<string, string> | null = null;
  if (slug) {
    const { data } = await supabase
      .from('stores')
      .select('name, logo_image, hero_image, theme, template')
      .eq('slug', slug)
      .maybeSingle();
    if (data) {
      storeName = data.name;
      storeSlug = slug;
      if (data.logo_image) dbLogo = data.logo_image;
      if (data.hero_image) dbHero = data.hero_image;
      if (data.theme && Object.keys(data.theme).length > 0) dbTheme = data.theme;
      // La tienda guarda el id de su plantilla; el slug de la tienda no es el id de la plantilla
      if (!tmpl && data.template) tmpl = getTemplate(data.template);
    }
  }

  if (!tmpl) {
    const referer = request.headers.get('referer') || '';
    const match = referer.match(/\/(preview\/)?(\w+)/);
    if (match) {
      tmpl = getTemplate(match[2]);
    }
  }

  const iconSrc = dbLogo || dbHero || tmpl?.iconImage || tmpl?.heroImage || BOGA_DEFAULT_ICON;
  const iconType = mimeFromUrl(iconSrc);

  const displayName = storeName || tmpl?.name || 'Boga Dash';
  // El tema propio de la tienda manda sobre el de su plantilla
  const bgColor = dbTheme?.background || tmpl?.theme?.background || '#ffffff';
  const themeColor = dbTheme?.primary || tmpl?.theme?.primary || '#5244e1';

  // Cada tienda se instala como su propia app: scope propio para que el navegador
  // no las trate como una sola PWA compartida
  const scope = storeSlug ? `/${storeSlug}` : (tmpl ? `/preview/${tmpl.id}` : '/');

  const manifest = {
    // Identidad de la app. Sin `id`, dos tiendas del mismo dominio pueden
    // terminar tratadas como la misma PWA instalada (y el acceso directo de
    // una abre la otra, o el marketplace).
    id: storeSlug ? `/${storeSlug}` : (tmpl ? `/preview/${tmpl.id}` : '/admin'),
    name: displayName,
    short_name: displayName.slice(0, 12),
    description: storeName ? `${storeName} en Boga Market` : (tmpl ? `Plantilla: ${tmpl.name}` : 'Tu panel de administración empresarial.'),
    start_url: storeSlug ? `/${storeSlug}` : (tmpl ? `/preview/${tmpl.id}` : '/admin'),
    display: 'standalone',
    background_color: bgColor,
    theme_color: themeColor,
    lang: 'es',
    scope,
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
