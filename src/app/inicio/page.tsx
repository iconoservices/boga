"use client";

import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Inicio = el hub de DESCUBRIMIENTO, con formato editorial tipo Time Out:
// banda negra + reportaje de tapa + barra roja de secciones + bloques.
// Nada de acá es el buscador de productos (eso vive en /market).

const QUICK_LINKS = [
  { label: 'Qué hacer hoy', href: '/eventos' },
  { label: 'Dónde comer', href: '/market' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Sorteos', href: '/sorteos' },
  { label: 'Chamba', href: '/yapu' },
];

const NAV = [
  { label: 'Qué hacer', href: '/eventos' },
  { label: 'Dónde comer', href: '/market' },
  { label: 'Revista', href: '/revista' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Sorteos', href: '/sorteos' },
  { label: 'Taxi Seguro', href: '/taxi-seguro' },
  { label: 'Chamba', href: '/yapu' },
];

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

export default function Inicio() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      <main className="max-w-[1200px] mx-auto w-full flex flex-col gap-8 lg:gap-10 mt-4 pb-14 px-container-margin lg:px-6">

        {/* Banda negra tipo Time Out */}
        <section className="bg-on-surface text-background rounded-2xl px-6 py-7 lg:px-10 lg:py-10">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <h1 className="font-headline-lg font-extrabold tracking-tight text-3xl sm:text-4xl lg:text-5xl leading-[1.03]">
              Descubre lo mejor de Pucallpa
            </h1>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {QUICK_LINKS.map((q) => (
                <Link
                  key={q.label}
                  href={q.href}
                  className="bg-primary text-white font-label-md text-[12px] px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                >
                  {q.label}
                </Link>
              ))}
              <Link
                href="/market"
                className="border border-background/40 text-background font-label-md text-[12px] px-4 py-2 rounded-full hover:border-background transition-colors"
              >
                Ir al Market
              </Link>
            </div>
          </div>
        </section>

        {/* Reportaje de tapa — imagen grande + retrato circular + titular encima */}
        <Link href={FEATURE.href} className="group relative block overflow-hidden rounded-2xl aspect-[16/11] sm:aspect-[16/9] lg:aspect-[21/9] bg-surface-container-low shadow-lg">
          <img src={FEATURE.img} alt={FEATURE.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
          <div className="absolute top-4 left-4 lg:top-1/2 lg:left-10 lg:-translate-y-1/2 w-24 h-24 lg:w-48 lg:h-48 rounded-full overflow-hidden border-4 border-white shadow-xl">
            <img src={FEATURE.portrait} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-8">
            <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-white/70">{FEATURE.kicker}</span>
            <h2 className="font-headline-lg font-extrabold tracking-tight text-white leading-[1.05] text-2xl sm:text-3xl lg:text-4xl mt-1.5 max-w-[22ch]">
              {FEATURE.title}
            </h2>
          </div>
        </Link>

        {/* Barra roja de secciones */}
        <nav className="bg-primary text-white rounded-xl -mt-2">
          <div className="flex overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {NAV.map((n, i) => (
              <Link
                key={n.label}
                href={n.href}
                className={`shrink-0 px-4 py-3 font-headline-sm text-[12px] uppercase tracking-wider whitespace-nowrap hover:bg-white/10 transition-colors ${
                  i > 0 ? 'border-l border-white/20' : ''
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>

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

      </main>
    </>
  );
}
