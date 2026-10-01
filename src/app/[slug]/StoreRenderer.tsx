'use client';

import { StoreConfig, BOGA_DEFAULT_ICON } from '@/lib/stores.config';
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import PixelEvent from '@/components/PixelEvent';
import AvisoTiendaMovida from '@/components/AvisoTiendaMovida';
import PedidoEnviadoSheet from '@/components/PedidoEnviadoSheet';
import { CustomerSessionProvider } from '@/context/CustomerSessionContext';
import CustomerSessionModal from '@/components/CustomerSessionModal';
import CustomerAccountButton from '@/components/CustomerAccountButton';

// Lazy load templates so only the needed one is downloaded
const SunsetTemplate = dynamic(() => import('@/templates/sunset/SunsetTemplate'));
const NaturaTemplate = dynamic(() => import('@/templates/natura/NaturaTemplate'));
const AmazoniaTemplate = dynamic(() => import('@/templates/amazonia/AmazoniaTemplate'));
const SweetKittyNailsTemplate = dynamic(() => import('@/templates/sweetkittynails/SweetKittyNailsTemplate'));
const EstilosMirkaTemplate = dynamic(() => import('@/templates/estilosmirka/EstilosMirkaTemplate'));
const MirkaVisualTemplate = dynamic(() => import('@/templates/mirkavisual/MirkaVisualTemplate'));
const AtelierTemplate = dynamic(() => import('@/templates/atelier/AtelierTemplate'));
const LookbookTemplate = dynamic(() => import('@/templates/lookbook/LookbookTemplate'));
const DiscotecaTemplate = dynamic(() => import('@/templates/discoteca/DiscotecaTemplate'));
const CarteleraTemplate = dynamic(() => import('@/templates/cartelera/CarteleraTemplate'));
const PolleriaTemplate = dynamic(() => import('@/templates/polleria/PolleriaTemplate'));
const MercadoTemplate = dynamic(() => import('@/templates/mercado/MercadoTemplate'));
const MenuDirectoTemplate = dynamic(() => import('@/templates/menudirecto/MenuDirectoTemplate'));
const InicioCatalogoTemplate = dynamic(() => import('@/templates/iniciocatalogo/InicioCatalogoTemplate'));
const FloresTemplate = dynamic(() => import('@/templates/flores/FloresTemplate'));
const FichaDigitalTemplate = dynamic(() => import('@/templates/fichadigital/FichaDigitalTemplate'));
const FichaPlanaTemplate = dynamic(() => import('@/templates/fichaplana/FichaPlanaTemplate'));
const VeterinariaTemplate = dynamic(() => import('@/templates/veterinaria/VeterinariaTemplate'));
const TerrenosPortalTemplate = dynamic(() => import('@/templates/terrenos/TerrenosPortalTemplate'));
const TerrenosCampoTemplate = dynamic(() => import('@/templates/terrenos/TerrenosCampoTemplate'));
const RackTemplate = dynamic(() => import('@/templates/rack/RackTemplate'));

interface Props {
  store: StoreConfig;
  // Solo llega desde /<tienda>/producto/<id> (el link que ve Google): abre ese
  // producto ni bien carga el catalogo, en vez de la tienda vacía.
  initialProductId?: string;
}

