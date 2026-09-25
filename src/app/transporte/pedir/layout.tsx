import type { Metadata } from 'next';

// Pantalla de uso, no de búsqueda: sin indexar y con su propia dirección (el layout de /transporte
// declara una canónica que no le corresponde).
export const metadata: Metadata = {
  title: 'Pedir un taxi en Pucallpa',
  robots: { index: false, follow: false },
  alternates: { canonical: '/transporte/pedir' },
};

export default function PedirLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
