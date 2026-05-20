import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Boga Dash',
  description: 'Boga Market App',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/pwa-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/pwa-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/pwa-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Boga Dash',
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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
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
              <BottomNav />
              <SharedUI />
            </CartProvider>
          </DemoProvider>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
