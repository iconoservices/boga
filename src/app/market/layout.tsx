import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Market de Pucallpa: tiendas y productos';
const DESC =
  'Compra en las tiendas de Pucallpa: comida, mercado, moda, salud y servicios. Elige tu tienda y haz tu pedido por WhatsApp.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['market Pucallpa', 'tiendas Pucallpa', 'delivery Pucallpa', 'comprar en Pucallpa'],
  alternates: { canonical: '/market' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/market', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
