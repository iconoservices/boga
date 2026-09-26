import { LdJson, ContenidoParaRastreadores } from '@/components/GeoBloque';
import { productosDeTienda, esRubroComida, soles } from '@/lib/geoDatos';
import { SITIO, MARCA } from '@/lib/marca';

// Lo que un rastreador de IA necesita de UNA tienda y que la página (con JavaScript) no le da: quién es, dónde, cómo contactarla y
// su carta con precios. Datos estructurados de negocio local + la carta en texto dentro de <noscript>.
// Todo sale de los mismos datos que la tienda muestra al cliente.

type Tienda = {
  slug: string; name: string; tagline?: string; marketplaceCategory?: string; heroImage?: string; logoImage?: string;
  whatsapp?: string; zona?: string; direccion?: string; horario?: string; metodosPago?: string[];
  facebook?: string; instagram?: string; tiktok?: string; latitud?: number; longitud?: number; mostrarUbicacion?: boolean;
  subdominioActivo?: boolean;
};

const esUrl = (u?: string) => !!u && /^https?:\/\//i.test(u);

export default async function GeoTienda({ store }: { store: Tienda }) {
  const productos = await productosDeTienda(store.slug);
  const host = new URL(SITIO).host;
  const url = store.subdominioActivo ? `https://${store.slug}.${host}` : `${SITIO}/${store.slug}`;
  const comida = esRubroComida(store.marketplaceCategory || '');
  const categoria = store.marketplaceCategory && store.marketplaceCategory !== 'General' ? store.marketplaceCategory : '';
  const digitos = (store.whatsapp || '').replace(/\D/g, '');
  const enlaceProducto = (id: string) => `${SITIO}/${store.slug}/producto/${id}`;
  const lista = productos.slice(0, 100);

  const oferta = (p: (typeof lista)[number]) => ({
    '@type': 'Offer', price: p.price.toFixed(2), priceCurrency: 'PEN', availability: 'https://schema.org/InStock', url: enlaceProducto(p.id),
  });

  // Restaurantes: carta (Menu) por secciones. Otros rubros: catálogo de ofertas.
  const carta = comida
    ? {
        hasMenu: {
          '@type': 'Menu', name: `Carta de ${store.name}`, url,
          hasMenuSection: Object.entries(
            lista.reduce<Record<string, typeof lista>>((acc, p) => { (acc[p.category || 'Carta'] ||= []).push(p); return acc; }, {}),
          ).map(([nombre, ps]) => ({
            '@type': 'MenuSection', name: nombre,
            hasMenuItem: ps.map((p) => ({ '@type': 'MenuItem', name: p.name, ...(p.description ? { description: p.description } : {}), offers: oferta(p) })),
          })),
        },
      }
    : {
        hasOfferCatalog: {
          '@type': 'OfferCatalog', name: `Productos de ${store.name}`,
          itemListElement: lista.map((p) => ({ ...oferta(p), itemOffered: { '@type': 'Product', name: p.name, ...(p.description ? { description: p.description } : {}), ...(esUrl(p.image) ? { image: p.image } : {}) } })),
        },
      };

  const negocio = {
    '@context': 'https://schema.org',
    '@type': comida ? 'Restaurant' : 'Store',
    '@id': `${url}#negocio`,
    name: store.name,
    url,
    description: store.tagline || `${store.name} en ${MARCA.ciudad}${categoria ? `: ${categoria}` : ''}. Carta, precios y pedidos por WhatsApp en BogaHub.`,
    image: [store.heroImage, store.logoImage].filter(esUrl),
    ...(esUrl(store.logoImage) ? { logo: store.logoImage } : {}),
    ...(digitos.length >= 9 ? { telephone: `+${digitos.length === 9 ? '51' : ''}${digitos}` } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(store.direccion ? { streetAddress: store.direccion } : {}),
      addressLocality: MARCA.ciudad, addressRegion: MARCA.region, addressCountry: MARCA.pais,
    },
    areaServed: { '@type': 'City', name: MARCA.ciudad },
    ...(store.mostrarUbicacion && typeof store.latitud === 'number' && typeof store.longitud === 'number'
      ? { geo: { '@type': 'GeoCoordinates', latitude: store.latitud, longitude: store.longitud } } : {}),
    ...(store.metodosPago?.length ? { paymentAccepted: store.metodosPago.join(', ') } : {}),
    currenciesAccepted: 'PEN',
    ...(store.horario ? { openingHours: store.horario } : {}),
    sameAs: [store.facebook, store.instagram, store.tiktok].filter(esUrl),
    isPartOf: { '@type': 'WebSite', name: MARCA.nombre, url: SITIO },
    ...(lista.length ? carta : {}),
  };

  const intro = [
    `${store.name}${categoria ? ` — ${categoria}` : ''} en ${MARCA.ciudad}, ${MARCA.region}.`,
    store.tagline,
    store.zona && `Zona: ${store.zona}.`,
    store.direccion && `Dirección: ${store.direccion}.`,
    store.horario && `Horario: ${store.horario}.`,
    store.metodosPago?.length && `Métodos de pago: ${store.metodosPago.join(', ')}.`,
    `Pedidos por WhatsApp desde ${url}.`,
  ].filter(Boolean).join(' ');

  const items = lista.map((p) => ({
    texto: `${p.name}${p.category ? ` (${p.category})` : ''} — ${soles(p.price)}${p.anterior ? ` (antes ${soles(p.anterior)})` : ''}${p.description ? `. ${p.description}` : ''}`,
    href: enlaceProducto(p.id),
  }));

  return (
    <>
      <LdJson data={negocio} />
      <ContenidoParaRastreadores titulo={`Carta y precios de ${store.name}`} intro={intro} items={items} />
    </>
  );
}
