import type { Metadata } from 'next';
import { LdJson, ContenidoParaRastreadores } from '@/components/GeoBloque';
import { datosSorteosAbiertos, itemListLd } from '@/lib/geoDatos';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Sorteos en Pucallpa: participa y gana';
const DESC =
  'Sorteos de negocios de Pucallpa con premios reales. Se sortea cuando se llenan los tickets o en la fecha indicada.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['sorteos Pucallpa', 'premios Pucallpa'],
  alternates: { canonical: '/sorteos' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/sorteos', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

// La página carga los sorteos con JavaScript; aquí se escriben también en el HTML para buscadores e IAs.
export const revalidate = 300;

export default async function SorteosLayout({ children }: { children: React.ReactNode }) {
  const sorteos = await datosSorteosAbiertos();
  const textos = sorteos.map((s) => `${s.titulo}${s.patrocinador ? ` — lo patrocina ${s.patrocinador}` : ''}. ${[s.precioTicket && `Ticket: ${s.precioTicket}`, s.cierraEl && `Cierra: ${s.cierraEl}`, s.meta ? `Vendidos: ${s.vendidos} de ${s.meta}` : ''].filter(Boolean).join('. ')}`.trim());
  return (
    <>
      {children}
      {textos.length > 0 && <LdJson data={itemListLd('Sorteos abiertos en Pucallpa', textos.map((texto) => ({ texto })))} />}
      <ContenidoParaRastreadores
        titulo="Sorteos abiertos en Pucallpa"
        intro="Sorteos de negocios de Pucallpa con premios reales; se sortea al llenarse los tickets o en la fecha indicada."
        items={textos.map((texto) => ({ texto }))}
      />
    </>
  );
}
