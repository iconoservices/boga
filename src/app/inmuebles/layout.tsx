import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Inmuebles en Pucallpa: alquiler y venta';
const DESC =
  'Cuartos, mini-departamentos, casas y terrenos en alquiler y venta en Pucallpa, con contacto directo por WhatsApp.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['alquiler Pucallpa', 'venta de terrenos Pucallpa', 'cuartos Pucallpa', 'casas Pucallpa'],
  alternates: { canonical: '/inmuebles' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/inmuebles', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function InmueblesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
