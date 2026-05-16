import React from 'react';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/lib/context/AppContext';
import Shell from '@/components/layout/Shell';

export const viewport: Viewport = {
  themeColor: '#1A3C34',
};

export const metadata: Metadata = {
  title: 'DELVA | De la selva, su marketplace',
  description: 'Tu marketplace amazónico de confianza.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/pwa-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/pwa-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/pwa-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DELVA',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AppProvider>
          <Shell>
            {children}
          </Shell>
        </AppProvider>
      </body>
    </html>
  );
}

