// El Mostrador de BogaHub: la vitrina de lo que armamos para un negocio (una página
// de terrenos, la app de una veterinaria, una carta con QR…), como una app store.
// Cada tarjeta lleva a su ficha (/productos/<producto>) con las plantillas que hay
// y su vista previa. Es una ruta APARTE de /negocios (landing B2B de tienda + Market).

import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { PRODUCTOS_MOSTRADOR, plantillasDe, portadaDe } from '@/lib/productos';

export const metadata: Metadata = {
  title: 'Productos para tu negocio',
  description: 'Soluciones y productos de BogaHub para tu negocio: cartas digitales QR, tiendas online, apps y páginas web.',
};

export default function MostradorPage() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      <AppHeader />

      <main className="max-w-[1200px] mx-auto px-container-margin pt-5 md:pt-8 pb-16 md:pb-24">
        <section className="text-center max-w-[620px] mx-auto mb-8 md:mb-10">
          <span className="font-label-md text-label-md text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">Soluciones</span>
          <h1 className="font-headline-lg text-on-background text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mt-4">
            Productos de <span className="text-primary">BogaHub</span>
          </h1>
          <p className="text-secondary font-body-lg text-base md:text-lg mt-3">
            Elige lo que tu negocio necesita, mira cómo funciona y nosotros lo armamos.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTOS_MOSTRADOR.map((p) => {
            const portada = portadaDe(p);
            const n = plantillasDe(p).length;
            return (
              <Link
                key={p.slug}
                href={`/productos/${p.slug}`}
                className="group bg-surface-container-lowest border border-surface-container-highest rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
              >
                <div className="relative aspect-[16/9] bg-primary/10 overflow-hidden">
                  {portada ? (
                    <img src={portada} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[56px] opacity-60">{p.icon}</span>
                    </div>
                  )}
                  <span className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${p.estado === 'listo' ? 'text-emerald-800 bg-emerald-100' : 'text-secondary bg-white/90'}`}>
                    {p.estado === 'listo' ? 'Disponible' : 'Próximamente'}
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-1.5 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{p.para}</p>
                  <h2 className="font-headline-sm text-headline-sm text-on-background">{p.titulo}</h2>
                  <p className="text-secondary font-body-md text-sm leading-relaxed">{p.gancho}</p>
                  <p className="mt-auto pt-3 text-primary font-label-md text-label-md inline-flex items-center gap-1">
                    {n > 0 ? `Ver ${n} plantilla${n === 1 ? '' : 's'}` : 'Ver más'}
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
