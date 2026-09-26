import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { getTemplate } from '@/lib/templates.config';
import { conMarcaBlanca } from '@/lib/modulos';
import PedirProducto from './PedirProducto';

// Página propia de un producto: /<tienda>/producto/<id>.
// También abre con el `slug` de texto del producto (p. ej. /delva/producto/reloj-poedagar-613---marrn): así
// funcionan los enlaces viejos que salían del feed de Delva y Google no encuentra un 404. El canonical
// siempre apunta a la dirección con el id.
//
// Existe para que Google (feed de Merchant Center) y las redes tengan un link directo a cada producto.
// Es una página simple, con los colores de la tienda; la carta completa sigue siendo /<tienda>.

export const revalidate = 300;

type Params = { slug: string; id: string };

// products.id es texto: casi todos son UUID, pero los de Delva son números.
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');

const cargar = cache(async (slug: string, id: string) => {
  if (!ID_VALIDO.test(id)) return null;
  const columnas = 'id,name,description,price,image,category,status,store';
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
  return { tienda, producto };
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
  const { tienda, producto } = datos;

  const tema = (tienda.theme && Object.keys(tienda.theme).length > 0 ? tienda.theme : getTemplate(tienda.template as string)?.theme) as
    | { primary?: string; background?: string; onBackground?: string } | undefined;
  const color = tema?.primary || '#b8130e';
  const precio = Number(producto.price) || 0;
  const agotado = producto.status === 'Agotado' || producto.status === 'Sin stock';
  const logo = tienda.logo_image || tienda.hero_image;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.name,
    description: producto.description || producto.name,
    sku: producto.id,
    image: producto.image || undefined,
    brand: { '@type': 'Brand', name: tienda.name },
    offers: {
      '@type': 'Offer',
      url: urlOficial(tienda, producto.id),
      priceCurrency: 'PEN',
      price: precio.toFixed(2),
      availability: agotado ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: tienda.name },
    },
  };

  return (
    <main className="min-h-screen" style={{ background: tema?.background || '#f9f9ff', color: tema?.onBackground || '#191b23' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <header className="bg-white border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-9 h-9 rounded-lg object-cover" />
          )}
          <Link href={`/${tienda.slug}`} className="font-extrabold text-base truncate">{tienda.name}</Link>
          <Link href={`/${tienda.slug}`} className="ml-auto text-sm font-bold whitespace-nowrap" style={{ color }}>Ver la carta →</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-black/5 aspect-square relative">
          {producto.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producto.image} alt={producto.name} className={`w-full h-full object-cover ${agotado ? 'opacity-60' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-black/20 text-6xl">🛍️</div>
          )}
          {agotado && (
            <span className="absolute top-3 left-3 bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full">Agotado</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {producto.category && <span className="text-xs font-bold uppercase tracking-wider opacity-60">{producto.category}</span>}
          <h1 className="text-2xl font-extrabold leading-tight">{producto.name}</h1>
          <p className="text-3xl font-black" style={{ color }}>S/ {precio.toFixed(2)}</p>
          {producto.description && <p className="text-base leading-relaxed opacity-80 whitespace-pre-line">{producto.description}</p>}
        </div>

        {agotado ? (
          <p className="text-center text-sm font-bold py-3 rounded-xl bg-black/5">Este producto está agotado por ahora.</p>
        ) : (
          <PedirProducto
            slug={tienda.slug}
            nombreTienda={tienda.name}
            whatsapp={tienda.whatsapp}
            productoId={producto.id}
            nombre={producto.name}
            precio={precio}
            color={color}
          />
        )}

        {/* Envíos y cambios: visible en la página del producto (Google Merchant Center lo pide y el cliente lo agradece). */}
        <section className="rounded-2xl bg-white border border-black/5 p-4 text-sm leading-relaxed">
          <h2 className="font-extrabold text-sm mb-1.5">Envíos, pagos y cambios</h2>
          <ul className="flex flex-col gap-1 opacity-80 list-disc pl-4">
            <li>Haces el pedido por WhatsApp y coordinas el pago y la entrega directamente con {tienda.name}.</li>
            <li>Los cambios y devoluciones también se coordinan directo con la tienda: cada tienda define su política, consúltala antes de comprar.</li>
            <li>BogaHub solo te conecta con la tienda: no cobra ni entrega el pedido.</li>
          </ul>
        </section>

        <Link href={`/${tienda.slug}`} className="text-center text-sm font-bold underline underline-offset-4 opacity-70">
          Ver todos los productos de {tienda.name}
        </Link>

        {!conMarcaBlanca(tienda.modulos) && (
          <p className="text-center text-xs opacity-50 pt-2">Powered by Boga Market</p>
        )}
      </div>
    </main>
  );
}
