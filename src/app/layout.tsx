import type { Metadata, Viewport } from 'next';
import { BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import AppFooter from '@/components/AppFooter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';
const SITE_DESC =
  'Boga es el sistema operativo digital de Pucallpa: comercio, movilidad segura, ' +
  'trabajo, alquiler de viviendas, eventos y estilo de vida de la ciudad en una sola app.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Boga · Todo Pucallpa en una app',
    template: '%s · Boga',
  },
  description: SITE_DESC,
  applicationName: 'Boga',
  keywords: [
    'Pucallpa', 'Ucayali', 'delivery Pucallpa', 'restaurantes Pucallpa',
    'qué hacer en Pucallpa', 'eventos Pucallpa', 'alquileres Pucallpa',
    'mototaxi seguro', 'trabajo Pucallpa', 'marketplace Pucallpa', 'Boga',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: SITE_URL,
    siteName: 'Boga',
    title: 'Boga · Todo Pucallpa en una app',
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boga · Todo Pucallpa en una app',
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: BOGA_DEFAULT_ICON, sizes: 'any' },
      { url: BOGA_DEFAULT_ICON, sizes: '192x192', type: 'image/png' },
      { url: BOGA_DEFAULT_ICON, sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: BOGA_DEFAULT_ICON, sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#5244e1',
};

import { CartProvider } from '@/context/CartContext';
import { DemoProvider } from '@/context/DemoContext';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import SharedUI from '@/components/SharedUI';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Plus+Jakarta+Sans:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden">
        <AuthProvider>
          <StoreSettingsProvider>
            <DemoProvider>
              <CartProvider>
                {children}
                <AppFooter />
                <BottomNav />
                <SharedUI />
              </CartProvider>
            </DemoProvider>
          </StoreSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