export default function StoreRenderer({ store: initialStore, initialProductId }: Props) {
  const [store, setStore] = useState<StoreConfig>(initialStore);

  // Sync state if props change (e.g. initial load)
  useEffect(() => {
    setStore(initialStore);
  }, [initialStore]);

  // Asegurar que dentro de una tienda o preview no se muestre el marco/chat de BogaHub
  useEffect(() => {
    document.documentElement.dataset.tienda = '1';
    return () => {
      delete document.documentElement.dataset.tienda;
    };
  }, []);

  // Update favicon dynamically when store changes
  useEffect(() => {
    // La pestaña y los íconos de la página llevan siempre el logo de la tienda. Solo el ícono de "Agregar a inicio" del
    // iPhone (apple-touch-icon) depende de si la tienda tiene app propia (subdominio, dominio o enlace propio): si no, el de Boga.
    const conApp = !!store.appPropia;
    const iconUrl = store.logoImage || store.iconImage || store.heroImage || BOGA_DEFAULT_ICON;

    // Add timestamp to force browser to reload favicon (bypass cache)
    const timestampedIcon = `${iconUrl}${iconUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    
    // Update existing favicon link or create new one
    let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/png';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = timestampedIcon;

    // Update or create apple touch icon
    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    // El ícono de "Agregar a inicio": el de la tienda solo si tiene subdominio propio; si no, el de BogaHub.
    // Chrome/Firefox de iPhone (no instalan apps): su menú Compartir usa este ícono, así que va el logo de la tienda.
    const iosNoSafari = /CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
    appleLink.href = iosNoSafari ? timestampedIcon : conApp ? timestampedIcon : '/apple-touch-icon.png';

    // Update manifest to ensure it has the latest icon
    const manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (manifestLink) {
      const currentHref = manifestLink.href;
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const slug = pathParts[0] === 'preview' ? pathParts[1] : pathParts[0];
      if (slug && !currentHref.includes(`slug=${slug}`)) {
        manifestLink.href = `/manifest.json?slug=${slug}`;
      }
    }
  }, [store.logoImage, store.heroImage, store.appPropia]);

  // Listen to postMessage from parent customizer for live updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'BOGA_STORE_PREVIEW_UPDATE') {
        setStore(event.data.store);
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Notify parent window that preview frame is ready to receive data
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'BOGA_STORE_PREVIEW_READY' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const template = (() => {
  switch (store.template) {
    case 'default':
      return <MenuDirectoTemplate store={store} initialProductId={initialProductId} />;
    case 'sunset':
      return <SunsetTemplate store={store} initialProductId={initialProductId} />;
    case 'natura':
      return <NaturaTemplate store={store} initialProductId={initialProductId} />;
    case 'amazonia':
      return <AmazoniaTemplate store={store} initialProductId={initialProductId} />;
    case 'sweetkittynails':
      return <SweetKittyNailsTemplate store={store} />;
    case 'estilosmirka':
      return <EstilosMirkaTemplate store={store} initialProductId={initialProductId} />;
    case 'mirkavisual':
      return <MirkaVisualTemplate store={store} initialProductId={initialProductId} />;
    case 'atelier':
      return <AtelierTemplate store={store} initialProductId={initialProductId} />;
    case 'lookbook':
      return <LookbookTemplate store={store} initialProductId={initialProductId} />;
    case 'discoteca':
      return <DiscotecaTemplate store={store} initialProductId={initialProductId} />;
    case 'cartelera':
      return <CarteleraTemplate store={store} initialProductId={initialProductId} />;
    case 'polleria':
      return <PolleriaTemplate store={store} initialProductId={initialProductId} />;
    case 'mercado':
    case 'condimentos':
      return <MercadoTemplate store={store} initialProductId={initialProductId} />;
    case 'menudirecto':
      return <MenuDirectoTemplate store={store} initialProductId={initialProductId} />;
    case 'iniciocatalogo':
      return <InicioCatalogoTemplate store={store} initialProductId={initialProductId} />;
    case 'flores':
      return <FloresTemplate store={store} initialProductId={initialProductId} />;
    case 'fichadigital':
      return <FichaDigitalTemplate store={store} initialProductId={initialProductId} />;
    case 'fichaplana':
      return <FichaPlanaTemplate store={store} initialProductId={initialProductId} />;
    case 'veterinaria':
      return <VeterinariaTemplate store={store} initialProductId={initialProductId} />;
    case 'terreno1':
      return <TerrenosPortalTemplate store={store} initialProductId={initialProductId} />;
    case 'terreno2':
      return <TerrenosCampoTemplate store={store} initialProductId={initialProductId} />;
    case 'rack':
      return <RackTemplate store={store} initialProductId={initialProductId} />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Plantilla no encontrada: {store.template}</p>
        </div>
      );
  }
  })();

  return (
    <CustomerSessionProvider>
      <PixelEvent
        event="ViewContent"
        data={{
          content_name: store.name,
          content_category: store.marketplaceCategory || 'Tienda',
          content_type: 'product_group',
          content_ids: [store.slug],
        }}
      />
      <AvisoTiendaMovida nombre={store.name} />
      <PedidoEnviadoSheet />
      <CustomerSessionModal storeSlug={store.slug} storeName={store.name} />
      <CustomerAccountButton />
      {template}
      <a
        href="/negocios?ref=menu"
        target="_blank"
        rel="noopener"
        className="block bg-white py-3 pl-4 pr-24 pb-20 text-center text-xs text-gray-500 border-t border-gray-100"
      >
        Menú digital creado por <strong className="text-gray-800">Boga</strong> · <span className="underline">Pide el tuyo aquí</span>
      </a>
    </CustomerSessionProvider>
  );
}
