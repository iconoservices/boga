import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente
// (no puede exportar `metadata`), así que se declaran acá en el layout de la ruta.
const TITULO = 'Trabajos en Pucallpa';
const DESC =
  'Ofertas de trabajo y gente de confianza en Pucallpa: empleos con la fecha en que se publicaron, ' +
  'y técnicos y oficios (electricistas, gasfiteros y más). Postula directo por WhatsApp, correo o enlace.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['trabajos en Pucallpa', 'empleos Pucallpa', 'ofertas de trabajo Pucallpa', 'bolsa de trabajo Pucallpa', 'oficios Pucallpa', 'técnicos Pucallpa'],
  alternates: { canonical: '/trabajos' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/trabajos', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function TrabajosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
