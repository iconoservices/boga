import type { Metadata } from 'next';

// Página propia del buscador de vuelos (antes vivía dentro de /viajes). Declara su
// propia canónica: sin esto heredaría la de /viajes y Google la tomaría por copia.
const TITULO = 'Vuelos desde Pucallpa: compara tarifas y reserva';
const DESC =
  'Busca vuelos baratos desde Pucallpa (PCL) a Lima, Iquitos, Tarapoto y más. ' +
  'Compara tarifas en soles y reserva por Kiwi.com.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['vuelos Pucallpa', 'pasajes Pucallpa', 'vuelos baratos Pucallpa', 'vuelos Pucallpa Lima', 'aeropuerto Pucallpa', 'PCL'],
  alternates: { canonical: '/viajes/vuelos' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/viajes/vuelos', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

export default function VuelosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
