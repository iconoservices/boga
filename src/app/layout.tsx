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
import AvisosBogaPrompt from '@/components/AvisosBogaPrompt';
import HomeFloatingActions from '@/components/HomeFloatingActions';
import { RUTAS_HUB } from '@/lib/rutasHub';
import MetaPixelTracker from '@/components/MetaPixelTracker';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Píxel de Meta "BogaHub" (ID 1326861772689912): mide visitas y
            actividad en todo el sitio para optimizar los anuncios. El ID no
            es secreto: va visible en el código por diseño de Meta. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1326861772689912');fbq('track','PageView');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1326861772689912&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* Google Analytics (GA4) de BogaHub. Solo se carga si NEXT_PUBLIC_GA_ID está puesto en Vercel
            (ej. G-XXXXXXXXXX); sin la variable no hace nada. Delva es otro proyecto y no lo usa. */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
        {/* Travelpayouts / Emerald affiliate tracking script */}
        <script
          {...{
            nowprocket: '',
            'data-noptimize': '1',
            'data-cfasync': 'false',
            'data-wpfc-render': 'false',
            'seraph-accel-crit': '1',
            'data-no-defer': '1',
            'data-cmp-ab': '2',
          }}
          dangerouslySetInnerHTML={{
            __html: `(function () {
      var script = document.createElement("script");
      script.async = 1;
      script.setAttribute("data-cmp-ab","2");
      script.src = 'https://tp-em.com/NTc3NTYy.js?t=577562';
      document.head.appendChild(script);
  })();`,
          }}
        />
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
              var host=window.location.hostname, base=${JSON.stringify(new URL(SITE_URL).host)};
              // <tienda>.bogahub.app: dentro de la tienda no va nada del "marco" de BogaHub
              // (barra de abajo, pie, barra lateral, chat). Ver .boga-chrome en globals.css.
              if(host.length>base.length&&host.slice(-(base.length+1))==='.'+base&&host.split('.')[0]!=='www'){
                document.documentElement.dataset.tienda='1';return;
              }
              var p=window.location.pathname;
              var routes=${JSON.stringify(RUTAS_HUB)};
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
                <div className="boga-chrome"><MarketTabs /></div>
                {children}
                <div className="boga-chrome"><AppFooter /></div>
                <div className="boga-chrome"><BottomNav /></div>
                <SharedUI />
                <MetaPixelTracker />
                <div className="boga-chrome"><PlazaChatBubble /></div>
                <div className="boga-chrome"><AvisosBogaPrompt /></div>
                <div className="boga-chrome"><HomeFloatingActions /></div>
              </CartProvider>
            </DemoProvider>
          </StoreSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
