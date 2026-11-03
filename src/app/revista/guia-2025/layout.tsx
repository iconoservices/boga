import type { Metadata } from 'next';

const TITULO = 'Guía Comercial y Turística de Pucallpa · Edición Oficial';
const DESC =
  'La guía turística y directorio comercial oficial de Pucallpa (Ucayali): restaurantes típicos, hoteles, tours en Yarinacocha, comercios recomendados y atractivos turísticos con contacto directo por WhatsApp.';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: [
    'guía turística Pucallpa',
    'directorio comercial Pucallpa',
    'turismo Pucallpa',
    'hoteles en Pucallpa',
    'restaurantes en Pucallpa',
    'tours Yarinacocha',
    'atractivos turísticos Ucayali',
    'qué visitar en Pucallpa',
    'BogaHub Guía',
  ],
  alternates: { canonical: '/revista/guia-2025' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: '/revista/guia-2025',
    siteName: 'BogaHub',
    title: `${TITULO} · BogaHub`,
    description: DESC,
    images: [
      {
        url: `${SITE_URL}/og-directorio-pucallpa.jpg`,
        width: 1200,
        height: 675,
        alt: 'Guía Comercial y Turística de Pucallpa · BogaHub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITULO} · BogaHub`,
    description: DESC,
    images: [`${SITE_URL}/og-directorio-pucallpa.jpg`],
  },
};

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
