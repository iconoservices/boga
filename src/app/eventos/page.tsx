"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import MarketTabs from '@/components/MarketTabs';
import { useCart } from '@/context/CartContext';

// Eventos = agenda + descubrimiento local de Pucallpa, estilo plataforma de
// tickets (Joinnus): carrusel destacado, categorías, "a dónde ir" y agenda.
// Contenido de muestra; sin venta de entradas todavía.

type Cat =
  | 'Conciertos' | 'Arte & Cultura' | 'Ferias' | 'Deporte'
  | 'Cine' | 'Cursos y talleres' | 'Comidas & Bebidas' | 'Familia' | 'Fiestas';

const CATEGORIAS: { cat: Cat; icon: string }[] = [
  { cat: 'Conciertos',        icon: 'mic_external_on' },
  { cat: 'Arte & Cultura',    icon: 'palette' },
  { cat: 'Ferias',            icon: 'storefront' },
  { cat: 'Deporte',           icon: 'sports_soccer' },
  { cat: 'Cine',              icon: 'movie' },
  { cat: 'Cursos y talleres', icon: 'school' },
  { cat: 'Comidas & Bebidas', icon: 'restaurant' },
  { cat: 'Familia',           icon: 'family_restroom' },
  { cat: 'Fiestas',           icon: 'celebration' },
];

