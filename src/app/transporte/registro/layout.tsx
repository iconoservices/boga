import type { Metadata } from 'next';

// El layout de /transporte declara su propia canónica; sin este, el formulario de
// postulación de choferes heredaría "/transporte" y Google lo tomaría por copia.
export const metadata: Metadata = {
  title: 'Postula como chofer en Taxi Seguro',
  description: 'Regístrate como chofer de mototaxi, auto o moto en Pucallpa y aparece en el directorio de Taxi Seguro de BogaHub.',
  alternates: { canonical: '/transporte/registro' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/transporte/registro', siteName: 'BogaHub', title: 'Postula como chofer en Taxi Seguro · BogaHub' },
};

export default function RegistroChoferLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
