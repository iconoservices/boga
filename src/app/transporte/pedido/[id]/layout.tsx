import type { Metadata } from 'next';

// Seguimiento privado de un viaje: nunca se indexa.
export const metadata: Metadata = {
  title: 'Tu pedido de taxi',
  robots: { index: false, follow: false },
  alternates: { canonical: '/transporte' },
};

export default function PedidoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
