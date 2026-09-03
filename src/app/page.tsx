"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// "/" = el Inicio del lado consumidor. Es el índice vivo de Boga: un vistazo a
// cada hub + contenido editorial fresco (SEO). Nada se resuelve acá, solo se
// descubre; cada bloque termina en "Ver todo". Buscador = /market, B2B = /negocios.
// Data de muestra hasta que cada hub exponga sus destacados reales.

// Portada rotativa — un solo banner que va cambiando: revista, promos, sorteo,
// eventos… Data de muestra hasta que salga de cada hub / de un CMS.
type Slide = { kicker: string; title: string; href: string; img: string; portrait?: string };
const PORTADA_SLIDES: Slide[] = [
  {
    kicker: 'Revista · Gastronomía',
    title: 'Los 3 huariques secretos para el mejor tacacho de Pucallpa',
    href: '/revista',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80',
    portrait: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&q=80',
  },
  {
    kicker: 'Promo · Market',
    title: '2x1 en hamburguesas — solo por hoy',
    href: '/market',
    img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&q=80',
  },
  {
    kicker: 'Sorteo del mes',
    title: 'Suma tickets con tus compras y gana una moto lineal 0 km',
    href: '/sorteos',
    img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1600&q=80',
  },
  {
    kicker: 'Eventos',
    title: 'Trueno en Pucallpa · 1 de octubre en el Anfiteatro',
    href: '/eventos',
    img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1600&q=80',
  },
  {
    kicker: 'Revista · Curiosidades',
    title: '¿Sabías por qué la laguna de Yarinacocha se llama así?',
    href: '/revista',
    img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80',
  },
];

// Vistazo a los hubs — "todo Boga en un lugar".
const HUB_TILES = [
  { href: '/market',      label: 'Market',      icon: 'storefront',          stat: '+200 productos',      sub: 'Comida, mercado, moda y más' },
  { href: '/eventos',     label: 'Eventos',     icon: 'celebration',         stat: '14 esta semana',      sub: 'Conciertos, ferias y fiestas' },
  { href: '/yapu',        label: 'Yapu',        icon: 'handshake',           stat: 'Chamba y servicios',  sub: 'Oficios y avisos de trabajo' },
  { href: '/taxi-seguro', label: 'Taxi Seguro', icon: 'local_taxi',          stat: 'Choferes verificados', sub: 'Mototaxi, auto y moto' },
  { href: '/alquileres',  label: 'Alquileres',  icon: 'bed',                 stat: '40 avisos',           sub: 'Cuartos, depas y pensiones' },
  { href: '/sorteos',     label: 'Sorteos',     icon: 'confirmation_number', stat: 'Premios cada mes',    sub: 'Suma tickets con tus compras' },
];

