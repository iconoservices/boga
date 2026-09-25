import type { Metadata } from 'next';

// App privada del chofer: nunca se indexa.
export const metadata: Metadata = {
  title: 'Taxi · App del chofer',
  robots: { index: false, follow: false },
  alternates: { canonical: '/transporte' },
};

export default function ChoferLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
