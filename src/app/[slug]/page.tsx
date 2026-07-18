import { getTemplate } from '@/lib/templates.config';
import type { StoreTheme } from '@/lib/templates.config';
import { BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from './StoreRenderer';
import { supabase } from '@/lib/supabase';
import { Vibrant } from 'node-vibrant/node';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/** Colores por defecto cuando no hay image ni template reconocido */
const DEFAULT_THEME: StoreTheme = {
  primary: '#0058be',
  onPrimary: '#ffffff',
  primaryContainer: '#2170e4',
  secondary: '#545f73',
  secondaryContainer: '#d5e0f8',
  background: '#f9f9ff',
  surface: '#ffffff',
  surfaceContainer: '#ecedf7',
  surfaceContainerLow: '#f2f3fd',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e6e7f2',
  onBackground: '#191b23',
  onSurface: '#191b23',
  onSurfaceVariant: '#424754',
  outlineVariant: '#c2c6d6',
  fontHeadline: "'Inter', sans-serif",
  fontBody: "'Inter', sans-serif",
  fontLabel: "'Inter', sans-serif",
};

/** Extrae una paleta de colores de una imagen — igual que hace Sunset pero automático */
async function extractThemeFromImage(imageUrl: string): Promise<StoreTheme | null> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();

    const vibrant    = palette.Vibrant?.hex    ?? null;
    const darkVib    = palette.DarkVibrant?.hex ?? null;
    const lightVib   = palette.LightVibrant?.hex ?? null;
    const muted      = palette.Muted?.hex      ?? null;
    const darkMuted  = palette.DarkMuted?.hex  ?? null;
    const lightMuted = palette.LightMuted?.hex ?? null;

    if (!vibrant) return null;

    // Si la imagen es más oscura (como Sunset) → dark theme; si clara → light theme
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

async function getDynamicStore(slug: string) {  
  try {
    const { data: dbStore } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
      
    if (dbStore) {
      const tmpl = getTemplate(dbStore.template as string);

      const heroImage = (() => {
        if (dbStore.hero_image) return dbStore.hero_image;
        if (tmpl) return tmpl.heroImage;
        return 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80';
      })();

      let resolvedTheme: StoreTheme;
      if (dbStore.theme && Object.keys(dbStore.theme).length > 0) {
        resolvedTheme = dbStore.theme;
      } else if (tmpl) {
        resolvedTheme = tmpl.theme;
      } else {
        const extracted = await extractThemeFromImage(heroImage);
        resolvedTheme = extracted ?? DEFAULT_THEME;
      }

      return {
        slug: dbStore.slug,
        name: dbStore.name,
        tagline: dbStore.tagline || '',
        marketplaceCategory: dbStore.marketplace_category || 'General',
        template: (dbStore.template || 'default') as any,
        heroImage,
        heroAlt: dbStore.hero_alt || 'store image',
        iconImage: tmpl?.iconImage || undefined,
        theme: resolvedTheme,
        categories: dbStore.categories || [],
        logoImage: dbStore.logo_image || undefined,
        whatsapp: dbStore.whatsapp || undefined,
      };
    }
  } catch (err) {
    console.error('Error fetching dynamic store:', err);
  }
  
  return null;
}

export async function generateMetadata({ params }: Omit<Props, 'searchParams'>) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) return { title: 'Tienda no encontrada' };
  
  const iconUrl = store.logoImage || store.iconImage || store.heroImage || BOGA_DEFAULT_ICON;
  
  return {
    title: `${store.name} | Boga Market`,
    description: store.tagline,
    manifest: `/manifest.json?slug=${slug}`,
    icons: {
      icon: [
        { url: iconUrl, sizes: 'any' },
        { url: iconUrl, sizes: '192x192', type: 'image/png' },
        { url: iconUrl, sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: iconUrl, sizes: '180x180', type: 'image/png' },
      ],
    },
  };
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  let store = await getDynamicStore(slug);
  
  if (!store) {
    if (preview === 'true') {
      const defaultTmpl = getTemplate('default');
      store = {
        slug: slug,
        name: 'Nueva Tienda',
        tagline: 'Lema de la Tienda',
        marketplaceCategory: defaultTmpl?.category || 'General',
        template: 'default',
        heroImage: defaultTmpl?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
        heroAlt: defaultTmpl?.heroAlt || 'nueva tienda',
        iconImage: defaultTmpl?.iconImage || undefined,
        theme: defaultTmpl?.theme || DEFAULT_THEME,
        categories: defaultTmpl?.categories || [],
        logoImage: undefined,
        whatsapp: undefined,
      };
    } else {
      notFound();
    }
  }
  
  return <StoreRenderer store={store} />;
}
