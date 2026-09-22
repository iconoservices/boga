import type { Metadata } from 'next';
import { getEmpleosActivos, slugEmpleo } from '@/lib/chamba.data';

// Título y descripción propios para Google. La página es un componente de cliente
// (no puede exportar `metadata`), así que se declaran acá en el layout de la ruta.
const TITULO = 'Trabajos en Pucallpa';
const DESC =
  'Ofertas de trabajo y gente de confianza en Pucallpa: empleos con la fecha en que se publicaron, ' +
  'y técnicos y oficios (electricistas, gasfiteros y más). Postula directo por WhatsApp, correo o enlace.';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['trabajos en Pucallpa', 'empleos Pucallpa', 'ofertas de trabajo Pucallpa', 'bolsa de trabajo Pucallpa', 'oficios Pucallpa', 'técnicos Pucallpa'],
  alternates: { canonical: '/trabajos' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/trabajos', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

// JSON-LD estructurado: BreadcrumbList (para migajas en Google) + ItemList
// (para que Google entienda que /trabajos es un directorio de avisos). Se
// genera del lado del servidor desde los empleos activos (misma fuente que el
// sitemap). El layout es un Server Component → puede hacer await.
export default async function TrabajosLayout({ children }: { children: React.ReactNode }) {
  const empleos = await getEmpleosActivos();

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BogaHub', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Trabajos', item: `${SITE_URL}/trabajos` },
    ],
  };

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Empleos en Pucallpa',
    description: DESC,
    numberOfItems: empleos.length,
    itemListElement: empleos.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/trabajos/${slugEmpleo(e)}`,
      name: `${e.puesto}${e.negocio ? ` · ${e.negocio}` : ''}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      {children}
    </>
  );
}
