import type { Metadata } from 'next';

// Título y descripción propios para Google. La página es un componente de cliente
// (no puede exportar `metadata`), así que se declaran acá en el layout de la ruta.
const TITULO = 'Viajes desde Pucallpa: rápidos, buses y vuelos';
const DESC =
  'Viaja desde Pucallpa por el río Ucayali (rápidos y lanchas), por carretera (colectivos y buses) o en avión. ' +
  'Directorio de agencias y transporte, con buscador de vuelos.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['viajes desde Pucallpa', 'rápidos Pucallpa', 'lanchas Pucallpa', 'buses Pucallpa', 'transporte fluvial Ucayali', 'vuelos Pucallpa', 'pasajes Pucallpa'],
  alternates: { canonical: '/viajes' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/viajes', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function ViajesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
