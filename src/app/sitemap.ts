import type { MetadataRoute } from 'next';
import { fechaISO } from '@/lib/revista';
import { getNotasPublicadas } from '@/lib/revista.data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const revalidate = 300;

// Rutas públicas indexables. Las tiendas dinámicas (/[slug]) se podrían sumar
// leyéndolas de Supabase cuando haga falta.
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
  { path: '/alquileres',    changeFrequency: 'daily',   priority: 0.8 },
  { path: '/promotions',    changeFrequency: 'daily',   priority: 0.6 },
  { path: '/negocios',      changeFrequency: 'monthly', priority: 0.6 },
  { path: '/vende-con-boga', changeFrequency: 'monthly', priority: 0.5 },
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

  return [...rutasFijas, ...notas];
}