// Peek: Market → lista VIP de restaurantes (posición pagada por el local).
const VIP_RESTAURANTS = [
  { id: 1, name: 'La Anaconda Parrillas',       cuisine: 'Parrilla amazónica',    rating: '4.9', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80' },
  { id: 2, name: 'Doña Fela · Comida Criolla',  cuisine: 'Criollo y menú del día', rating: '4.8', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80' },
  { id: 3, name: 'El Fogón · Juanes & Tacacho', cuisine: 'Regional selvática',     rating: '4.7', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80' },
];

// Peek: Eventos / turismo → "¿Qué hacer en Pucallpa hoy?"
const EXPERIENCES = [
  { id: 'yarina',   title: 'Laguna de Yarinacocha',          tag: 'Medio día',    from: 'S/ 25', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'shipibo',  title: 'Comunidad Shipiba San Francisco', tag: '3–4 h',        from: 'S/ 40', img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
  { id: 'boqueron', title: 'Boquerón del Padre Abad',         tag: 'Día completo', from: 'S/ 90', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'jardin',   title: 'Jardín Botánico y Serpentario',   tag: '2 h',          from: 'S/ 15', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80' },
  { id: 'malecon',  title: 'Atardecer en el Malecón',         tag: 'Gratis',       from: 'S/ 0',  img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
];

// Peek: Yapu → servicios locales.
const SERVICIOS_PEEK = [
  { id: 'sv1', nombre: 'Marco Ríos',    oficio: 'Electricista domiciliario', zona: 'Yarinacocha', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80' },
  { id: 'sv2', nombre: 'Lucía Panduro', oficio: 'Gasfitería y destape',      zona: 'Callería',    img: 'https://images.unsplash.com/photo-1580281658626-ee379f3cce93?w=400&q=80' },
  { id: 'sv3', nombre: 'Karen Vela',    oficio: 'Fotografía de eventos',     zona: 'Centro',      img: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&q=80' },
];

// Peek: Alquileres.
const ALQUILERES_PEEK = [
  { id: 'al1', titulo: 'Habitación amoblada con baño propio',  zona: 'Callería',    precio: 'S/ 450', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80' },
  { id: 'al2', titulo: 'Mini-departamento para 1–2 personas',  zona: 'Yarinacocha', precio: 'S/ 800', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80' },
  { id: 'al3', titulo: 'Pensión familiar · cuarto + 3 comidas', zona: 'Centro',     precio: 'S/ 950', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80' },
];

// Peek: Sorteos.
const SORTEO_PEEK = {
  titulo: 'Moto lineal 0 km',
  sub: 'Honda XR 150 · sorteo del mes',
  img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1400&q=80',
};

// SEO: notas de la revista.
const SELVA_NOTES = [
  { id: 'tacacho',   cat: 'Huariques',    title: 'Los 3 huariques secretos para el mejor tacacho de Pucallpa', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80' },
  { id: 'yarina',    cat: 'Curiosidades', title: '¿Sabías por qué la laguna de Yarinacocha se llama así?',      img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'domingo',   cat: 'Turismo',      title: 'Qué hacer un domingo en Pucallpa con menos de S/ 50',         img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
  { id: 'contamana', cat: 'Itinerarios',  title: 'Ruta de fin de semana: de Pucallpa a Contamana',              img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'mitos',     cat: 'Curiosidades', title: 'Mitos de la selva que probablemente no sabías',               img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
];

function SectionHead({ title, href, cta = 'Ver todo' }: { title: string; href: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between border-t-2 border-on-surface pt-3">
      <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl">{title}</h2>
      <Link href={href} className="font-label-md text-[12px] text-primary shrink-0 flex items-center gap-0.5 whitespace-nowrap">
        {cta}
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </Link>
    </div>
  );
}

const CAROUSEL = "flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x";

// Un solo banner de portada que rota entre revista, promos, sorteo y eventos.
function PortadaCarrusel() {
  const [i, setI] = useState(0);
  const n = PORTADA_SLIDES.length;
  const next = useCallback(() => setI((v) => (v + 1) % n), [n]);
  const prev = () => setI((v) => (v - 1 + n) % n);

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="max-w-[1280px] mx-auto w-full pl-12 pr-container-margin lg:px-8 pt-6">
      <div className="relative overflow-hidden bg-surface-container-low shadow-sm aspect-[4/3] sm:aspect-[2/1] lg:aspect-[64/21]">
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {PORTADA_SLIDES.map((s) => (
            <Link key={s.title} href={s.href} className="group relative w-full h-full shrink-0">
              <img src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              {s.portrait && (
                <div className="absolute top-3 left-3 lg:top-5 lg:left-5 w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
                  <img src={s.portrait} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 pt-4 pr-4 pb-4 pl-14 lg:p-8">
                <span className="font-label-md text-[10px] uppercase tracking-[0.25em] text-white/70">{s.kicker}</span>
                <h2 className="font-headline-lg font-extrabold tracking-tight text-white leading-[1.06] text-xl sm:text-2xl lg:text-4xl mt-1.5 max-w-[24ch]">
                  {s.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>

        <button onClick={(e) => { e.preventDefault(); prev(); }} aria-label="Anterior" className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[20px] text-on-surface">chevron_left</span>
        </button>
        <button onClick={(e) => { e.preventDefault(); next(); }} aria-label="Siguiente" className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[20px] text-on-surface">chevron_right</span>
        </button>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {PORTADA_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); setI(idx); }}
              aria-label={`Ir al banner ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      <MarketTabs />

      {/* Banda negra compacta */}
      <div className="bg-on-surface text-background">
        <div className="max-w-[1280px] mx-auto px-container-margin lg:px-8 py-3 lg:py-3.5 flex flex-wrap items-center gap-x-6 gap-y-1">
          <h1 className="font-headline-lg font-extrabold tracking-tight text-lg lg:text-xl">
            Descubre <span className="text-primary-fixed">Pucallpa</span>
          </h1>
          <p className="font-body-md text-background/60 text-xs">Comercio, movilidad, trabajo, alquileres y estilo de vida — en un solo lugar.</p>
        </div>
      </div>

      {/* Portada — un solo banner que rota */}
      <PortadaCarrusel />

      <main className="max-w-[1280px] mx-auto w-full flex flex-col gap-9 lg:gap-12 py-9 lg:py-12 pl-12 pr-container-margin lg:px-8">

        {/* Todo Boga en un vistazo */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl border-t-2 border-on-surface pt-3">
            Todo Boga en un vistazo
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {HUB_TILES.map((h) => (
              <Link
                key={h.href}
                href={h.href}
                className="group bg-white border border-surface-container-highest rounded-lg p-4 flex flex-col gap-1.5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[22px]">{h.icon}</span>
                </span>
                <span className="font-headline-sm text-sm text-on-surface mt-1">{h.label}</span>
                <span className="font-label-md text-[11px] text-primary">{h.stat}</span>
                <span className="font-body-md text-secondary text-[11px] leading-tight">{h.sub}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Del Market — Lista VIP */}
        <section className="flex flex-col gap-4">
          <div className="border-t-2 border-on-surface pt-3 flex items-end justify-between">
            <div>
              <span className="w-fit bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider mb-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>Lista VIP · Patrocinado
              </span>
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl">Los 3 mejores restaurantes</h2>
            </div>
            <Link href="/market" className="font-label-md text-[12px] text-primary shrink-0 flex items-center gap-0.5 whitespace-nowrap">
              Ver Market<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VIP_RESTAURANTS.map((r, i) => (
              <Link href="/market" key={r.id} className="group relative overflow-hidden aspect-[16/10] sm:aspect-[4/3] shadow-sm bg-surface-container-low">
                <img src={r.img} alt={r.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-white text-[12px] font-black flex items-center justify-center shadow">{i + 1}</span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="font-headline-sm text-white text-sm leading-tight">{r.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-white/80">
                    <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[11px] font-label-md">{r.rating} · {r.cuisine}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Qué hacer en Pucallpa hoy */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Qué hacer en Pucallpa hoy" href="/eventos" cta="Ver eventos" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {EXPERIENCES.map((e) => (
              <Link href="/eventos" key={e.id} className="min-w-[220px] w-[220px] lg:min-w-[260px] lg:w-[260px] bg-white border border-surface-container-highest overflow-hidden shadow-sm snap-start group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low">
                  <img src={e.img} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-on-surface text-[10px] font-label-md px-2 py-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>{e.tag}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2">{e.title}</h4>
                  <span className="text-secondary font-label-md text-[11px] mt-auto">Desde <span className="font-price-lg text-primary text-sm">{e.from}</span></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Chamba y servicios — Yapu */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Chamba y servicios" href="/yapu" cta="Ver Yapu" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SERVICIOS_PEEK.map((s) => (
              <Link href="/yapu" key={s.id} className="bg-white border border-surface-container-highest p-3 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-colors">
                <div className="w-14 h-14 overflow-hidden shrink-0 bg-surface-container-low">
                  <img src={s.img} alt={s.nombre} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{s.nombre}</span>
                  <span className="block font-label-md text-[11px] text-secondary line-clamp-1">{s.oficio}</span>
                  <span className="font-label-md text-[10px] text-secondary/70 flex items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>{s.zona}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Dónde vivir — Alquileres */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Dónde vivir" href="/alquileres" cta="Ver alquileres" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ALQUILERES_PEEK.map((a) => (
              <Link href="/alquileres" key={a.id} className="bg-white border border-surface-container-highest overflow-hidden shadow-sm group flex flex-col">
                <div className="relative h-32 overflow-hidden bg-surface-container-low">
                  <img src={a.img} alt={a.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute bottom-2 right-2 bg-white text-primary font-price-lg text-sm px-2 py-0.5 shadow-sm">{a.precio}<span className="text-[9px] text-secondary font-label-md"> /mes</span></span>
                </div>
                <div className="p-3">
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2 leading-tight">{a.titulo}</h4>
                  <span className="font-label-md text-[11px] text-secondary flex items-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>{a.zona}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Sorteo del mes */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Sorteo del mes" href="/sorteos" cta="Ver sorteos" />
          <Link href="/sorteos" className="group relative block overflow-hidden aspect-[16/9] sm:aspect-[21/9] bg-[#3a1a6e] shadow-sm">
            <img src={SORTEO_PEEK.img} alt={SORTEO_PEEK.titulo} className="absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.03]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#3a1a6e]/95 via-[#3a1a6e]/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-5 lg:p-10 max-w-[520px]">
              <span className="w-fit text-[10px] font-label-md uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: '#c9f24a', color: '#2a1155' }}>Suma tickets con tus compras</span>
              <h3 className="font-headline-lg font-extrabold text-white text-2xl lg:text-4xl leading-[1.03]">{SORTEO_PEEK.titulo}</h3>
              <p className="text-white/80 font-body-md text-xs lg:text-sm">{SORTEO_PEEK.sub}</p>
            </div>
          </Link>
        </section>

        {/* Más de la Revista — SEO */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Más de la Revista" href="/revista" cta="Ver revista" />
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {SELVA_NOTES.map((n) => (
              <Link href="/revista" key={n.id} className="min-w-[260px] w-[260px] lg:min-w-[300px] lg:w-[300px] snap-start group flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-low">
                  <img src={n.img} alt={n.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute top-2 left-2 bg-white text-on-surface text-[9px] font-label-md px-2 py-0.5 uppercase tracking-wider">{n.cat}</span>
                  <h3 className="absolute inset-x-0 bottom-0 p-3 font-headline-sm text-white text-sm leading-tight line-clamp-2">{n.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Qué es Boga */}
        <section className="bg-on-surface text-background p-6 lg:p-10">
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
