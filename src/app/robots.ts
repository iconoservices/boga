import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://boga.la';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Pantallas privadas / de gestión: no las queremos en el índice.
      disallow: ['/admin', '/superadmin', '/login', '/reset-password', '/orders', '/profile'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
