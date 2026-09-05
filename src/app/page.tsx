"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
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

// Los 8 Portales de Boga — el lanzador de la ciudad. Un ícono por hub, cada
// uno con su color. El "sub" está escrito como lo que Boga te resuelve, no
// como una categoría: "cómo te ayudamos", en lenguaje cercano.
const PORTALES = [
  { href: '/market',      label: 'Market',      icon: 'storefront',          sub: 'Te traemos pescado, carne y tienda', color: '#E8894A' },
  { href: '/servicios',   label: 'Chamba',      icon: 'construction',        sub: 'Te conseguimos técnico o trabajo',   color: '#3E9B5F' },
  { href: '/taxi-seguro', label: 'Taxi Seguro', icon: 'local_taxi',          sub: 'Te llevamos con chofer verificado',  color: '#E4655A' },
  { href: '/alquileres',  label: 'Alquileres',  icon: 'bed',                 sub: 'Te encontramos dónde vivir',         color: '#8B7FD4' },
  { href: '/eventos',     label: 'Eventos',     icon: 'celebration',         sub: 'Te armamos el finde en la ciudad',   color: '#EBB05C' },
  { href: '/sorteos',     label: 'La Suerte',   icon: 'confirmation_number', sub: 'Te hacemos ganar con tus compras',   color: '#2E9B76' },
  { href: '/revista',     label: 'Revista',     icon: 'menu_book',           sub: 'Te contamos la selva y sus historias', color: '#D97742' },
  { href: '/negocios',    label: 'Negocios',    icon: 'work',                sub: 'Te ponemos a vender por WhatsApp',   color: '#2F3B4C' },
];

