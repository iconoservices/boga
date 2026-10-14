import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { precioOfertaVigente } from '@/lib/ofertas';
import { COL_PRESENTACIONES, leerPresentaciones } from '@/lib/presentaciones';
import { getDynamicStore } from '../../cargarTienda';
import StoreRenderer from '../../StoreRenderer';

// Página propia de un producto: /<tienda>/producto/<id>.
// También abre con el `slug` de texto del producto (p. ej. /delva/producto/reloj-poedagar-613---marrn): así
// funcionan los enlaces viejos que salían del feed de Delva y Google no encuentra un 404. El canonical
// siempre apunta a la dirección con el id.
//
// Existe para que Google (feed de Merchant Center) y las redes tengan un link directo a cada producto,
// y ese link abre la TIENDA de verdad (la misma plantilla que /<tienda>) con el producto ya seleccionado,
// en vez de una página genérica aparte: antes había dos vistas del mismo producto, una con ruta y sin el
// diseño de la tienda, y otra con el diseño pero sin ruta propia (el modal, solo un useState).

export const revalidate = 300;

type Params = { slug: string; id: string };

// products.id es texto: casi todos son UUID, pero los de Delva son números.
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');

const cargar = cache(async (slug: string, id: string) => {
  if (!ID_VALIDO.test(id)) return null;
  const columnas = 'id,name,description,price,image,category,status,store,precio_oferta,oferta_hasta';
  const [{ data: tienda }, { data: porId }] = await Promise.all([
    supabase
      .from('stores')
      .select('slug,name,tagline,template,theme,logo_image,hero_image,whatsapp,status,subdominio_activo,modulos')
      .eq('slug', slug)
      .maybeSingle(),
    supabase.from('products').select(columnas).eq('id', id).eq('store', slug).maybeSingle(),
  ]);
  // Sin producto con ese id, se prueba con el slug de texto (la columna solo la usan las tiendas migradas de Delva).
  let producto = porId;
  if (!producto) {
    producto = (await supabase.from('products').select(columnas).eq('slug', id).eq('store', slug).limit(1).maybeSingle()).data;
  }
  if (!producto) {
    // Enlaces con los guiones cambiados (Google a veces los junta o los separa): se busca por las mismas palabras, en orden.
    const partes = id.split(/[-_]+/).filter(Boolean);
    if (partes.length >= 2) {
      producto = (await supabase.from('products').select(columnas).ilike('slug', partes.join('%')).eq('store', slug).limit(1).maybeSingle()).data;
    }
  }
  if (!tienda || tienda.status !== 'active' || !producto || producto.status === 'Inactivo') return null;
  // Presentaciones (100 g / 250 g / 1 kg…): consulta aparte para que, si su SQL aún no se corrió, la página siga abriendo.
  const { data: conPres } = await supabase.from('products').select(COL_PRESENTACIONES).eq('id', producto.id).maybeSingle();
  const presentaciones = leerPresentaciones((conPres as Record<string, unknown> | null)?.[COL_PRESENTACIONES]);
  // Galería y reserva: consulta aparte (columnas opcionales) para que, si su SQL aún no se corrió, la página siga abriendo.
  const [{ data: extra }, { data: tiendaReserva }] = await Promise.all([
    supabase.from('products').select('images,reserva').eq('id', producto.id).maybeSingle(),
    supabase.from('stores').select('reserva_activa').eq('slug', slug).maybeSingle(),
  ]);
  const galeria = Array.isArray((extra as { images?: unknown } | null)?.images) ? ((extra as { images: unknown[] }).images.filter((u) => typeof u === 'string' && u) as string[]) : [];
  const reserva = (extra as { reserva?: boolean | null } | null)?.reserva ?? null;
  const reservaActiva = (tiendaReserva as { reserva_activa?: boolean } | null)?.reserva_activa === true;
  return { tienda, producto, presentaciones, galeria, reserva, reservaActiva };
});

const urlOficial = (tienda: { slug: string; subdominio_activo: boolean | null }, id: string) =>
  tienda.subdominio_activo
    ? `https://${tienda.slug}.${new URL(SITE_URL).host}/${tienda.slug}/producto/${id}`
    : `${SITE_URL}/${tienda.slug}/producto/${id}`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, id } = await params;
  const datos = await cargar(slug, id);
  if (!datos) return { title: 'Producto no encontrado' };
  const { tienda, producto } = datos;
  const descripcion = (producto.description || `${producto.name} en ${tienda.name}`).slice(0, 200);
  return {
    title: `${producto.name} | ${tienda.name}`,
    description: descripcion,
    alternates: { canonical: urlOficial(tienda, producto.id) },
    openGraph: { title: producto.name, description: descripcion, images: producto.image ? [{ url: producto.image }] : undefined },
    twitter: { card: 'summary_large_image', title: producto.name, description: descripcion, images: producto.image ? [producto.image] : undefined },
  };
}

export default async function ProductoPage({ params }: { params: Promise<Params> }) {
  const { slug, id } = await params;
  const datos = await cargar(slug, id);
  if (!datos) notFound();
  const { tienda, producto, galeria, reserva, reservaActiva } = datos;

  const store = await getDynamicStore(slug);
  if (!store) notFound();

  const precioNormal = Number(producto.price) || 0;
  // Con oferta vigente se declara a Google el precio rebajado.
  const precio = precioOfertaVigente(producto) ?? precioNormal;
  const agotado = producto.status === 'Agotado' || producto.status === 'Sin stock';
  // Con reservas prendidas, un producto «en reserva» se declara como preventa (no como agotado ni en stock).
  const enReserva = reservaActiva && (reserva === true || (reserva !== false && agotado));
  // Todas las fotos del producto, sin repetidas (la principal primero): Google Imágenes puede mostrar varias.
  const fotos = Array.from(new Set([producto.image, ...galeria].filter((u): u is string => typeof u === 'string' && u.length > 0))).slice(0, 8);
  const descripcion = producto.description?.trim() || `${producto.name} en ${tienda.name}, Pucallpa. Precio S/ ${precio.toFixed(2)}${producto.category ? ` · ${producto.category}` : ''}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.name,
    description: descripcion,
    sku: producto.id,
    ...(producto.category ? { category: producto.category } : {}),
    image: fotos.length > 1 ? fotos : fotos[0] || undefined,
    brand: { '@type': 'Brand', name: tienda.name },
    offers: {
      '@type': 'Offer',
      url: urlOficial(tienda, producto.id),
      priceCurrency: 'PEN',
      price: precio.toFixed(2),
      availability: enReserva ? 'https://schema.org/PreOrder' : agotado ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      // Con oferta con fecha, Google sabe hasta cuándo vale el precio.
      ...(producto.oferta_hasta && precioOfertaVigente(producto) != null ? { priceValidUntil: String(producto.oferta_hasta).slice(0, 10) } : {}),
      seller: { '@type': 'Organization', name: tienda.name },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Lo que ve Google en el HTML (la tienda se arma en el navegador): título, fotos con texto alternativo y precio. Solo para lectores y buscadores. */}
      <section className="sr-only" aria-label={producto.name}>
        <h1>{producto.name}</h1>
        {fotos.slice(0, 6).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={i === 0 ? `${producto.name} · ${tienda.name}, Pucallpa` : `${producto.name} · foto ${i + 1}`} loading="lazy" />
        ))}
        <p>{descripcion}</p>
        <p>Precio: S/ {precio.toFixed(2)}</p>
      </section>
      <StoreRenderer store={store} initialProductId={producto.id} />
    </>
  );
}
