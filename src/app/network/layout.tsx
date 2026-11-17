import type { Metadata } from 'next';

const BANNER_NETWORK = 'https://fotos.bogahub.app/store-assets/market-banners/1794873693296-ghqqeb.webp';

export const metadata: Metadata = {
  title: 'Boga Network · Gana Dinero desde tu Celular en Pucallpa',
  description: 'Vende productos locales con entrega rápida sin invertir en mercadería o gana bonos en efectivo recomendando negocios y choferes en Pucallpa.',
  alternates: {
    canonical: 'https://bogahub.app/network',
  },
  openGraph: {
    title: 'Boga Network · Gana Dinero desde tu Celular en Pucallpa',
    description: 'Vende productos locales con entrega rápida sin inversión en mercadería o gana bonos en efectivo recomendando negocios y choferes en Pucallpa.',
    url: 'https://bogahub.app/network',
    siteName: 'Boga Network',
    images: [
      {
        url: BANNER_NETWORK,
        width: 1200,
        height: 630,
        alt: 'Boga Network · Gana Dinero desde tu Celular',
      },
    ],
    locale: 'es_PE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boga Network · Gana Dinero desde tu Celular en Pucallpa',
    description: 'Vende productos locales con entrega rápida sin inversión en mercadería o gana bonos en efectivo recomendando negocios y choferes en Pucallpa.',
    images: [BANNER_NETWORK],
  },
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

