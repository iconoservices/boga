import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Guía para quien recién llega a Pucallpa';
const DESC =
  'Todo lo que necesitas saber al llegar a Pucallpa: dónde quedarte, cómo moverte, dónde comer, qué hacer y dónde trabajar.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['qué hacer en Pucallpa', 'guía Pucallpa', 'turismo Pucallpa', 'llegar a Pucallpa'],
  alternates: { canonical: '/guia' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/guia', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
