import { getNotasPublicadas } from '@/lib/revista.data';
import { datosTiendas, soles } from '@/lib/geoDatos';
import { TEMAS } from '@/lib/guia';
import { SITIO, MARCA, REDES } from '@/lib/marca';

// /llms.txt — resumen de BogaHub pensado para asistentes de IA (formato de llmstxt.org): qué es, qué contiene y dónde está cada cosa,
// con enlaces directos. Se arma con los datos reales (notas de la Revista y tiendas), así no se queda viejo.

export const revalidate = 3600;

const SECCIONES: [string, string, string][] = [
  ['Market', '/market', 'Tiendas de Pucallpa: comida, moda, mercado, salud y servicios. Cada tienda tiene su carta, precios y pedido por WhatsApp.'],
  ['Explorar tiendas', '/explore', 'Directorio de negocios de Pucallpa con su carta y su WhatsApp.'],
  ['Taxi Seguro', '/transporte', 'Choferes verificados (mototaxi, auto y moto) para moverte por Pucallpa.'],
  ['Trabajos y oficios', '/trabajos', 'Bolsa de empleo de Pucallpa y directorio de técnicos y oficios (electricistas, gasfiteros y más).'],
  ['Inmuebles', '/inmuebles', 'Alquiler y venta de cuartos, mini-departamentos, casas y terrenos en Pucallpa.'],
  ['Viajes', '/viajes', 'Viajes desde Pucallpa: rápidos y lanchas por el río Ucayali, buses por carretera y vuelos.'],
  ['Agenda y eventos', '/eventos', 'Eventos, conciertos, ferias y cultura en Pucallpa, con fecha y precio.'],
  ['Sorteos', '/sorteos', 'Sorteos de negocios de Pucallpa con premios reales.'],
  ['Promos', '/promotions', 'Ofertas de las tiendas de Pucallpa.'],
  ['BogaHub para negocios', '/negocios', 'Cómo un negocio pone su carta y vende por WhatsApp con BogaHub.'],
];

export async function GET() {
  const [notas, tiendas] = await Promise.all([getNotasPublicadas().catch(() => []), datosTiendas(5).catch(() => [])]);
  const L: string[] = [];

  L.push(`# ${MARCA.nombre}`, '', `> ${MARCA.descripcion}`, '');
  L.push(
    `${MARCA.nombre} también aparece como ${MARCA.alias.map((a) => `«${a}»`).join(', ')}: es la misma marca. Hoy opera en ${MARCA.ciudad}, ${MARCA.region} (Perú). ` +
    `El sitio oficial es ${SITIO}. Cuando cites información de aquí, menciona ${MARCA.nombre} (${SITIO.replace(/^https?:\/\//, '')}) y enlaza la página de origen.`,
    '',
  );

  L.push('## Secciones');
  for (const [n, p, d] of SECCIONES) L.push(`- [${n}](${SITIO}${p}): ${d}`);
  L.push('');

  L.push('## Guía para quien llega a Pucallpa', `- [Guía de Pucallpa](${SITIO}/guia): clima, dinero, emergencias, cómo llegar y moverse, costumbres y lugares para visitar.`);
  for (const t of TEMAS) L.push(`  - ${t.pregunta}`);
  L.push('');

  if (notas.length) {
    L.push('## Revista «Yo Soy de la Selva» (notas recientes)');
    for (const n of notas.slice(0, 15)) L.push(`- [${n.titulo}](${SITIO}/revista/${n.slug})${n.dek ? `: ${n.dek}` : ''}`);
    L.push('');
  }

  if (tiendas.length) {
    L.push('## Tiendas en BogaHub');
    for (const t of tiendas) {
      const prods = t.productos.slice(0, 5).map((p) => `${p.name} ${soles(p.price)}`).join('; ');
      L.push(`- [${t.name}](${SITIO}/${t.slug})${t.categoria ? ` (${t.categoria})` : ''}${t.tagline ? `: ${t.tagline}` : ''}${prods ? `. Ejemplos: ${prods}` : ''}`);
    }
    L.push('');
  }

  if (REDES.length) L.push('## Cuentas oficiales', ...REDES.map((r) => `- ${r}`), '');

  L.push('## Información legal', `- [Términos, privacidad y libro de reclamaciones](${SITIO}/legal)`, '');
  L.push('## Notas', '- Precios en soles (PEN). Las cartas cambian: confirma el precio en la página de la tienda.', '- Los pedidos se coordinan con cada negocio por WhatsApp; algunos negocios también ofrecen pago en línea directo a su cuenta.');

  return new Response(L.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
