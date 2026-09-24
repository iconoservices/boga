import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Digitaliza tu negocio';
const DESC =
  'Tienda propia con pedidos por WhatsApp, carta digital y, si quieres, tu lugar en el Market de tu ciudad.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['carta digital', 'tienda online Pucallpa', 'vender por WhatsApp', 'digitalizar negocio'],
  alternates: { canonical: '/negocios' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/negocios', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function NegociosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
