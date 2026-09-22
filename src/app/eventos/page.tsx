"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchEventos } from '@/lib/eventos';
import { fetchLugares, type Lugar } from '@/lib/lugares';
import ReservaEntrada from '@/components/ReservaEntrada';

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

// Foto de evento/lugar: si no hay imagen (o la dirección falla) muestra un
// fondo de marca en vez del ícono roto con el texto.
function Foto({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [falla, setFalla] = useState(false);
  if (!src || falla) {
    return (
      <div className={`${className ?? ''} bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center`} aria-label={alt} role="img">
        <span className="material-symbols-outlined text-primary/40 text-[40px]">celebration</span>
      </div>
    );
  }
  return <img referrerPolicy="no-referrer" src={src} alt={alt} className={className} onError={() => setFalla(true)} />;
}

type Evento = {
  id: string; titulo: string; cat: Cat; descripcion?: string; lugar: string; dia: string; mes: string;
  precio: string; organiza: string; img: string; destacado?: boolean;
  reservable?: boolean; aforo?: number | null; linkEntradas?: string;
  linkPostOriginal?: string;
};

export default function Eventos() {
  const { cartCount, setIsCartOpen } = useCart();
  const [cat, setCat] = useState<Cat | null>(null);
  const [slide, setSlide] = useState(0);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [eventoAbierto, setEventoAbierto] = useState<Evento | null>(null);
  const [lugarAbierto, setLugarAbierto] = useState<Lugar | null>(null);

  useEffect(() => {
    fetchEventos().then(setEventos);
    fetchLugares().then(setLugares);
  }, []);

  // El carrusel de arriba usa los eventos marcados "Destacado" en el admin;
  // si todavia no marcaron ninguno, cae a los primeros 3 para no dejar el
  // carrusel vacio.
  const destacados = eventos.filter((e) => e.destacado);
  const carrusel = destacados.length > 0 ? destacados : eventos.slice(0, 3);

  const next = useCallback(() => setSlide((s) => (carrusel.length ? (s + 1) % carrusel.length : 0)), [carrusel.length]);
  const swipeX = useRef<number | null>(null);
  const prev = () => setSlide((s) => (carrusel.length ? (s - 1 + carrusel.length) % carrusel.length : 0));

  useEffect(() => {
    if (carrusel.length < 2) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, carrusel.length]);

  const lista = cat ? eventos.filter((e) => e.cat === cat) : eventos;

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-4 flex flex-col gap-8 pb-14">

        {/* Encabezado principal SEO */}
        <header className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Agenda & Eventos en Pucallpa
          </div>
          <h1 className="font-headline-lg font-black text-2xl sm:text-3xl text-on-surface tracking-tight leading-tight">
            ¿Qué hacer en Pucallpa hoy?
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
            Cartelera completa de conciertos, festivales, ferias gastronómicas, eventos culturales, deporte y fiestas en Pucallpa y Yarinacocha.
          </p>
        </header>

        {/* Destacado + categorías: lado a lado en escritorio (como el Market) */}
        <div className={carrusel.length > 0 ? 'flex flex-col gap-8 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-6 lg:items-center' : 'contents'}>

        {/* Carrusel destacado */}
        {carrusel.length > 0 && (
        <section>
          <div
            className="relative overflow-hidden rounded-xl shadow-sm h-[360px] sm:h-auto sm:aspect-[21/9] lg:aspect-auto lg:h-[340px]"
            onTouchStart={(e) => { swipeX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (swipeX.current === null) return;
              const dx = e.changedTouches[0].clientX - swipeX.current;
              swipeX.current = null;
              if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
            }}
          >
            <div
              className="flex h-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {carrusel.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setEventoAbierto(c)}
                  className="relative w-full h-full shrink-0 bg-surface-container-low cursor-pointer"
                >
                  <Foto src={c.img} alt={c.titulo} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5 pt-5 pb-12 lg:p-10 max-w-[560px]">
                    <div className="flex items-center gap-2">
                      <div className="bg-white rounded-lg px-2.5 py-1 text-center shadow-md">
                        <span className="block font-price-lg text-primary text-base leading-none">{c.dia}</span>
                        <span className="block font-label-md text-[9px] text-secondary uppercase">{c.mes}</span>
                      </div>
                      <span className="bg-primary text-white text-[10px] font-label-md px-2 py-1 rounded-full uppercase tracking-wider">Destacado</span>
                    </div>
                    <h2 className="font-headline-lg text-white text-xl sm:text-4xl font-extrabold leading-[1.1] line-clamp-3">{c.titulo}</h2>
                    <p className="text-white/80 font-body-md text-xs sm:text-sm line-clamp-1">{c.organiza}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-white/90 font-label-md text-[11px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>{c.lugar}
                      </span>
                      <span className="text-white/90 font-label-md text-[11px]">· {c.precio}</span>
                    </div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setEventoAbierto(c); }}
                      className="w-fit mt-2 bg-primary text-white font-label-md text-[12px] px-4 py-2 rounded-full active:scale-95 transition-transform"
                    >
                      Ver más
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {carrusel.length > 1 && (
              <div className="absolute bottom-3 right-3 flex gap-1.5 z-20">
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); prev(); }}
                  aria-label="Anterior"
                  className="flex w-8 h-8 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); next(); }}
                  aria-label="Siguiente"
                  className="flex w-8 h-8 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {carrusel.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-1.5">
              {carrusel.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Ir al destacado ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${i === slide ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-surface-container-highest'}`}
                />
              ))}
            </div>
          )}
        </section>
        )}

        {/* Categorías */}
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-lg text-on-surface">Explora por categoría</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-1 lg:grid lg:grid-cols-5 lg:gap-x-2 lg:gap-y-4 lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setCat(null)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] lg:w-auto group"
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
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] lg:w-auto group"
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

        </div>

        {/* A dónde ir — lugares para visitar */}
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-headline-lg text-on-surface">¿A dónde ir en Pucallpa? 🌴</h2>
              <p className="text-secondary font-body-md text-xs mt-0.5">Lugares para visitar cualquier día, con o sin evento</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x scroll-pl-container-margin lg:scroll-pl-0" style={{ scrollbarWidth: 'none' }}>
            {lugares.map((l) => (
              <div
                key={l.id}
                onClick={() => setLugarAbierto(l)}
                className="relative min-w-[180px] w-[180px] h-[200px] lg:min-w-[210px] lg:w-[210px] lg:h-[230px] shrink-0 rounded-2xl overflow-hidden snap-start shadow-[0_15px_15px_rgba(0,0,0,0.04)] group cursor-pointer active:scale-[0.98] transition-transform"
              >
                <Foto src={l.img} alt={l.nombre} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {l.tag?.toLowerCase().includes('gratis') && (
                  <span className="absolute top-2.5 right-2.5 bg-primary text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Gratis</span>
                )}
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
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x scroll-pl-container-margin lg:scroll-pl-0" style={{ scrollbarWidth: 'none' }}>
            {eventos.slice(0, 7).map((e) => (
              <div key={e.id} onClick={() => setEventoAbierto(e)} className="min-w-[180px] w-[180px] lg:min-w-[210px] lg:w-[210px] bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start flex flex-col cursor-pointer active:scale-[0.98] transition-transform">
                <div className="relative aspect-square overflow-hidden bg-surface-container-low">
                  <Foto src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full">{e.dia} {e.mes}</span>
                  <h3 className="font-headline-sm text-sm text-on-surface line-clamp-2 mt-0.5">{e.titulo}</h3>
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
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x scroll-pl-container-margin lg:scroll-pl-0" style={{ scrollbarWidth: 'none' }}>
            {eventos.slice(1, 6).map((e, i) => (
              <div key={e.id} onClick={() => setEventoAbierto(e)} className="flex items-end gap-1 shrink-0 snap-start cursor-pointer active:scale-[0.98] transition-transform">
                <span className="font-headline-lg font-black text-primary/25 text-[64px] leading-[0.7] select-none">{i + 1}</span>
                <div className="w-[150px] lg:w-[170px]">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container-low">
                    <Foto src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-label-md text-[10px] text-secondary uppercase tracking-wider mt-2 block">{e.dia} {e.mes} · {e.lugar.split(' ')[0]}</span>
                  <h3 className="font-headline-sm text-[13px] text-on-surface line-clamp-2 leading-tight mt-0.5">{e.titulo}</h3>
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
              {eventos.filter((e) => ['Conciertos', 'Fiestas', 'Ferias'].includes(e.cat)).map((e) => (
                <div key={e.id} onClick={() => setEventoAbierto(e)} className="min-w-[150px] w-[150px] shrink-0 snap-start cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/10">
                    <Foto src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <span className="font-label-md text-[9px] uppercase tracking-wider text-white/70">{e.dia} {e.mes}</span>
                      <h3 className="font-headline-sm text-white text-[12px] leading-tight line-clamp-2">{e.titulo}</h3>
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
                <article
                  key={e.id}
                  onClick={() => setEventoAbierto(e)}
                  className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="relative h-36 overflow-hidden bg-surface-container-low">
                    <Foto src={e.img} alt={`Foto de ${e.titulo}`} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 text-center shadow-sm">
                      <span className="block font-price-lg text-primary text-sm leading-none">{e.dia}</span>
                      <span className="block font-label-md text-[9px] text-secondary uppercase">{e.mes}</span>
                    </div>
                    <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{e.cat}</span>
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="font-headline-sm text-sm text-on-surface line-clamp-1">{e.titulo}</h3>
                    <span className="text-secondary font-label-md text-[11px] flex items-center gap-1 line-clamp-1">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>{e.lugar}
                    </span>
                    <span className="text-secondary/70 font-label-md text-[10px] uppercase tracking-wider">Organiza · {e.organiza}</span>
                    <div className="flex items-center justify-between border-t border-surface-container pt-2.5 mt-2">
                      <span className="font-price-lg text-primary text-sm">{e.precio}</span>
                      <div className="flex items-center gap-2">
                        {e.linkEntradas && <span className="bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">confirmation_number</span>Entradas online</span>}
                        {e.linkPostOriginal && (
                          <a
                            href={e.linkPostOriginal}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                            className="bg-[#f2f3fd] hover:bg-[#e6e7f2] text-[#0058be] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors border border-blue-200"
                            title="Ver publicación o post original"
                          >
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>Post original
                          </a>
                        )}
                        <span className="text-primary font-label-md text-[11px] flex items-center gap-1">Más info<span className="material-symbols-outlined text-[13px]">arrow_forward</span></span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          ¿Organizas un evento en Pucallpa? Publícalo en BogaHub y llega a miles de personas. Escríbenos por WhatsApp.
        </p>
      </main>

      {/* Ficha ampliada del evento */}
      {eventoAbierto && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEventoAbierto(null)}
        >
          <div
            className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl min-h-[92dvh] sm:min-h-0 max-h-[98dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] sm:aspect-[4/3] bg-surface-container-low">
              <Foto src={eventoAbierto.img} alt={eventoAbierto.titulo} className="w-full h-full object-cover" />
              <button
                onClick={() => setEventoAbierto(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <span className="absolute top-3 left-3 bg-white rounded-lg px-2.5 py-1.5 text-center shadow-sm">
                <span className="block font-price-lg text-primary text-base leading-none">{eventoAbierto.dia}</span>
                <span className="block font-label-md text-[10px] text-secondary uppercase">{eventoAbierto.mes}</span>
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{eventoAbierto.cat}</span>
              <h3 className="font-headline-lg text-xl text-on-surface leading-tight">{eventoAbierto.titulo}</h3>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(eventoAbierto.lugar)}`}
                target="_blank"
                rel="noreferrer"
                className="text-secondary font-label-md text-[13px] flex items-center gap-1.5 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {eventoAbierto.lugar}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
              {eventoAbierto.organiza && (
                <span className="text-secondary/70 font-label-md text-[11px] uppercase tracking-wider">Organiza · {eventoAbierto.organiza}</span>
              )}
              {eventoAbierto.descripcion && (
                <p className="text-on-surface font-body-md text-sm leading-relaxed border-t border-surface-container pt-3">
                  {eventoAbierto.descripcion}
                </p>
              )}
              <div className="flex items-center justify-between border-t border-surface-container pt-3 mt-1">
                <span className="font-price-lg text-primary text-lg">{eventoAbierto.precio}</span>
                <button
                  onClick={() => setEventoAbierto(null)}
                  className="bg-primary text-white font-label-md text-sm px-5 py-2.5 rounded-full active:scale-95 transition-transform"
                >
                  Cerrar
                </button>
              </div>
              {eventoAbierto.linkEntradas && (
                <a
                  href={eventoAbierto.linkEntradas}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-primary text-white font-label-md text-sm px-5 py-3 rounded-full active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  Comprar entradas
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              )}
              {eventoAbierto.linkPostOriginal && (
                <a
                  href={eventoAbierto.linkPostOriginal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#f2f3fd] hover:bg-[#e6e7f2] text-[#0058be] border border-[#c2c6d6] font-label-md text-sm px-5 py-3 rounded-full active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  Ver post original
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              )}
              {eventoAbierto.reservable && <ReservaEntrada eventoId={eventoAbierto.id} />}
            </div>
          </div>
        </div>
      )}

      {/* Ficha ampliada del lugar */}
      {lugarAbierto && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setLugarAbierto(null)}
        >
          <div
            className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl min-h-[92dvh] sm:min-h-0 max-h-[98dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] sm:aspect-[4/3] bg-surface-container-low">
              <Foto src={lugarAbierto.img} alt={lugarAbierto.nombre} className="w-full h-full object-cover" />
              <button
                onClick={() => setLugarAbierto(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{lugarAbierto.tag}</span>
              <h3 className="font-headline-lg text-xl text-on-surface leading-tight">{lugarAbierto.nombre}</h3>
              {lugarAbierto.descripcion && (
                <p className="text-on-surface font-body-md text-sm leading-relaxed border-t border-surface-container pt-3">
                  {lugarAbierto.descripcion}
                </p>
              )}
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(lugarAbierto.nombre + ', Pucallpa')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center justify-center gap-1.5 bg-primary text-white font-label-md text-sm px-5 py-2.5 rounded-full active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                Ver en Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
