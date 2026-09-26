import type { MetadataRoute } from 'next';
import { fechaISO } from '@/lib/revista';
import { getNotasPublicadas } from '@/lib/revista.data';
import { supabase } from '@/lib/supabase';
import { getEmpleosActivos, slugEmpleo } from '@/lib/chamba.data';
import { PRODUCTOS_MOSTRADOR } from '@/lib/productos';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const revalidate = 300;

// Rutas fijas indexables. Las tiendas dinámicas (/[slug]) se agregan mas
// abajo, leyendo los slugs activos de Supabase.
const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/',              changeFrequency: 'daily',   priority: 1 },
  { path: '/market',        changeFrequency: 'daily',   priority: 0.9 },
  { path: '/productos',     changeFrequency: 'monthly', priority: 0.5 },
  { path: '/pension',       changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/explore',       changeFrequency: 'daily',   priority: 0.7 },
  { path: '/eventos',       changeFrequency: 'daily',   priority: 0.8 },
  { path: '/revista',       changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/sorteos',       changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/trabajos',     changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/transporte',   changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/inmuebles',    changeFrequency: 'daily',   priority: 0.8 },
  { path: '/viajes',       changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/viajes/vuelos', changeFrequency: 'weekly', priority: 0.6 },
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
  const { data: activeStores } = await supabase.from('stores').select('slug,subdominio_activo').eq('status', 'active');
  const tiendas: MetadataRoute.Sitemap = (activeStores ?? []).map((s) => ({
    // Una tienda con subdominio propio activo se lista en su propia dirección (es la oficial: ver canonical)
    url: s.subdominio_activo ? `https://${s.slug}.${new URL(SITE_URL).host}` : `${SITE_URL}/${s.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Cada producto disponible, en su página propia (/<tienda>/producto/<id>).
  const tiendaPorSlug = new Map((activeStores ?? []).map((t) => [t.slug, t]));
  const { data: productosActivos } = await supabase
    .from('products')
    .select('id,store')
    .neq('status', 'Inactivo')
    .neq('status', 'Agotado');
  const fichasTienda: MetadataRoute.Sitemap = (productosActivos ?? [])
    .filter((pr) => tiendaPorSlug.has(pr.store))
    .map((pr) => {
      const t = tiendaPorSlug.get(pr.store)!;
      return {
        url: t.subdominio_activo
          ? `https://${t.slug}.${new URL(SITE_URL).host}/${t.slug}/producto/${pr.id}`
          : `${SITE_URL}/${t.slug}/producto/${pr.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      };
    });

  // Cada aviso de empleo activo, en su propia URL (para que Google los indexe uno por uno).
  const activos = await getEmpleosActivos();
  const empleos: MetadataRoute.Sitemap = activos.map((e) => ({
    url: `${SITE_URL}/trabajos/${slugEmpleo(e)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Cada ficha de /productos (terrenos, carta digital, tienda…) en su propia URL.
  const fichasProductos: MetadataRoute.Sitemap = PRODUCTOS_MOSTRADOR.map((p) => ({
    url: `${SITE_URL}/productos/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  return [...rutasFijas, ...tiendas, ...fichasTienda, ...notas, ...empleos, ...fichasProductos];
}