const CARRUSEL = [
  { id: 'c1', titulo: 'Trueno en Pucallpa', sub: 'Gira Sudamérica 2026', dia: '01', mes: 'OCT', lugar: 'Anfiteatro Municipal', precio: 'Desde S/ 89', cta: 'Comprar entradas', img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1400&q=80' },
  { id: 'c2', titulo: 'Feria Regional de la Amazonía', sub: 'Dos días de gastronomía y música', dia: '13', mes: 'SEP', lugar: 'Parque Natural de Pucallpa', precio: 'Entrada libre', cta: 'Ver programa', img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1400&q=80' },
  { id: 'c3', titulo: 'Noche de Cumbia Amazónica', sub: 'Los clásicos en vivo', dia: '12', mes: 'SEP', lugar: 'Complejo La Cabaña', precio: 'Desde S/ 30', cta: 'Comprar entradas', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80' },
];

type Evento = {
  id: string; titulo: string; cat: Cat; lugar: string; dia: string; mes: string;
  precio: string; organiza: string; img: string;
};

const EVENTOS: Evento[] = [
  { id: 'e1', titulo: 'Noche de Cumbia Amazónica',   cat: 'Conciertos',        lugar: 'Complejo La Cabaña',   dia: '12', mes: 'SEP', precio: 'S/ 30',  organiza: 'Producciones Selva', img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=700&q=80' },
  { id: 'e2', titulo: 'Feria Gastronómica del Juane', cat: 'Comidas & Bebidas', lugar: 'Plaza de Armas',        dia: '14', mes: 'SEP', precio: 'Libre',  organiza: 'Municipalidad',       img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&q=80' },
  { id: 'e3', titulo: 'Torneo de Fútbol Playa',       cat: 'Deporte',           lugar: 'Playa de Yarinacocha',  dia: '20', mes: 'SEP', precio: 'Libre',  organiza: 'Liga Distrital',      img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=700&q=80' },
  { id: 'e4', titulo: 'Expo Artesanía Shipiba',       cat: 'Arte & Cultura',    lugar: 'Casa de la Cultura',    dia: '18', mes: 'SEP', precio: 'S/ 5',   organiza: 'Colectivo Shipibo',   img: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=700&q=80' },
  { id: 'e5', titulo: 'Taller de fotografía de selva', cat: 'Cursos y talleres', lugar: 'Estudio Klima',        dia: '21', mes: 'SEP', precio: 'S/ 60',  organiza: 'S. Klima',            img: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=700&q=80' },
  { id: 'e6', titulo: 'Cine bajo las estrellas',      cat: 'Cine',              lugar: 'Malecón Bellavista',    dia: '24', mes: 'SEP', precio: 'Libre',  organiza: 'Cultura Pucallpa',    img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&q=80' },
  { id: 'e7', titulo: 'Concierto Rock en la Selva',   cat: 'Conciertos',        lugar: 'Anfiteatro Municipal',  dia: '27', mes: 'SEP', precio: 'S/ 45',  organiza: 'Selva Sound',         img: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=700&q=80' },
  { id: 'e8', titulo: 'Aniversario de Pucallpa',      cat: 'Fiestas',           lugar: 'Malecón Bellavista',    dia: '13', mes: 'OCT', precio: 'Libre',  organiza: 'Municipalidad',       img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=80' },
  { id: 'e9', titulo: 'Domingo familiar en el Parque', cat: 'Familia',          lugar: 'Parque Natural',        dia: '15', mes: 'SEP', precio: 'S/ 3',   organiza: 'Parque Natural',      img: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=700&q=80' },
];

// "A dónde ir" — lugares para visitar (turismo local, no eventos con fecha).
const LUGARES = [
  { id: 'l1', nombre: 'Laguna de Yarinacocha',          tag: 'Naturaleza · medio día', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&q=80' },
  { id: 'l2', nombre: 'Parque Natural de Pucallpa',      tag: 'Familia · 2–3 h',        img: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=700&q=80' },
  { id: 'l3', nombre: 'Jardín Botánico y Serpentario',   tag: 'Naturaleza · 2 h',       img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=700&q=80' },
  { id: 'l4', nombre: 'Boquerón del Padre Abad',         tag: 'Aventura · día completo', img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=700&q=80' },
  { id: 'l5', nombre: 'Malecón de Bellavista',           tag: 'Paseo · gratis',         img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=700&q=80' },
  { id: 'l6', nombre: 'Comunidad Shipiba San Francisco', tag: 'Cultura · 3–4 h',        img: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=700&q=80' },
];

const TENDENCIAS = [
  'Trueno en Pucallpa — quedan pocas entradas',
  'Feria del Juane: horarios y puestos confirmados',
  'Rock en la Selva anuncia segunda fecha',
  'Aniversario de Pucallpa: programa completo',
];

export default function Eventos() {
  const { cartCount, setIsCartOpen } = useCart();
  const [cat, setCat] = useState<Cat | null>(null);
  const [slide, setSlide] = useState(0);

  const next = useCallback(() => setSlide((s) => (s + 1) % CARRUSEL.length), []);
  const prev = () => setSlide((s) => (s - 1 + CARRUSEL.length) % CARRUSEL.length);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const lista = cat ? EVENTOS.filter((e) => e.cat === cat) : EVENTOS;

  return (
    <>
      <AppHeader showSearch cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} placeholder="Busca un evento o lugar…" />
      <MarketTabs />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-4 flex flex-col gap-8 pb-14">

        {/* Carrusel destacado + Tendencias al costado */}
        <section className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="relative overflow-hidden rounded-2xl shadow-sm aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:min-h-[340px]">
            <div
              className="flex h-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {CARRUSEL.map((c) => (
                <div key={c.id} className="relative w-full h-full shrink-0 bg-surface-container-low">
                  <img src={c.img} alt={c.titulo} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 lg:p-10 max-w-[560px]">
                    <div className="flex items-center gap-2">
                      <div className="bg-white rounded-lg px-2.5 py-1 text-center shadow-md">
                        <span className="block font-price-lg text-primary text-base leading-none">{c.dia}</span>
                        <span className="block font-label-md text-[9px] text-secondary uppercase">{c.mes}</span>
                      </div>
                      <span className="bg-primary text-white text-[10px] font-label-md px-2 py-1 rounded-full uppercase tracking-wider">Destacado</span>
                    </div>
                    <h2 className="font-headline-lg text-white text-2xl sm:text-4xl font-extrabold leading-[1.05]">{c.titulo}</h2>
                    <p className="text-white/80 font-body-md text-xs sm:text-sm">{c.sub}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-white/90 font-label-md text-[11px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>{c.lugar}
                      </span>
                      <span className="text-white/90 font-label-md text-[11px]">· {c.precio}</span>
                    </div>
                    <button className="w-fit mt-2 bg-primary text-white font-label-md text-[12px] px-4 py-2 rounded-full active:scale-95 transition-transform">
                      {c.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={prev} aria-label="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[20px] text-on-surface">chevron_left</span>
            </button>
            <button onClick={next} aria-label="Siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[20px] text-on-surface">chevron_right</span>
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {CARRUSEL.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Ir al destacado ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </div>

          {/* Nuestras tendencias */}
          <aside className="bg-surface-container-low rounded-2xl p-4 flex flex-col">
            <h3 className="font-headline-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              Nuestras tendencias
            </h3>
            <ol className="mt-2 divide-y divide-on-surface/10 flex-1">
              {TENDENCIAS.map((t, i) => (
                <li key={i} className="flex items-baseline gap-3 py-3">
                  <span className="font-headline-lg font-black text-primary text-lg tabular-nums shrink-0">{i + 1}</span>
                  <span className="font-body-md text-on-surface text-[13px] leading-snug">{t}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        {/* Categorías */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-lg text-on-surface">Explora por categoría</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setCat(null)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
            >
              <span className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                cat === null ? 'bg-primary text-white' : 'bg-surface-container-low text-primary group-hover:bg-primary-fixed'
              }`}>
                <span className="material-symbols-outlined text-[24px]">apps</span>
              </span>
              <span className="font-label-md text-[10px] text-center leading-tight text-secondary">Todos</span>
            </button>
            {CATEGORIAS.map((c) => {
              const active = cat === c.cat;
              return (
                <button
                  key={c.cat}
                  onClick={() => setCat(active ? null : c.cat)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
                >
                  <span className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-primary text-white' : 'bg-surface-container-low text-primary group-hover:bg-primary-fixed'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">{c.icon}</span>
                  </span>
                  <span className="font-label-md text-[10px] text-center leading-tight text-secondary">{c.cat}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* A dónde ir — lugares para visitar */}
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-headline-lg text-on-surface">¿A dónde ir en Pucallpa? 🌴</h2>
              <p className="text-secondary font-body-md text-xs mt-0.5">Lugares para visitar cualquier día, con o sin evento</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {LUGARES.map((l) => (
              <div key={l.id} className="relative min-w-[220px] w-[220px] lg:min-w-[250px] lg:w-[250px] aspect-[4/5] rounded-2xl overflow-hidden snap-start shadow-[0_15px_15px_rgba(0,0,0,0.04)] group">
                <img src={l.img} alt={l.nombre} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <span className="font-label-md text-[9px] uppercase tracking-wider text-white/70">{l.tag}</span>
                  <h3 className="font-headline-sm text-white text-sm leading-tight mt-0.5">{l.nombre}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Planes imperdibles — carrusel de eventos */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-lg text-on-surface">Planes imperdibles</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {EVENTOS.slice(0, 7).map((e) => (
              <div key={e.id} className="min-w-[180px] w-[180px] lg:min-w-[210px] lg:w-[210px] bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start flex flex-col">
                <div className="relative aspect-square overflow-hidden bg-surface-container-low">
                  <img src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full">{e.dia} {e.mes}</span>
                  <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2 mt-0.5">{e.titulo}</h4>
                  <span className="text-secondary font-label-md text-[11px] flex items-center gap-1 mt-auto">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>{e.lugar}
                  </span>
                  <span className="font-price-lg text-primary text-sm">{e.precio}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lo más vendido esta semana — numerado */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            Lo más vendido esta semana
          </h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {EVENTOS.slice(1, 6).map((e, i) => (
              <div key={e.id} className="flex items-end gap-1 shrink-0 snap-start">
                <span className="font-headline-lg font-black text-primary/25 text-[64px] leading-[0.7] select-none">{i + 1}</span>
                <div className="w-[150px] lg:w-[170px]">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container-low">
                    <img src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-label-md text-[10px] text-secondary uppercase tracking-wider mt-2 block">{e.dia} {e.mes} · {e.lugar.split(' ')[0]}</span>
                  <h4 className="font-headline-sm text-[13px] text-on-surface line-clamp-2 leading-tight mt-0.5">{e.titulo}</h4>
                  <span className="font-price-lg text-primary text-[13px]">Desde {e.precio}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sección temática */}
        <section className="relative overflow-hidden rounded-2xl bg-[#0b4d2c] text-white p-5 lg:p-8">
          <div className="absolute -right-10 -top-12 w-56 h-56 bg-white/5 rounded-full blur-2xl" aria-hidden="true" />
          <div className="grid lg:grid-cols-[260px_1fr] gap-6 items-center relative">
            <div>
              <h2 className="font-headline-lg font-extrabold text-2xl lg:text-3xl leading-tight">Fiestas de la Selva</h2>
              <p className="text-white/75 font-body-md text-sm mt-2">Cumbia, aniversarios y ferias. La agenda que llena el malecón.</p>
              <button className="mt-4 bg-white text-on-surface font-label-md text-[12px] px-4 py-2 rounded-full active:scale-95 transition-transform">
                Ver todas las fiestas
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x" style={{ scrollbarWidth: 'none' }}>
              {EVENTOS.filter((e) => ['Conciertos', 'Fiestas', 'Ferias'].includes(e.cat)).map((e) => (
                <div key={e.id} className="min-w-[150px] w-[150px] shrink-0 snap-start">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/10">
                    <img src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <span className="font-label-md text-[9px] uppercase tracking-wider text-white/70">{e.dia} {e.mes}</span>
                      <h4 className="font-headline-sm text-white text-[12px] leading-tight line-clamp-2">{e.titulo}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Toda la agenda */}
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-lg text-on-surface">{cat ? cat : 'Toda la agenda'}</h2>
          {lista.length === 0 ? (
            <p className="text-secondary font-body-md text-sm py-8">No hay eventos en esta categoría por ahora.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lista.map((e) => (
                <div key={e.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
                  <div className="relative h-36 overflow-hidden bg-surface-container-low">
                    <img src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 text-center shadow-sm">
                      <span className="block font-price-lg text-primary text-sm leading-none">{e.dia}</span>
                      <span className="block font-label-md text-[9px] text-secondary uppercase">{e.mes}</span>
                    </div>
                    <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{e.cat}</span>
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{e.titulo}</h4>
                    <span className="text-secondary font-label-md text-[11px] flex items-center gap-1 line-clamp-1">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>{e.lugar}
                    </span>
                    <span className="text-secondary/70 font-label-md text-[10px] uppercase tracking-wider">Organiza · {e.organiza}</span>
                    <div className="flex items-center justify-between border-t border-surface-container pt-2.5 mt-2">
                      <span className="font-price-lg text-primary text-sm">{e.precio}</span>
                      <span className="text-primary font-label-md text-[11px] flex items-center gap-1">Más info<span className="material-symbols-outlined text-[13px]">arrow_forward</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          ¿Organizas un evento en Pucallpa? Publícalo en Boga y llega a miles de personas. Escríbenos por WhatsApp.
        </p>
      </main>
    </>
  );
}
