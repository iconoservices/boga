import type { MetadataRoute } from 'next';
import { fechaISO } from '@/lib/revista';
import { getNotasPublicadas } from '@/lib/revista.data';
import { supabase } from '@/lib/supabase';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const revalidate = 300;

// Rutas fijas indexables. Las tiendas dinámicas (/[slug]) se agregan mas
// abajo, leyendo los slugs activos de Supabase.
const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/',              changeFrequency: 'daily',   priority: 1 },
  { path: '/market',        changeFrequency: 'daily',   priority: 0.9 },
  { path: '/pension',       changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/explore',       changeFrequency: 'daily',   priority: 0.7 },
  { path: '/eventos',       changeFrequency: 'daily',   priority: 0.8 },
  { path: '/revista',       changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/sorteos',       changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/pandero',       changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/servicios',     changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/taxi-seguro',   changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/inmuebles',    changeFrequency: 'daily',   priority: 0.8 },
  { path: '/viajes',       changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/promotions',    changeFrequency: 'daily',   priority: 0.6 },
  { path: '/negocios',      changeFrequency: 'monthly', priority: 0.6 },
  // /vende-con-boga redirige a /negocios#registro — no va en el sitemap.
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const rutasFijas: MetadataRoute.Sitemap = ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Cada artículo publicado de la Revista como URL propia e indexable.
  const publicadas = await getNotasPublicadas();
  const notas: MetadataRoute.Sitemap = publicadas.map((n) => ({
    url: `${SITE_URL}/revista/${n.slug}`,
    lastModified: new Date(fechaISO(n.fecha)),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Cada tienda activa como URL propia e indexable (antes solo se descubrían
  // por los links internos de /market y /explore, nunca por el sitemap).
  const { data: activeStores } = await supabase.from('stores').select('slug').eq('status', 'active');
  const tiendas: MetadataRoute.Sitemap = (activeStores ?? []).map((s) => ({
    url: `${SITE_URL}/${s.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...rutasFijas, ...tiendas, ...notas];
}
