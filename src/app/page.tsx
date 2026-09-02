"use client";

import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// "/" = el Inicio del lado consumidor (el hub de descubrimiento, formato
// editorial tipo Time Out). La nav entre hubs vive en el AppHeader / riel
// lateral. El buscador de productos es /market; el landing B2B es /negocios.

const FEATURE = {
  kicker: 'Revista · Gastronomía',
  title: 'Los 3 huariques secretos para el mejor tacacho de Pucallpa',
  href: '/revista',
  img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80',
  portrait: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&q=80',
};

// Itinerarios y experiencias — "¿Qué hacer en Pucallpa hoy?"
const EXPERIENCES = [
  { id: 'yarina',   title: 'Laguna de Yarinacocha',          tag: 'Medio día',    from: 'S/ 25', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'shipibo',  title: 'Comunidad Shipiba San Francisco', tag: '3–4 h',        from: 'S/ 40', img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
  { id: 'boqueron', title: 'Boquerón del Padre Abad',         tag: 'Día completo', from: 'S/ 90', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'jardin',   title: 'Jardín Botánico y Serpentario',   tag: '2 h',          from: 'S/ 15', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80' },
  { id: 'malecon',  title: 'Atardecer en el Malecón',         tag: 'Gratis',       from: 'S/ 0',  img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
];

// Comida — lista VIP de restaurantes (posición pagada por el local)
const VIP_RESTAURANTS = [
  { id: 1, name: 'La Anaconda Parrillas',       cuisine: 'Parrilla amazónica',    rating: '4.9', reviews: '320+', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80' },
  { id: 2, name: 'Doña Fela · Comida Criolla',  cuisine: 'Criollo y menú del día', rating: '4.8', reviews: '540+', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80' },
  { id: 3, name: 'El Fogón · Juanes & Tacacho', cuisine: 'Regional selvática',     rating: '4.7', reviews: '210+', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80' },
];

// Tus tiendas / arbitraje — "Compra seguro"
const SAFE_DEALS = [
  { id: 'laptops', title: 'Laptops garantizadas', sub: 'Revisadas y con boleta',  icon: 'laptop_mac', img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80' },
  { id: 'relojes', title: 'Relojes verificados',  sub: 'Autenticidad comprobada', icon: 'watch',      img: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80' },
];

// Notas / contenido editorial — "Yo Soy de la Selva"
const SELVA_NOTES = [
  { id: 'tacacho',   cat: 'Huariques',    title: 'Los 3 huariques secretos para el mejor tacacho de Pucallpa', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80' },
  { id: 'yarina',    cat: 'Curiosidades', title: '¿Sabías por qué la laguna de Yarinacocha se llama así?',      img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'domingo',   cat: 'Turismo',      title: 'Qué hacer un domingo en Pucallpa con menos de S/ 50',         img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
  { id: 'contamana', cat: 'Itinerarios',  title: 'Ruta de fin de semana: de Pucallpa a Contamana',              img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'mitos',     cat: 'Curiosidades', title: 'Mitos de la selva que probablemente no sabías',               img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl border-t-2 border-on-surface pt-3">
      {children}
    </h2>
  );
}

export default function HomePage() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      {/* Banda negra compacta — solo marca, sin nav (el menú vive en el header) */}
      <div className="bg-on-surface text-background">
        <div className="max-w-[1280px] mx-auto px-container-margin lg:px-8 py-3 lg:py-3.5 flex flex-wrap items-center gap-x-6 gap-y-1">
          <h1 className="font-headline-lg font-extrabold tracking-tight text-lg lg:text-xl">
            Descubre <span className="text-primary-fixed">Pucallpa</span>
          </h1>
          <p className="font-body-md text-background/60 text-xs">Comercio, movilidad, trabajo, alquileres y estilo de vida — en un solo lugar.</p>
        </div>
      </div>

      {/* Reportaje de tapa (mitad) + notas secundarias */}
      <div className="max-w-[1280px] mx-auto w-full px-container-margin lg:px-8 pt-6 grid lg:grid-cols-2 gap-5">
        <Link href={FEATURE.href} className="group relative block overflow-hidden rounded-2xl aspect-[16/11] lg:aspect-[4/3] bg-surface-container-low shadow-lg">
          <img src={FEATURE.img} alt={FEATURE.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
          <div className="absolute top-3 left-3 w-20 h-20 lg:w-28 lg:h-28 rounded-full overflow-hidden border-4 border-white shadow-xl">
            <img src={FEATURE.portrait} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
            <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-white/70">{FEATURE.kicker}</span>
            <h2 className="font-headline-lg font-extrabold tracking-tight text-white leading-[1.06] text-xl sm:text-2xl lg:text-3xl mt-1.5 max-w-[22ch]">
              {FEATURE.title}
            </h2>
          </div>
        </Link>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          {SELVA_NOTES.slice(0, 2).map((n) => (
            <Link href="/revista" key={n.id} className="group relative overflow-hidden rounded-2xl aspect-[16/10] lg:aspect-[16/7] bg-surface-container-low">
              <img src={n.img} alt={n.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <span className="font-label-md text-[9px] uppercase tracking-wider text-white/60">{n.cat}</span>
                <h3 className="font-headline-sm text-white text-[13px] leading-tight line-clamp-2 mt-0.5">{n.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto w-full flex flex-col gap-9 lg:gap-12 py-9 lg:py-12 px-container-margin lg:px-8">

        {/* Qué hacer en Pucallpa */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Qué hacer en Pucallpa hoy</SectionTitle>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {EXPERIENCES.map((e) => (
              <div key={e.id} className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low">
                  <img src={e.img} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-on-surface text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>{e.tag}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2">{e.title}</h4>
                  <span className="text-secondary font-label-md text-[11px] mt-auto">Desde <span className="font-price-lg text-primary text-sm">{e.from}</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lista VIP de restaurantes */}
        <section className="flex flex-col gap-4">
          <div className="border-t-2 border-on-surface pt-3">
            <span className="w-fit bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider mb-1.5">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>Lista VIP · Patrocinado
            </span>
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl">Los 3 mejores restaurantes</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {VIP_RESTAURANTS.map((r, i) => (
              <div key={r.id} className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-[0_15px_15px_rgba(0,0,0,0.04)]">
                <img src={r.img} alt={r.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-white text-[12px] font-black flex items-center justify-center shadow">{i + 1}</span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h4 className="font-headline-sm text-white text-sm leading-tight">{r.name}</h4>
                  <div className="flex items-center gap-1 mt-1 text-white/80">
                    <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[11px] font-label-md">{r.rating} · {r.cuisine}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compra seguro */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Compra seguro en Boga</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {SAFE_DEALS.map((d) => (
              <div key={d.id} className="relative rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] group min-h-[128px] lg:min-h-[180px] flex">
                <img src={d.img} alt={d.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 mt-auto p-3 flex flex-col gap-0.5">
                  <span className="material-symbols-outlined text-white text-[20px]">{d.icon}</span>
                  <h4 className="font-headline-sm text-sm text-white leading-tight">{d.title}</h4>
                  <span className="text-white/80 font-label-md text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span>{d.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Yo Soy de la Selva */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between border-t-2 border-on-surface pt-3">
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl">Yo Soy de la Selva</h2>
            <Link href="/revista" className="font-label-md text-[12px] text-primary shrink-0">Ver revista</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {SELVA_NOTES.map((n) => (
              <Link href="/revista" key={n.id} className="min-w-[260px] w-[260px] lg:min-w-[300px] lg:w-[300px] snap-start group flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-container-low">
                  <img src={n.img} alt={n.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute top-2 left-2 bg-white text-on-surface text-[9px] font-label-md px-2 py-0.5 uppercase tracking-wider">{n.cat}</span>
                  <h3 className="absolute inset-x-0 bottom-0 p-3 font-headline-sm text-white text-sm leading-tight line-clamp-2">{n.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Qué es Boga */}
        <section className="bg-on-surface text-background rounded-2xl p-6 lg:p-10">
          <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-background/50">Qué es Boga</span>
          <p className="font-headline-lg font-extrabold tracking-tight text-lg lg:text-2xl leading-snug mt-2 max-w-[46ch]">
            Boga es el sistema operativo digital de Pucallpa: una super-app que reúne el comercio,
            la movilidad segura, el trabajo, el alquiler de viviendas y el estilo de vida de la ciudad
            en un solo lugar.
          </p>
          <Link href="/negocios" className="inline-flex items-center gap-1 mt-4 font-label-md text-[12px] text-primary-fixed">
            ¿Tienes un negocio? Vende con Boga
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </section>

      </main>
    </>
  );
}
