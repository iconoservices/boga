import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'El Pandero: ahorro en grupo';
const DESC =
  'Junta o fondo colectivo: un grupo pone una cuota mensual y cada mes uno se lleva el fondo. Conoce cómo funcionará.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['pandero', 'junta de ahorro', 'pasanaco', 'ahorro en grupo Pucallpa'],
  alternates: { canonical: '/pandero' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/pandero', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function PanderoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
