import type { Metadata } from 'next';
import { LdJson, ContenidoParaRastreadores } from '@/components/GeoBloque';
import { datosInmuebles, itemListLd, soles } from '@/lib/geoDatos';

// Título y descripción propios para Google. La página es un componente de cliente (no puede exportar
// `metadata`), así que se declaran acá en el layout de la ruta. Sin esto heredaba el título genérico
// del inicio y Google no distinguía esta sección de las demás.
const TITULO = 'Inmuebles en Pucallpa: alquiler y venta';
const DESC =
  'Cuartos, mini-departamentos, casas y terrenos en alquiler y venta en Pucallpa, con contacto directo por WhatsApp.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['alquiler Pucallpa', 'venta de terrenos Pucallpa', 'cuartos Pucallpa', 'casas Pucallpa'],
  alternates: { canonical: '/inmuebles' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/inmuebles', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

// La página carga los avisos con JavaScript; aquí se escriben también en el HTML para buscadores e IAs.
export const revalidate = 600;

export default async function InmueblesLayout({ children }: { children: React.ReactNode }) {
  const { alquileres, ventas } = await datosInmuebles();
  const textos = [
    ...alquileres.map((a) => `Alquiler · ${a.tipo}: ${a.titulo} — ${a.zona}, ${a.precio > 0 ? `${soles(a.precio)} al mes` : 'precio a consultar'}${a.descripcion ? `. ${a.descripcion.slice(0, 160)}` : ''}`),
    ...ventas.map((v) => `Venta · ${v.tipo}: ${v.titulo} — ${v.zona}, ${v.precio > 0 ? `${v.moneda === 'USD' ? 'US$' : 'S/'} ${v.precio.toLocaleString('es-PE')}` : 'precio a consultar'}${v.area ? `, ${v.area}` : ''}`),
  ];
  return (
    <>
      {children}
      {textos.length > 0 && <LdJson data={itemListLd('Inmuebles en Pucallpa', textos.map((texto) => ({ texto })))} />}
      <ContenidoParaRastreadores
        titulo="Inmuebles en Pucallpa: alquiler y venta"
        intro="Avisos actuales de cuartos, mini-departamentos, casas y terrenos. El contacto es directo por WhatsApp desde bogahub.app/inmuebles."
        items={textos.map((texto) => ({ texto }))}
      />
    </>
  );
}
