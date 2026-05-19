'use client';

import { StoreConfig } from '@/lib/stores.config';
import dynamic from 'next/dynamic';

// Lazy load templates so only the needed one is downloaded
const SunsetTemplate = dynamic(() => import('@/templates/sunset/SunsetTemplate'));
const DelvaTemplate = dynamic(() => import('@/templates/delva/DelvaTemplate'));
const NaturaTemplate = dynamic(() => import('@/templates/natura/NaturaTemplate'));
const AmazoniaTemplate = dynamic(() => import('@/templates/amazonia/AmazoniaTemplate'));
const SweetKittyNailsTemplate = dynamic(() => import('@/templates/sweetkittynails/SweetKittyNailsTemplate'));
const EstilosMirkaTemplate = dynamic(() => import('@/templates/estilosmirka/EstilosMirkaTemplate'));

interface Props {
  store: StoreConfig;
}

export default function StoreRenderer({ store }: Props) {
  switch (store.template) {
    case 'sunset':
      return <SunsetTemplate store={store} />;
    case 'delva':
      return <DelvaTemplate store={store} />;
    case 'natura':
      return <NaturaTemplate store={store} />;
    case 'amazonia':
      return <AmazoniaTemplate store={store} />;
    case 'sweetkittynails':
      return <SweetKittyNailsTemplate store={store} />;
    case 'estilosmirka':
      return <EstilosMirkaTemplate store={store} />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Plantilla no encontrada: {store.template}</p>
        </div>
      );
  }
}
