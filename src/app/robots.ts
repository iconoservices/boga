import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Pantallas privadas / de gestión: no las queremos en el índice.
      // OJO: no bloquear /api/. Las páginas (Trabajos, Viajes, Market…) cargan su lista desde ahí y Google
      // necesita poder pedirla al renderizar; si se bloquea, ve las páginas vacías.
      disallow: ['/admin', '/superadmin', '/login', '/reset-password', '/orders', '/profile'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
