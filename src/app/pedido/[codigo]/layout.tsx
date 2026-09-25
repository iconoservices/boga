import type { Metadata } from 'next';

// Cada enlace es privado de quien lo recibe: no debe salir en Google.
export const metadata: Metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
};

export default function PedidoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
