import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Pensión de almuerzos en Pucallpa';
const DESC =
  'Almuerzo casero por semana, quincena o mes, con entrega al mediodía. Elige tu plan y deja tu interés.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['pensión de almuerzos Pucallpa', 'almuerzo casero Pucallpa', 'menú del día Pucallpa'],
  alternates: { canonical: '/pension' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/pension', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function PensionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
