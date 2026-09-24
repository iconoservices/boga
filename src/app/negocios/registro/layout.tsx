import type { Metadata } from 'next';

// El layout de /negocios declara su propia canónica; sin este, el formulario de registro heredaría
// "/negocios" y Google lo tomaría por copia de la landing.
export const metadata: Metadata = {
  title: 'Registra tu negocio en BogaHub',
  description: 'Cuéntanos de tu negocio en 2 minutos y armamos tu tienda propia con pedidos por WhatsApp.',
  alternates: { canonical: '/negocios/registro' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/negocios/registro', siteName: 'BogaHub', title: 'Registra tu negocio en BogaHub' },
};

export default function RegistroNegocioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
