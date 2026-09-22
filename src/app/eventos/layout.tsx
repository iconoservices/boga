import type { Metadata } from 'next';
import { getEventosActivos, resolverFechaISO } from '@/lib/eventos.data';

const TITULO = 'Eventos en Pucallpa · Agenda Cultural, Conciertos y Qué Hacer Hoy';
const DESC =
  'Descubre qué hacer hoy en Pucallpa y Ucayali: cartelera completa de conciertos, festivales, ' +
  'ferias gastronómicas, fiestas de la selva, arte, cultura y deportes. Fechas, ubicaciones y entradas en un solo lugar.';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: [
    'eventos en Pucallpa',
    'agenda cultural Pucallpa',
    'que hacer en Pucallpa hoy',
    'conciertos en Pucallpa',
    'fiestas en Pucallpa',
    'ferias Pucallpa',
    'actividades culturales Ucayali',
    'eventos Yarinacocha',
    'Semana Jubilar Pucallpa',
    'BogaHub eventos',
  ],
  alternates: { canonical: '/eventos' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: '/eventos',
    siteName: 'BogaHub',
    title: `${TITULO} · BogaHub`,
    description: DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITULO} · BogaHub`,
    description: DESC,
  },
};

export default async function EventosLayout({ children }: { children: React.ReactNode }) {
  const eventos = await getEventosActivos();

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BogaHub', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Eventos y Agenda', item: `${SITE_URL}/eventos` },
    ],
  };

  // Google Event Schema para cada evento programado activo
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cartelera y Eventos en Pucallpa',
    description: DESC,
    numberOfItems: eventos.length,
    itemListElement: eventos.map((e, i) => {
      const fechaIso = resolverFechaISO(e);
      const precioLimpio =
        e.precio?.toLowerCase().includes('libre') || e.precio?.toLowerCase().includes('gratis')
          ? '0'
          : e.precio?.replace(/[^0-9.]/g, '') || '0';

      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: e.titulo,
          description: e.descripcion || `${e.titulo} en ${e.lugar || 'Pucallpa'}. Categoría: ${e.cat}.`,
          startDate: fechaIso || undefined,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: e.lugar || 'Pucallpa, Ucayali',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Pucallpa',
              addressRegion: 'Ucayali',
              addressCountry: 'PE',
            },
          },
          image: e.img ? [e.img] : undefined,
          organizer: {
            '@type': 'Organization',
            name: e.organiza || 'Organizador Local en Pucallpa',
            url: SITE_URL,
          },
          offers: {
            '@type': 'Offer',
            price: precioLimpio,
            priceCurrency: 'PEN',
            availability: 'https://schema.org/InStock',
            url: e.linkEntradas || e.linkPostOriginal || `${SITE_URL}/eventos`,
          },
        },
      };
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      {children}
    </>
  );
}
