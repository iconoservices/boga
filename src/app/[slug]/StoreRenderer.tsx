'use client';

import { StoreConfig } from '@/lib/stores.config';
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';

// Lazy load templates so only the needed one is downloaded
const SunsetTemplate = dynamic(() => import('@/templates/sunset/SunsetTemplate'));
const NaturaTemplate = dynamic(() => import('@/templates/natura/NaturaTemplate'));
const AmazoniaTemplate = dynamic(() => import('@/templates/amazonia/AmazoniaTemplate'));
const SweetKittyNailsTemplate = dynamic(() => import('@/templates/sweetkittynails/SweetKittyNailsTemplate'));
const EstilosMirkaTemplate = dynamic(() => import('@/templates/estilosmirka/EstilosMirkaTemplate'));
const PolleriaTemplate = dynamic(() => import('@/templates/polleria/PolleriaTemplate'));

interface Props {
  store: StoreConfig;
}

export default function StoreRenderer({ store: initialStore }: Props) {
  const [store, setStore] = useState<StoreConfig>(initialStore);

  // Sync state if props change (e.g. initial load)
  useEffect(() => {
    setStore(initialStore);
  }, [initialStore]);

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

  switch (store.template) {
    case 'sunset':
      return <SunsetTemplate store={store} />;
    case 'natura':
      return <NaturaTemplate store={store} />;
    case 'amazonia':
      return <AmazoniaTemplate store={store} />;
    case 'sweetkittynails':
      return <SweetKittyNailsTemplate store={store} />;
    case 'estilosmirka':
      return <EstilosMirkaTemplate store={store} />;
    case 'polleria':
      return <PolleriaTemplate store={store} />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Plantilla no encontrada: {store.template}</p>
        </div>
      );
  }
}
