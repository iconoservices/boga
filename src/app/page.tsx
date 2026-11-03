import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { cargarHome } from '@/lib/homeData';

export const revalidate = 43200;

export const metadata: Metadata = {
  title: 'BogaHub · Directorio Comercial y Turístico | Todo Pucallpa en una sola plataforma',
  description:
    'El directorio comercial y turístico oficial de Pucallpa (Ucayali): encuentra comercios, restaurantes, hoteles, tours en Yarinacocha, servicios, alquileres, eventos y transporte en un solo lugar.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: 'https://bogahub.app',
    siteName: 'BogaHub',
    title: 'BogaHub · Directorio Comercial y Turístico de Pucallpa',
    description: 'Todo Pucallpa en una sola plataforma: comercios, servicios, turismo, eventos y mucho más.',
    images: [
      {
        url: 'https://bogahub.app/og-directorio-pucallpa.jpg',
        width: 1200,
        height: 675,
        alt: 'BogaHub · Directorio Comercial y Turístico de Pucallpa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BogaHub · Directorio Comercial y Turístico de Pucallpa',
    description: 'Todo Pucallpa en una sola plataforma: comercios, servicios, turismo, eventos y mucho más.',
    images: ['https://bogahub.app/og-directorio-pucallpa.jpg'],
  },
};

export default async function HomePage() {
  const inicial = await cargarHome();
  return <HomeClient inicial={inicial} />;
}