// Peek: Market → "Dónde comer esta semana". Un carrusel de listas por antojo;
// cada lista trae 3 locales. La posición dentro de la lista la paga el local
// (las listas marcadas "patrocinado").
type ComerLugar = { name: string; cuisine: string; rating: string; img: string };
type ComerLista = { id: string; titulo: string; patrocinado?: boolean; lugares: ComerLugar[] };
const COMER_LISTAS: ComerLista[] = [
  {
    id: 'parrillas',
    titulo: 'Parrillas y ahumados',
    patrocinado: true,
    lugares: [
      { name: 'La Anaconda Parrillas',   cuisine: 'Parrilla amazónica',     rating: '4.9', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80' },
      { name: 'El Ahumadero de Yarina',  cuisine: 'Ahumados a la leña',      rating: '4.7', img: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80' },
      { name: 'Brasa Shipiba',           cuisine: 'Carnes y chorizo regional', rating: '4.6', img: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80' },
    ],
  },
  {
    id: 'menu',
    titulo: 'Menú del día',
    lugares: [
      { name: 'Doña Fela · Comida Criolla', cuisine: 'Menú casero',        rating: '4.8', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80' },
      { name: 'El Almuerzo de la Tía',      cuisine: 'Menú económico',      rating: '4.5', img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80' },
      { name: 'Sabor Ucayalino',           cuisine: 'Criollo y selvático',  rating: '4.6', img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80' },
    ],
  },
  {
    id: 'selva',
    titulo: 'Cocina de la selva',
    lugares: [
      { name: 'El Fogón · Juanes & Tacacho', cuisine: 'Regional selvática',           rating: '4.7', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80' },
      { name: 'Tacacho & Cecina "El Boquerón"', cuisine: 'Platos típicos',            rating: '4.6', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80' },
      { name: 'La Patarashca de Manuel',     cuisine: 'Pescado en hoja de bijao',     rating: '4.8', img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80' },
    ],
  },
  {
    id: 'llevar',
    titulo: 'Para llevar y delivery',
    lugares: [
      { name: 'Pollería La Leña Brava',     cuisine: 'Pollo a la brasa',    rating: '4.5', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?w=400&q=80' },
      { name: 'Anticuchos del Malecón',     cuisine: 'Anticucho y parrilla', rating: '4.7', img: 'https://images.unsplash.com/photo-1633896949673-1eb9d131a9b4?w=400&q=80' },
      { name: 'Juguería Amazonía',          cuisine: 'Jugos y sánguches',    rating: '4.6', img: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&q=80' },
    ],
  },
];

// Guía rápida — "¿Primera vez en Pucallpa?". 6 necesidades, cada tarjeta
// manda al portal que la resuelve; la guía completa (clima, plata, etc.)
// vive en /guia. Tarjetas compactas (ícono + texto), sin foto.
const GUIA_PUCALLPA = [
  { href: '/alquileres',  icon: 'bed',          titulo: 'Dónde quedarte', sub: 'Cuartos, hostales y minidepas — por día o por mes', color: '#8B7FD4' },
  { href: '/taxi-seguro', icon: 'local_taxi',   titulo: 'Cómo moverte',   sub: 'Mototaxi, auto o moto con chofer verificado',       color: '#E4655A' },
  { href: '/eventos',     icon: 'map',          titulo: 'Qué hacer',      sub: 'Yarinacocha, Boquerón, ferias y agenda cultural',   color: '#EBB05C' },
  { href: '/market',      icon: 'ramen_dining', titulo: 'Dónde comer',    sub: 'Huariques, menús del día y cocina de la selva',     color: '#E8894A' },
  { href: '/servicios',   icon: 'construction', titulo: 'Buscar chamba',  sub: 'Técnicos de confianza y bolsa de empleo local',     color: '#3E9B5F' },
  { href: '/market',      icon: 'storefront',   titulo: 'Qué comprar',    sub: 'Pescado y carne fresca, abarrotes y artesanía',     color: '#D97742' },
];

// Peek: Eventos / turismo → "¿Qué hacer en Pucallpa hoy?"
const EXPERIENCES = [
  { id: 'yarina',   title: 'Laguna de Yarinacocha',          tag: 'Medio día',    from: 'S/ 25', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80' },
  { id: 'shipibo',  title: 'Comunidad Shipiba San Francisco', tag: '3–4 h',        from: 'S/ 40', img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=600&q=80' },
  { id: 'boqueron', title: 'Boquerón del Padre Abad',         tag: 'Día completo', from: 'S/ 90', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80' },
  { id: 'jardin',   title: 'Jardín Botánico y Serpentario',   tag: '2 h',          from: 'S/ 15', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80' },
  { id: 'malecon',  title: 'Atardecer en el Malecón',         tag: 'Gratis',       from: 'S/ 0',  img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80' },
];

// Peek: Servicios locales.
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
    <div className="flex items-end justify-between">
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
    <div className="w-screen mx-[calc(50%-50vw)] lg:w-full lg:mx-0">
      <div className="relative overflow-hidden lg:rounded-2xl bg-surface-container-low shadow-sm aspect-[16/10] sm:aspect-[2/1] lg:aspect-auto lg:h-[460px]">
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

// Panel "Pulso metropolitano" — al lado de la portada en escritorio, apilado en
// móvil. Accesos rápidos a los hubs de servicio con la data que ya mostramos en
// las tarjetas de "Todo Boga en un vistazo".
const PULSO_CARDS = [
  {
    href: '/taxi-seguro',
    icon: 'local_taxi',
    title: 'Taxi Seguro a tu puerta',
    sub: 'Choferes verificados · mototaxi, auto y moto',
    action: 'arrow_outward',
    tint: 'bg-tertiary-fixed text-tertiary',
    btn: 'bg-tertiary text-on-tertiary',
  },
  {
    href: '/servicios',
    icon: 'construction',
    title: '¿Necesitas un técnico?',
    sub: 'Electricistas y gasfiteros activos + bolsa de empleos',
    action: 'search',
    tint: 'bg-[#d7f0e2] text-[#0b7a48]',
    btn: 'bg-[#0F8A55] text-white',
  },
  {
    href: '/sorteos',
    icon: 'confirmation_number',
    title: 'Sorteo del mes: moto 0 km',
    sub: 'Honda XR 150 · suma tickets con tus compras',
    action: 'chevron_right',
    tint: 'bg-primary-fixed text-primary',
    btn: 'bg-primary text-white',
  },
];

// Panel "Los 8 Portales de Boga" — el lanzador de la ciudad, al lado de la
// portada en escritorio y apilado en móvil. Un ícono por hub, en 2 columnas.
function PortalesPanel() {
  return (
    <div className="px-container-margin lg:px-0 pt-6 lg:pt-0">
      <div className="flex flex-col gap-4 lg:h-full">
        <div>
          <span className="font-label-md text-[10px] uppercase tracking-[0.2em] text-secondary">Cómo te ayudamos</span>
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-xl lg:text-2xl leading-tight">
            Todo Pucallpa, de tu lado
          </h2>
          <p className="font-body-md text-secondary text-xs mt-1">
            Te ayudamos con tu compra, tu chamba, tu taxi y tu día a día en la ciudad.
          </p>
        </div>

        {/* Móvil: fila horizontal de tarjetas cuadradas (ícono + descripción), sin panel envolvente */}
        <div className="flex lg:hidden gap-2.5 overflow-x-auto hide-scrollbar -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {PORTALES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group bg-white border border-surface-container-high rounded-xl p-2.5 flex items-start gap-2.5 hover:border-primary/40 hover:shadow-md transition-all shrink-0 w-[168px]"
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: p.color }}
              >
                <span className="material-symbols-outlined text-white text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-headline-sm text-[12px] text-on-surface leading-tight line-clamp-1">{p.label}</span>
                <span className="block font-body-md text-secondary text-[10px] leading-snug line-clamp-2 mt-0.5">{p.sub}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Escritorio: grilla con descripción */}
        <div className="hidden lg:grid grid-cols-2 gap-2.5 flex-1">
          {PORTALES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group bg-white border border-surface-container-high rounded-xl p-2.5 flex items-start gap-2.5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: p.color }}
              >
                <span className="material-symbols-outlined text-white text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>{p.icon}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-headline-sm text-[12px] text-on-surface leading-tight line-clamp-1">{p.label}</span>
                <span className="hidden sm:block font-body-md text-secondary text-[10px] leading-snug line-clamp-2 mt-0.5">{p.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Panel "Pulso metropolitano" — banda de accesos rápidos a los hubs de servicio,
// debajo de la portada. 3 tarjetas en fila en escritorio, apiladas en móvil.
function PulsoPanel() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="font-label-md text-[10px] uppercase tracking-[0.22em] text-[#0b7a48] font-bold">Pulso metropolitano</span>
          <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl leading-tight">
            Pucallpa en una sola app
          </h2>
          <p className="font-body-md text-secondary text-xs mt-1.5 max-w-[52ch]">
            Transporte verificado, servicios de confianza y la agenda de la ciudad, en tiempo real.
          </p>
        </div>
        <span className="flex items-center gap-1.5 font-label-md text-[10px] text-secondary shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F8A55] animate-pulse" />
          Sincronizado
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PULSO_CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group bg-white border border-surface-container-high rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.tint}`}>
              <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-headline-sm text-[13px] text-on-surface leading-tight line-clamp-1">{c.title}</span>
              <span className="block font-body-md text-secondary text-[11px] leading-tight line-clamp-1">{c.sub}</span>
            </span>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${c.btn}`}>
              <span className="material-symbols-outlined text-[18px]">{c.action}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-surface-container-high pt-3 font-label-md text-[10px]">
        <span className="text-secondary">Callería · Yarinacocha · Manantay</span>
        <span className="text-[#0b7a48] font-bold">100% ucayalino</span>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader showSearch={false} cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      {/* Banda negra compacta */}
      <div className="bg-on-surface text-background overflow-hidden">
        <div className="w-full px-container-margin lg:px-8 py-1 lg:py-1.5 flex items-center gap-x-6">
          <h1 className="shrink-0 font-headline-lg font-extrabold tracking-tight text-lg lg:text-xl">
            Descubre <span className="text-primary-fixed">Pucallpa</span>
          </h1>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="marquee-track flex w-max gap-16 whitespace-nowrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <p key={i} className="font-body-md text-background/60 text-xs" aria-hidden={i > 0 || undefined}>
                  Comercio, movilidad, trabajo, alquileres y estilo de vida — en un solo lugar.
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portada rotativa + panel "Los 8 Portales de Boga" (lado a lado en escritorio) */}
      <div className="max-w-[1440px] mx-auto w-full lg:px-8 pt-4 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[1.7fr_1fr] lg:gap-5 lg:items-stretch">
          <PortadaCarrusel />
          <PortalesPanel />
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-9 lg:gap-12 py-9 lg:py-12 px-container-margin lg:px-8">

        {/* Guía rápida — ¿Primera vez en Pucallpa? (debajo del banner) */}
        <section className="flex flex-col gap-4">
          <div>
            <span className="font-label-md text-[10px] uppercase tracking-[0.2em] text-secondary">Guía rápida</span>
            <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl">¿Primera vez en Pucallpa?</h2>
            <p className="font-body-md text-secondary text-xs mt-1">Lo esencial para moverte, dormir, comer y pasarla bien.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {GUIA_PUCALLPA.slice(0, 4).map((g) => (
              <Link
                href={g.href}
                key={g.titulo}
                className="group bg-white border border-surface-container-highest p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex flex-col gap-2"
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: g.color }}>
                  <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                </span>
                <h3 className="font-headline-sm text-sm text-on-surface leading-tight">{g.titulo}</h3>
                <p className="font-body-md text-secondary text-[11px] leading-snug">{g.sub}</p>
                <span className="mt-auto pt-1 text-primary font-label-md text-[11px] flex items-center gap-0.5">
                  Ver <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/guia"
            className="group flex items-center justify-between gap-4 bg-on-surface text-background p-4 lg:p-5 hover:bg-on-surface/90 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
              </span>
              <div className="min-w-0">
                <h3 className="font-headline-sm text-sm lg:text-base">Guía completa de Pucallpa</h3>
                <p className="font-body-md text-background/60 text-[11px] lg:text-xs">Clima, plata, emergencias, cómo llegar y costumbres locales</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary-fixed text-[20px] shrink-0 transition-transform group-hover:translate-x-0.5">arrow_forward</span>
          </Link>
        </section>

        {/* Pulso metropolitano */}
        <PulsoPanel />

        {/* Del Market — Dónde comer esta semana (carrusel de listas) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="w-fit bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider mb-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>Selección Boga
              </span>
              <h2 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-2xl lg:text-3xl">Dónde comer esta semana</h2>
              <p className="font-body-md text-secondary text-xs mt-1">Listas por antojo — desliza para ver más.</p>
            </div>
            <Link href="/market" className="font-label-md text-[12px] text-primary shrink-0 flex items-center gap-0.5 whitespace-nowrap">
              Ver Market<span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className={CAROUSEL} style={{ scrollbarWidth: 'none' }}>
            {COMER_LISTAS.map((lista) => (
              <div
                key={lista.id}
                className="snap-start shrink-0 w-[86%] sm:w-[380px] lg:w-[420px] bg-white border border-surface-container-highest shadow-sm flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-container-high">
                  <h3 className="font-headline-sm text-sm text-on-surface">{lista.titulo}</h3>
                  {lista.patrocinado && (
                    <span className="text-[9px] font-label-md uppercase tracking-wider text-secondary shrink-0">Patrocinado</span>
                  )}
                </div>
                <div className="flex flex-col">
                  {lista.lugares.map((r, i) => (
                    <Link
                      href="/market"
                      key={r.name}
                      className="group flex items-center gap-3 p-3 border-b border-surface-container-low last:border-0 hover:bg-surface-container-low transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-[12px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="w-14 h-14 overflow-hidden shrink-0 bg-surface-container-low">
                        <img src={r.img} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-headline-sm text-sm text-on-surface leading-tight line-clamp-1">{r.name}</h4>
                        <div className="flex items-center gap-1 mt-0.5 text-secondary">
                          <span className="material-symbols-outlined text-tertiary text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-[11px] font-label-md line-clamp-1">{r.rating} · {r.cuisine}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-secondary/40 text-[18px] group-hover:text-primary transition-colors shrink-0">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </div>
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

        {/* Servicios y chamba */}
        <section className="flex flex-col gap-4">
          <SectionHead title="Chamba y servicios" href="/servicios" cta="Ver todo" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SERVICIOS_PEEK.map((s) => (
              <Link href="/servicios" key={s.id} className="bg-white border border-surface-container-highest p-3 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-colors">
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
