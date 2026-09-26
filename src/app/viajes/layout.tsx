import type { Metadata } from 'next';
import { LdJson, ContenidoParaRastreadores } from '@/components/GeoBloque';
import { datosViajes, itemListLd } from '@/lib/geoDatos';

// Título y descripción propios para Google. La página es un componente de cliente
// (no puede exportar `metadata`), así que se declaran acá en el layout de la ruta.
const TITULO = 'Viajes desde Pucallpa: rápidos, buses y vuelos';
const DESC =
  'Viaja desde Pucallpa por el río Ucayali (rápidos y lanchas), por carretera (colectivos y buses) o en avión. ' +
  'Directorio de agencias y transporte, con buscador de vuelos.';

export const metadata: Metadata = {
  title: TITULO,
  description: DESC,
  keywords: ['viajes desde Pucallpa', 'rápidos Pucallpa', 'lanchas Pucallpa', 'buses Pucallpa', 'transporte fluvial Ucayali', 'vuelos Pucallpa', 'pasajes Pucallpa'],
  alternates: { canonical: '/viajes' },
  openGraph: { type: 'website', locale: 'es_PE', url: '/viajes', siteName: 'BogaHub', title: `${TITULO} · BogaHub`, description: DESC },
  twitter: { card: 'summary_large_image', title: `${TITULO} · BogaHub`, description: DESC },
};

// La página carga las rutas con JavaScript; aquí se escriben también en el HTML para buscadores e IAs.
export const revalidate = 600;

const MEDIO: Record<string, string> = { fluvial: 'Fluvial', terrestre: 'Terrestre', aereo: 'Aéreo' };

export default async function ViajesLayout({ children }: { children: React.ReactNode }) {
  const rutas = await datosViajes();
  const textos = rutas.map((r) => `${MEDIO[r.medio] ?? r.medio} · desde Pucallpa a ${r.destino}${r.via ? ` vía ${r.via}` : ''}${r.agencia ? ` con ${r.agencia}` : ''}. ${[r.duracion && `Duración: ${r.duracion}`, r.frecuencia && `Salidas: ${r.frecuencia}`, r.precio && `Precio: ${r.precio}`].filter(Boolean).join('. ')}`.trim());
  return (
    <>
      {children}
      {textos.length > 0 && <LdJson data={itemListLd('Viajes desde Pucallpa', textos.map((texto) => ({ texto })))} />}
      <ContenidoParaRastreadores
        titulo="Viajes desde Pucallpa: rápidos, buses y vuelos"
        intro="Rutas por el río Ucayali, por carretera y en avión, con la agencia, la duración y el precio de referencia."
        items={textos.map((texto) => ({ texto }))}
      />
    </>
  );
}
