import type { Metadata } from 'next';
import { LdJson } from '@/components/GeoBloque';
import { TEMAS, QUE_VISITAR } from '@/lib/guia';
import { SITIO, MARCA } from '@/lib/marca';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Guía para quien recién llega a Pucallpa';
const DESC =
  'Todo lo que necesitas saber al llegar a Pucallpa: dónde quedarte, cómo moverte, dónde comer, qué hacer y dónde trabajar.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['qué hacer en Pucallpa', 'guía Pucallpa', 'turismo Pucallpa', 'llegar a Pucallpa'],
  alternates: { canonical: '/guia' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/guia', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

// Datos estructurados de la Guía en el HTML del servidor: preguntas frecuentes (para respuestas de IA y de Google) y los lugares
// para visitar, cada uno enlazado a su nota de la Revista.
export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: TEMAS.map((t) => ({
      '@type': 'Question',
      name: t.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: t.parrafos.join(' ') },
    })),
  };
  const lugares = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Qué visitar en Pucallpa',
    numberOfItems: QUE_VISITAR.length,
    itemListElement: QUE_VISITAR.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITIO}/revista/${l.slug}`,
      item: { '@type': 'TouristAttraction', name: l.titulo, description: l.desc, url: `${SITIO}/revista/${l.slug}`, containedInPlace: { '@type': 'City', name: MARCA.ciudad } },
    })),
  };
  return (
    <>
      <LdJson data={faq} />
      <LdJson data={lugares} />
      {children}
    </>
  );
}
