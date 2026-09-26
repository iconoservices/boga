"use client";

import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { QUE_VISITAR, TEMAS } from '@/lib/guia';

// Cada tarjeta de "Qué visitar" abre su artículo en la Revista por su URL
// canónica (/revista/<slug>). Los slugs son los de las notas semilla de
// sección "Rutas" (src/lib/revista.ts).

// Guía de Pucallpa — la página "recién llegas, esto es lo que necesitas
// saber". Los accesos rápidos mandan a su portal; abajo, lo práctico que no
// vive en ningún portal (clima, plata, emergencias, cómo llegar, costumbres).
// Contenido de referencia / muestra hasta que haya una fuente oficial.

const ACCESOS = [
  { href: '/inmuebles',   icon: 'real_estate_agent', titulo: 'Dónde quedarte', sub: 'Cuartos, casas, terrenos y más' },
  { href: '/transporte', icon: 'local_taxi',   titulo: 'Cómo moverte',   sub: 'Taxi Seguro con chofer verificado' },
  { href: '/eventos',     icon: 'map',          titulo: 'Qué hacer',      sub: 'Tours, ferias y agenda' },
  { href: '/explore',      icon: 'ramen_dining', titulo: 'Dónde comer',    sub: 'Huariques y menús del día' },
  { href: '/trabajos',   icon: 'construction', titulo: 'Buscar trabajo',  sub: 'Técnicos y bolsa de empleo' },
  { href: '/explore',      icon: 'storefront',   titulo: 'Qué comprar',    sub: 'Mercado fresco y artesanía' },
];

export default function GuiaPage() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      {/* Banda de portada */}
      <div className="bg-on-surface text-background">
        <div className="max-w-[1000px] mx-auto px-container-margin lg:px-6 py-6 lg:py-9">
          <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-background/50">Guía de Pucallpa</span>
          <h1 className="font-headline-lg font-extrabold tracking-tight text-2xl lg:text-4xl mt-1 leading-tight">
            Todo lo que necesitas saber si recién llegas
          </h1>
          <p className="font-body-md text-background/60 text-sm mt-2 max-w-[54ch]">
            Dónde dormir, cómo moverte, qué comer — y lo práctico que nadie te cuenta: clima, plata, emergencias y costumbres.
          </p>
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-container-margin lg:px-6 w-full py-8 lg:py-10 flex flex-col gap-10 lg:gap-12">

        {/* Accesos rápidos */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl">Empieza por acá</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACCESOS.map((a) => (
              <Link
                href={a.href}
                key={a.titulo}
                className="group bg-white border border-surface-container-highest p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex flex-col gap-2"
              >
                <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                </span>
                <h3 className="font-headline-sm text-sm text-on-surface leading-tight">{a.titulo}</h3>
                <p className="font-body-md text-secondary text-[11px] leading-snug">{a.sub}</p>
                <span className="mt-auto pt-1 text-primary font-label-md text-[11px] flex items-center gap-0.5">
                  Ver <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Qué visitar */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl">Qué visitar</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-container-margin px-container-margin lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4" style={{ scrollbarWidth: 'none' }}>
            {QUE_VISITAR.map((l) => (
              <Link
                key={l.slug}
                href={`/revista/${l.slug}`}
                className="group shrink-0 w-[220px] lg:w-auto bg-white border border-surface-container-highest shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden flex flex-col"
              >
                <img src={l.img} alt={l.titulo} className="w-full h-32 object-cover" loading="lazy" />
                <div className="p-3 flex flex-col gap-1">
                  <h3 className="font-headline-sm text-sm text-on-surface leading-tight">{l.titulo}</h3>
                  <p className="font-body-md text-secondary text-[11px] leading-snug">{l.desc}</p>
                  <span className="mt-1 text-primary font-label-md text-[11px] flex items-center gap-0.5">
                    Leer más <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Lo práctico */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl">Lo práctico</h2>
          <div className="flex flex-col gap-3">
            {TEMAS.map((t) => (
              <div key={t.id} className="bg-white border border-surface-container-highest p-4 lg:p-5 shadow-sm flex gap-4">
                <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-headline-sm text-base text-on-surface leading-tight">{t.titulo}</h3>
                  <div className="flex flex-col gap-2 mt-2">
                    {t.parrafos.map((p, i) => (
                      <p key={i} className="font-body-md text-secondary text-[13px] leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="font-body-md text-secondary/70 text-[11px]">
            Información de referencia para orientarte. Los números de emergencia son nacionales; horarios y precios pueden variar.
          </p>
        </section>

      </main>
    </>
  );
}
