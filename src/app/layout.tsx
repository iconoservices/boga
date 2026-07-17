import type { Metadata, Viewport } from 'next';
import { BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import AppFooter from '@/components/AppFooter';

export const metadata: Metadata = {
  title: 'Boga Dash',
  description: 'Boga Market App',
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
      <body className="bg-background text-on-background font-body-md min-h-screen">
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
      </body>
    </html>
  );
}
