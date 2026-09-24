import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Explora las tiendas de Pucallpa';
const DESC =
  'Descubre los negocios de Pucallpa en BogaHub: restaurantes, tiendas, belleza y más, con su carta y su WhatsApp.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['tiendas Pucallpa', 'negocios Pucallpa', 'restaurantes Pucallpa'],
  alternates: { canonical: '/explore' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/explore', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
