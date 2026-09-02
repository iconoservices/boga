import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://boga.la';

// Rutas públicas indexables. Las tiendas dinámicas (/[slug]) se podrían sumar
// leyéndolas de Supabase cuando haga falta.
const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/',              changeFrequency: 'daily',   priority: 1 },
  { path: '/market',        changeFrequency: 'daily',   priority: 0.9 },
  { path: '/explore',       changeFrequency: 'daily',   priority: 0.7 },
  { path: '/eventos',       changeFrequency: 'daily',   priority: 0.8 },
  { path: '/revista',       changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/sorteos',       changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/yapu',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/taxi-seguro',   changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/alquileres',    changeFrequency: 'daily',   priority: 0.8 },
  { path: '/promotions',    changeFrequency: 'daily',   priority: 0.6 },
  { path: '/negocios',      changeFrequency: 'monthly', priority: 0.6 },
  { path: '/vende-con-boga', changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
