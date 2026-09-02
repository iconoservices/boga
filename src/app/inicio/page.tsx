"use client";

import React from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Inicio = el hub de DESCUBRIMIENTO. Nada de acá es el buscador de productos
// (eso vive en /market): son itinerarios, la lista VIP patrocinada, las tiendas
// verificadas de arbitraje y las notas editoriales "Yo Soy de la Selva".
// Contenido curado a mano hasta que haya panel/tablas propias.

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

export default function Inicio() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 lg:gap-8 mt-4 lg:mt-5 pb-12 px-container-margin lg:px-6">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl aspect-[21/9] lg:aspect-[21/6] shadow-lg">
          <img
            src="https://images.unsplash.com/photo-1518182170546-07661fd94144?w=1200&q=80"
            alt="Pucallpa"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-6 lg:px-14">
            <span className="text-white/80 font-label-md text-[10px] uppercase tracking-widest mb-1">Boga · Pucallpa</span>
            <h1 className="font-headline-lg lg:text-[36px] lg:leading-none text-white font-extrabold">Tu ciudad,<br />en una sola app</h1>
            <p className="text-white/80 font-body-md text-xs lg:text-sm mt-2 max-w-sm">Qué hacer, dónde comer, a quién llamar. Y si quieres comprar, entra a Market.</p>
          </div>
        </section>

        {/* Tablero local de chamba y servicios — Yapu */}
        <Link
          href="/yapu"
          className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface p-4 flex items-center gap-3 group"
        >
          <div className="absolute -right-8 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-inverse-primary text-[22px]">handshake</span>
          </div>
          <div className="relative flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-sm leading-tight">¿Buscas chamba o necesitas a alguien?</span>
            <span className="text-inverse-on-surface/70 font-body-md text-xs mt-0.5">Entra al tablero local · Yapu</span>
          </div>
          <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
        </Link>

        {/* Itinerarios y Experiencias */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end mb-1">
            <div>
              <h3 className="font-headline-lg text-on-surface">¿Qué hacer en Pucallpa hoy? 🌴</h3>
              <p className="text-secondary font-body-md text-xs mt-0.5">Paseos y experiencias para armar tu día</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {EXPERIENCES.map((e) => (
              <div
                key={e.id}
                className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start group flex flex-col"
              >
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

        {/* Lista VIP de restaurantes (posición patrocinada) */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 mb-1">
            <span className="w-fit bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>Lista VIP
            </span>
            <h3 className="font-headline-lg text-on-surface">Los 3 mejores restaurantes 🍽️</h3>
          </div>
          <div className="flex flex-col gap-3">
            {VIP_RESTAURANTS.map((r, i) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex items-center gap-3 p-2.5 group"
              >
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-surface-container-low">
                  <img src={r.img} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center shadow-sm">{i + 1}</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{r.name}</h4>
                  <span className="text-secondary font-label-md text-[11px] line-clamp-1">{r.cuisine}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[11px] font-label-md text-secondary">{r.rating} <span className="opacity-60">({r.reviews})</span></span>
                  </div>
                </div>
                <span className="text-[9px] font-label-md text-secondary/70 uppercase tracking-wider shrink-0 self-start mt-1 mr-1">Patrocinado</span>
              </div>
            ))}
          </div>
        </section>

        {/* Compra seguro — tiendas verificadas de Boga */}
        <section className="flex flex-col gap-4">
          <div className="mb-1">
            <h3 className="font-headline-lg text-on-surface">Compra seguro en Boga 🛡️</h3>
            <p className="text-secondary font-body-md text-xs mt-0.5">Laptops y relojes verificados, con garantía y boleta</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SAFE_DEALS.map((d) => (
              <div
                key={d.id}
                className="relative rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest group min-h-[128px] flex"
              >
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

        {/* Yo Soy de la Selva — notas y curiosidades */}
        <section className="flex flex-col gap-4">
          <div className="mb-1">
            <h3 className="font-headline-lg text-on-surface">Yo Soy de la Selva 🌿</h3>
            <p className="text-secondary font-body-md text-xs mt-0.5">Huariques, curiosidades y rutas locales</p>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {SELVA_NOTES.map((n) => (
              <div
                key={n.id}
                className="min-w-[260px] w-[260px] lg:min-w-[300px] lg:w-[300px] bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start group flex flex-col"
              >
                <div className="relative h-36 overflow-hidden bg-surface-container-low">
                  <img src={n.img} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-on-surface text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{n.cat}</span>
                </div>
                <div className="p-3">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2">{n.title}</h4>
                  <span className="text-primary font-label-md text-[11px] mt-1.5 flex items-center gap-1">Leer nota<span className="material-symbols-outlined text-[13px]">arrow_forward</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </>
  );
}
