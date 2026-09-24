import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Sorteos en Pucallpa: participa y gana';
const DESC =
  'Sorteos de negocios de Pucallpa con premios reales. Se sortea cuando se llenan los tickets o en la fecha indicada.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['sorteos Pucallpa', 'premios Pucallpa'],
  alternates: { canonical: '/sorteos' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/sorteos', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function SorteosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
