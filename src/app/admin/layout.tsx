import type { Metadata } from 'next';

// El layout raíz declara el manifest del marketplace público. El panel es otra
// app: se instala aparte, con su propio nombre, icono y start_url.
export const metadata: Metadata = {
  title: 'Boga Dash',
  manifest: '/manifest.json?app=admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
