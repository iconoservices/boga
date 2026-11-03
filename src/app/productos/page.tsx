// El Mostrador de BogaHub: la vitrina de lo que armamos para un negocio (una página
// de terrenos, la app de una veterinaria, una carta con QR…), como una app store.
// Cada tarjeta lleva a su ficha (/productos/<producto>) con las plantillas que hay
// y su vista previa. Es una ruta APARTE de /negocios (landing B2B de tienda + Market).

import type { Metadata } from 'next';
import React from 'react';
import AppHeader from '@/components/AppHeader';
import ProductosCarrusel from '@/components/ProductosCarrusel';
import { PRODUCTOS_MOSTRADOR } from '@/lib/productos';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Productos para tu negocio',
  description: 'Soluciones y productos de BogaHub para tu negocio: cartas digitales QR, tiendas online, apps y páginas web.',
};

// El Mostrador cambia con poca frecuencia (los productos son contenidos fijos de BogaHub, no del mercado).
// 1 hora es suficiente; el superadmin puede forzar el refresco con el botón «Refrescar todo» si necesita.
export const revalidate = 3600;

export default async function MostradorPage() {
  let customBanners: Record<string, string> = {};
  try {
    const { data } = await supabase.from('site_settings').select('valor').eq('clave', 'productos_banners').maybeSingle();
    if (data?.valor) {
      customBanners = typeof data.valor === 'string' ? JSON.parse(data.valor) : (data.valor as Record<string, string>);
    }
  } catch {}

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      <AppHeader />

      <main className="max-w-[1440px] mx-auto px-container-margin pt-4 md:pt-6 pb-14 md:pb-20">
        <section className="text-center max-w-[620px] mx-auto mb-5 md:mb-6">
          <span className="font-label-md text-label-md text-primary bg-primary/10 border border-primary/20 px-3 py-0.5 rounded-full text-xs">Soluciones</span>
          <h1 className="font-headline-lg text-on-background text-2xl md:text-4xl font-extrabold tracking-tight leading-[1.1] mt-2">
            Productos de <span className="text-primary">BogaHub</span>
          </h1>
          <p className="text-secondary font-body-md text-sm md:text-base mt-2">
            Elige lo que tu negocio necesita, mira cómo funciona y nosotros lo armamos.
          </p>
        </section>

        <ProductosCarrusel productos={PRODUCTOS_MOSTRADOR} customBanners={customBanners} />
      </main>
    </div>
  );
}
