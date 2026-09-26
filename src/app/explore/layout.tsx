import type { Metadata } from 'next';
import { LdJson, ContenidoParaRastreadores } from '@/components/GeoBloque';
import { datosTiendas, itemListLd, soles } from '@/lib/geoDatos';
import { SITIO } from '@/lib/marca';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Explora las tiendas de Pucallpa';
const DESC =
  'Descubre los negocios de Pucallpa en BogaHub: restaurantes, tiendas, belleza y más, con su carta y su WhatsApp.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['tiendas Pucallpa', 'negocios Pucallpa', 'restaurantes Pucallpa'],
  alternates: { canonical: '/explore' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/explore', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

// La página carga las tiendas con JavaScript; aquí se escriben también en el HTML para buscadores e IAs.
export const revalidate = 300;

export default async function ExploreLayout({ children }: { children: React.ReactNode }) {
  const tiendas = await datosTiendas(6);
  const items = tiendas.map((t) => ({
    texto: `${t.name}${t.categoria ? ` (${t.categoria})` : ''}${t.tagline ? ` — ${t.tagline}` : ''}.${t.productos.length ? ` Productos: ${t.productos.map((p) => `${p.name} ${soles(p.price)}`).join(', ')}.` : ''}`,
    href: `${SITIO}/${t.slug}`,
  }));
  return (
    <>
      {children}
      {items.length > 0 && <LdJson data={itemListLd('Tiendas de Pucallpa en BogaHub', items.map((i) => ({ texto: i.texto, url: i.href })))} />}
      <ContenidoParaRastreadores
        titulo="Explora las tiendas de Pucallpa"
        intro="Negocios de Pucallpa en BogaHub. Cada tienda tiene su carta, sus precios y su WhatsApp para pedir."
        items={items.map((i) => ({ texto: i.texto, href: i.href }))}
      />
    </>
  );
}
