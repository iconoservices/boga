import { normalizarPerfilEmpresa } from '@/lib/perfilEmpresa';
import { normalizarMonedas } from '@/lib/monedas';
import { getTemplate } from '@/lib/templates.config';
import type { StoreTheme } from '@/lib/templates.config';
import { temaDesdePaleta } from '@/lib/paleta';
import { tieneAppPropia } from '@/lib/appPropia';
import { supabase } from '@/lib/supabase';
import { Vibrant } from 'node-vibrant/node';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

// Separado de page.tsx: un route file de Next solo puede exportar lo que el
// framework reconoce (default, metadata, generateMetadata…), así que cualquier
// otro export (como getDynamicStore, que también usa producto/[id]/page.tsx
// para renderizar la tienda real detrás de un producto) rompe el chequeo de
// tipos de las rutas si vive en el propio page.tsx.

/** Colores por defecto cuando no hay image ni template reconocido */
export const DEFAULT_THEME: StoreTheme = {
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

    // Misma lógica que el navegador (lib/paleta.ts): manda lo que más aparece en la imagen.
    return temaDesdePaleta(palette);
  } catch {
    return null;
  }
}

async function cargarTienda(slug: string) {
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
        // Sin categorías propias guardadas: cae a las de fábrica de su plantilla (mismo criterio que /admin).
        categories: (dbStore.categories && dbStore.categories.length ? dbStore.categories : tmpl?.categories) || [],
        logoImage: dbStore.logo_image || undefined,
        whatsapp: dbStore.whatsapp || undefined,
        modulos: dbStore.modulos ?? undefined,
        // Los productos de ejemplo solo salen si alguien los prendió (por defecto apagados).
        showDemoProducts: dbStore.show_demo_products ?? false,
        zona: dbStore.zona || undefined,
        direccion: dbStore.direccion || undefined,
        horario: dbStore.horario || undefined,
        rating: dbStore.rating ?? undefined,
        metodosPago: dbStore.metodos_pago || undefined,
        monedas: normalizarMonedas(dbStore.monedas),
        entrega: (dbStore.entrega === 'delivery' || dbStore.entrega === 'recojo' ? dbStore.entrega : 'ambos') as 'delivery' | 'recojo' | 'ambos',
        facebook: dbStore.facebook || undefined,
        instagram: dbStore.instagram || undefined,
        tiktok: dbStore.tiktok || undefined,
        subdominioActivo: dbStore.subdominio_activo ?? undefined,
        appPropia: tieneAppPropia({ subdominioActivo: dbStore.subdominio_activo, modulos: dbStore.modulos, externalUrl: dbStore.external_url }),
        pushActivo: dbStore.push_activo ?? undefined,
        latitud: typeof dbStore.latitud === 'number' ? dbStore.latitud : undefined,
        longitud: typeof dbStore.longitud === 'number' ? dbStore.longitud : undefined,
        mostrarUbicacion: dbStore.mostrar_ubicacion === true,
        hideHeroText: dbStore.hide_hero_text === true,
        perfilEmpresa: normalizarPerfilEmpresa(dbStore.perfil_empresa) ?? undefined,
      };
    }
  } catch (err) {
    console.error('Error fetching dynamic store:', err);
  }

  return null;
}

// Cacheado: aunque la ruta sea dinámica (usa ?preview), repetir visitas a la
// misma tienda no vuelven a consultar Supabase ni a re-descargar la portada
// para extraerle los colores. Un bot que crawlea = 1 consulta cada 5 min por
// tienda, no una por request. `fresco` salta el caché para la vista previa
// de una tienda recién creada.
const cargarTiendaCacheada = unstable_cache(cargarTienda, ['tienda-dinamica'], {
  revalidate: 300,
  tags: ['stores'],
});
export const getDynamicStore = cache((slug: string, fresco = false) =>
  fresco ? cargarTienda(slug) : cargarTiendaCacheada(slug),
);
