import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import AppFooter from '@/components/AppFooter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';
const SITE_DESC =
  'BogaHub es el sistema operativo digital de Pucallpa: comercio, movilidad segura, ' +
  'trabajo, alquiler de viviendas, eventos y estilo de vida de la ciudad en una sola app.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BogaHub · Todo Pucallpa en una app',
    template: '%s · BogaHub',
  },
  description: SITE_DESC,
  applicationName: 'BogaHub',
  keywords: [
    'Pucallpa', 'Ucayali', 'delivery Pucallpa', 'restaurantes Pucallpa',
    'qué hacer en Pucallpa', 'eventos Pucallpa', 'inmuebles Pucallpa',
    'viajes Pucallpa', 'rápidos Pucallpa', 'transporte fluvial Ucayali',
    'mototaxi seguro', 'trabajo Pucallpa', 'marketplace Pucallpa', 'BogaHub',
  ],
  // OJO: no poner `alternates.canonical` acá — se hereda a TODAS las rutas y
  // haría que /market, /revista, etc. se declaren copia de la home. Cada page
  // define su propia canónica; las que no, se auto-canonizan por su URL.
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: SITE_URL,
    siteName: 'BogaHub',
    title: 'BogaHub · Todo Pucallpa en una app',
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BogaHub · Todo Pucallpa en una app',
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
    title: 'BogaHub',
  },
  // Los íconos (favicon + apple-touch) los resuelve el App Router por convención
  // de archivos: src/app/icon.png y src/app/apple-icon.png.
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#B8130E',
};

import { CartProvider } from '@/context/CartContext';
import { DemoProvider } from '@/context/DemoContext';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import SharedUI from '@/components/SharedUI';
import MarketTabs from '@/components/MarketTabs';
import PlazaChatBubble from '@/components/PlazaChatBubble';

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
        {/* Fija data-sidebar en <html> antes del primer paint (misma lista de
            rutas y misma preferencia que lee MarketTabs), así el body ya nace
            con el padding-left correcto en vez de saltar cuando el efecto de
            React recién lo aplica. Es un <script> nativo (no next/script:
            en esta versión de Next romper la hidratación al no poder
            reconciliar un <script> hijo de <html>). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var p=window.location.pathname;
              var routes=['/market','/pension','/servicios','/taxi-seguro','/inmuebles','/viajes','/eventos','/sorteos','/pandero','/revista','/guia'];
              var show=p==='/'||routes.some(function(r){return p.indexOf(r)===0;});
              if(show){document.documentElement.dataset.sidebar=localStorage.getItem('boga_sidebar_open')==='1'?'open':'rail';}
            }catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden">
        <AuthProvider>
          <StoreSettingsProvider>
            <DemoProvider>
              <CartProvider>
                <MarketTabs />
                {children}
                <AppFooter />
                <BottomNav />
                <SharedUI />
                <PlazaChatBubble />
              </CartProvider>
            </DemoProvider>
          </StoreSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
