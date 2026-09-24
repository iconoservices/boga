import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente
// (no puede exportar `metadata`), así que se declaran acá en el layout de la ruta.
// Antes esta sección vivía en /taxi-seguro; esa dirección redirige (permanente) acá.
const TITULO = 'Taxi Seguro en Pucallpa: choferes verificados';
const DESC =
  'Mototaxis, autos y motos con chofer verificado por la comunidad BogaHub en Pucallpa. ' +
  'Los contactas directo por llamada o WhatsApp, sin tarifas ocultas ni comisiones.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['taxi Pucallpa', 'mototaxi Pucallpa', 'taxi seguro Pucallpa', 'transporte Pucallpa', 'choferes verificados Pucallpa'],
  alternates: { canonical: '/transporte' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/transporte', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function TransporteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
