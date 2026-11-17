import { getTemplate } from '@/lib/templates.config';
import { BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import StoreRenderer from './StoreRenderer';
import GeoTienda from '@/components/GeoTienda';
import { headers } from 'next/headers';
import { DEFAULT_THEME, getDynamicStore } from './cargarTienda';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Omit<Props, 'searchParams'>) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) return { title: 'Tienda no encontrada' };
  
  // Icono para la pestaña del navegador:
  // Si la tienda subió su logo, se usa su imagen.
  // Mientras no tenga imagen subida, se usan las letras/inicial de la tienda con fondo oficial.
  const nombreLimpio = store.name.replace(/\s*bm$/i, '').trim();
  const inicial = (nombreLimpio.charAt(0) || 'T').toUpperCase();
  const colorFondo = (store.theme as any)?.primaryColor || '#059669';

  const svgFavicon = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${colorFondo}"/><text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${inicial}</text></svg>`
  )}`;

  const iconUrl = store.logoImage || store.iconImage || svgFavicon;
  const uaIOSNoSafari = /CriOS|FxiOS|EdgiOS/i.test((await headers()).get('user-agent') || '');
  const iconoApple = store.logoImage || store.iconImage || (uaIOSNoSafari ? iconUrl : (store.appPropia ? iconUrl : '/apple-touch-icon.png'));
  
  return {
    // Chrome/Firefox de iPhone muestran el título de la página en su menú Compartir: solo el nombre (como Safari, que lee og:title).
    // Para todo lo demás (Google, otros navegadores) el título sigue siendo "<tienda> en Pucallpa · BogaHub".
    title: uaIOSNoSafari ? { absolute: store.name } : `${store.name} en Pucallpa`,
    description: store.tagline || `${store.name} en Pucallpa${store.marketplaceCategory && store.marketplaceCategory !== 'General' ? `: ${store.marketplaceCategory}` : ''}. Carta, precios y pedidos por WhatsApp en BogaHub.`,
    manifest: `/manifest.json?slug=${slug}`,
    // La dirección OFICIAL de la tienda es la del sitio principal (bogahub.app/<tienda>),
    // aunque se abra desde la dirección de tiendas (tiendas.bogahub.app): así Google no las
    // cuenta como páginas repetidas. Al ser relativa, se resuelve contra metadataBase.
    // Excepción: una tienda con subdominio propio ACTIVO (plan de pago) es oficial en su
    // dirección <tienda>.bogahub.app, que es la que Google debe mostrar. Si se apaga, vuelve a la ruta.
    alternates: {
      canonical: store.subdominioActivo
        ? `https://${slug}.${new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').host}`
        : `/${slug}`,
    },
    openGraph: {
      title: store.name,
      description: store.tagline,
      images: [{ url: store.heroImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: store.name,
      description: store.tagline,
      images: [store.heroImage],
    },
    // Íconos de la página: el logo de la tienda (pestaña, favicon), como siempre. Lo único que cambia según la tienda tenga
    // o no app propia es lo que se INSTALA: el manifiesto (app/manifest.json/route.ts) y el ícono de "Agregar a inicio"
    // del iPhone (apple-touch-icon): sin subdominio ni dominio propio se instala BogaHub, con el ícono de Boga.
    icons: {
      icon: [
        { url: iconUrl, type: store.logoImage || store.iconImage ? 'image/png' : 'image/svg+xml' },
        ...(store.logoImage || store.iconImage ? [
          { url: iconUrl, sizes: '192x192', type: 'image/png' },
          { url: iconUrl, sizes: '512x512', type: 'image/png' },
        ] : []),
      ],
      apple: [{ url: iconoApple, sizes: '180x180' }],
    },
    // Nombre en el inicio del iPhone: con subdominio propio es SU app, con su nombre (si no, queda "BogaHub", el del layout).
    ...(store.appPropia
      ? { applicationName: store.name, appleWebApp: { capable: true, statusBarStyle: 'default' as const, title: store.name.slice(0, 20) } }
      : {}),
  };
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  let store = await getDynamicStore(slug, preview === 'true');
  
  if (!store) {
    if (preview === 'true') {
      const defaultTmpl = getTemplate('default');
      store = {
        slug: slug,
        name: 'Nueva Tienda',
        tagline: 'Lema de la Tienda',
        marketplaceCategory: defaultTmpl?.category || 'General',
        template: 'default',
        heroImage: defaultTmpl?.heroImage || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
        heroImages: undefined,
        reservaActiva: false,
        heroAlt: defaultTmpl?.heroAlt || 'nueva tienda',
        iconImage: defaultTmpl?.iconImage || undefined,
        theme: defaultTmpl?.theme || DEFAULT_THEME,
        categories: defaultTmpl?.categories || [],
        logoImage: undefined,
        whatsapp: undefined,
        modulos: undefined,
        igvIncluido: false,
        showDemoProducts: undefined,
        zona: undefined,
        direccion: undefined,
        horario: undefined,
        rating: undefined,
        metodosPago: undefined,
        monedas: [],
        entrega: 'ambos',
        facebook: undefined,
        instagram: undefined,
        tiktok: undefined,
        subdominioActivo: undefined,
        appPropia: false,
        pushActivo: undefined,
        latitud: undefined,
        longitud: undefined,
        mostrarUbicacion: false,
        hideHeroText: false,
        perfilEmpresa: undefined,
        plan: undefined,
        esRevendedor: undefined,
        tiendaProveedora: undefined,
        modoPedidosReventa: undefined,
      };
    } else {
      notFound();
    }
  }
  
  // Si la tienda está desactivada / en pausa / en gris
  if (store.status === 'inactive' || store.status === 'pending') {
    // Si el dueño o admin entra en modo vista previa (?preview=true), la ve con aviso
    if (preview === 'true') {
      return (
        <>
          <div className="bg-amber-400 text-slate-950 px-4 py-2.5 text-center text-xs font-black sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>MODO VISTA PREVIA: Esta tienda está desactivada (en gris). Tus clientes no pueden ver tus productos hasta que la pongas en verde.</span>
          </div>
          <StoreRenderer store={store!} />
        </>
      );
    }

    // Para el público general: pantalla limpia de tienda en pausa
    const cleanWsp = store.whatsapp?.replace(/\D/g, '') || '';
    const numWsp = cleanWsp.length === 9 ? `51${cleanWsp}` : cleanWsp;

    return (
      <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-12 max-w-md w-full flex flex-col items-center animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl">storefront</span>
          </div>

          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
            Tienda en Pausa / Borrador
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {store.name}
          </h1>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Esta tienda virtual se encuentra temporalmente en modo borrador o en pausa. En este momento no está recibiendo pedidos directos.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 w-full">
            {store.whatsapp && (
              <a
                href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                  `¡Hola! Estuve visitando tu tienda "${store.name}". ¿Tienes productos disponibles para entrega?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>Consultar por WhatsApp</span>
              </a>
            )}

            <Link
              href="/market"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span>Explorar Tiendas en Boga Market</span>
            </Link>

            <Link
              href="/network/panel"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Soy el dueño (Ir a mi Panel Network)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Datos de negocio local y carta en el HTML (para buscadores e IAs que no ejecutan JavaScript). No en la vista previa.
  return (
    <>
      <StoreRenderer store={store!} />
      {preview !== 'true' && <GeoTienda store={store!} />}
    </>
  );
}
