import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import StoreRenderer from '../StoreRenderer';
import { getDynamicStore } from '../cargarTienda';
import { seccionDe } from '@/lib/rutasTienda';

// Una pestaña de la tienda con dirección propia: /<tienda>/servicios, /<tienda>/obras, /<tienda>/contacto…
// Abre la MISMA tienda (misma plantilla que /<tienda>) ya posicionada en esa pestaña. Qué pestañas existen por plantilla, y su
// título para Google, está en lib/rutasTienda.ts: cualquier otro segmento es 404 (así /<tienda>/cualquiercosa no se indexa).

export const dynamic = 'force-dynamic';

type Params = { slug: string; seccion: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, seccion } = await params;
  const store = await getDynamicStore(slug);
  const def = store ? seccionDe(store.template, seccion) : null;
  if (!store || !def) return { title: 'Página no encontrada' };

  const descripcion = store.tagline
    ? `${def.titulo} de ${store.name}: ${store.tagline}`
    : `${def.titulo} de ${store.name} en Pucallpa.`;
  return {
    title: `${def.titulo} · ${store.name} en Pucallpa`,
    description: descripcion,
    // Igual que la tienda: con subdominio propio activo, la dirección oficial es la del subdominio.
    alternates: {
      canonical: store.subdominioActivo
        ? `https://${slug}.${new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').host}/${slug}/${seccion}`
        : `/${slug}/${seccion}`,
    },
    ...(def.indexar === false ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${def.titulo} · ${store.name}`, description: descripcion, images: [{ url: store.heroImage }] },
    twitter: { card: 'summary_large_image', title: `${def.titulo} · ${store.name}`, description: descripcion, images: [store.heroImage] },
  };
}

export default async function SeccionTiendaPage({ params }: { params: Promise<Params> }) {
  const { slug, seccion } = await params;
  const store = await getDynamicStore(slug);
  if (!store || !seccionDe(store.template, seccion)) notFound();
  return <StoreRenderer store={store} initialTab={seccion} />;
}
