"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-4 flex flex-col gap-8 pb-14">

        {/* Encabezado principal (en móvil va arriba; en desktop con carrusel va en la columna derecha) */}
        <header className={`flex flex-col gap-1 pt-1 ${carrusel.length > 0 ? 'lg:hidden' : ''}`}>
          <h1 className="font-headline-lg font-extrabold text-xl sm:text-2xl text-on-surface tracking-tight leading-tight">
            Agenda y Eventos en Pucallpa
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
            Conciertos, festivales, ferias y cultura en Pucallpa y Yarinacocha.
          </p>
        </header>

        {/* Destacado a la izquierda + categorías a la derecha en escritorio */}
        <div className={carrusel.length > 0 ? 'flex flex-col gap-8 lg:grid lg:grid-cols-[1.25fr_1fr] lg:gap-8 lg:items-center' : 'contents'}>

        {/* Carrusel destacado (lado izquierdo en desktop) con diseño flyer + textos */}
        {carrusel.length > 0 && (
        <section className="w-full">
          <div
            className="relative overflow-hidden rounded-2xl shadow-sm h-[340px] sm:h-auto sm:aspect-[21/9] lg:aspect-auto lg:h-[380px] w-full"
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
                  className="relative w-full h-full shrink-0 bg-slate-950 flex items-center overflow-hidden cursor-pointer group"
                >
                  {/* Fondo difuminado vivo y colorido del mismo flyer */}
                  <img
                    src={c.img}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 brightness-95 saturate-150 pointer-events-none"
                  />
                  {/* Degradado suave para asegurar lectura perfecta del texto en el lado izquierdo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20 pointer-events-none" />

                  {/* 2 Columnas internas: Izquierda textos del evento, Derecha flyer completo */}
                  <div className="relative z-10 w-full h-full flex items-center justify-between p-3.5 sm:p-5 lg:p-6 gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 sm:gap-2.5">
                      {/* Fecha destacada + pill */}
                      <div className="flex items-center gap-2">
                        <div className="bg-white rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 text-center shadow-md shrink-0">
                          <span className="block font-black text-primary text-xs sm:text-sm lg:text-base leading-none">{c.dia}</span>
                          <span className="block font-bold text-[8px] sm:text-[9px] text-slate-700 uppercase leading-none mt-0.5">{c.mes}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase backdrop-blur-xs shadow-xs">
                          <span className="material-symbols-outlined text-[11px] sm:text-[13px]">celebration</span>
                          <span>PRÓXIMO EVENTO</span>
                        </div>
                      </div>

                      {/* Título */}
                      <h2 className="font-extrabold text-white text-base sm:text-lg lg:text-xl leading-tight line-clamp-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                        {c.titulo}
                      </h2>

                      {/* Organizador (si existe y no es redundante) */}
                      {c.organiza && !c.lugar.toLowerCase().startsWith(c.organiza.toLowerCase()) && (
                        <p className="text-white/80 font-medium text-[11px] sm:text-xs line-clamp-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                          {c.organiza}
                        </p>
                      )}

                      {/* Lugar con ícono y precio */}
                      <div className="flex flex-wrap items-center gap-1.5 text-white/95 text-[11px] sm:text-xs drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-rose-400 shrink-0">location_on</span>
                          <span className="line-clamp-1">{c.lugar}</span>
                        </span>
                        {c.precio && (
                          <span className="text-emerald-300 font-bold shrink-0">· {c.precio}</span>
                        )}
                      </div>

                      {/* Botón CTA */}
                      <div className="pt-0.5 sm:pt-1">
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); setEventoAbierto(c); }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-[11px] sm:text-xs group-hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                          <span>Ver evento</span>
                          <span className="material-symbols-outlined text-[13px] sm:text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* Flyer completo a la derecha, sin recortar */}
                    <div className="h-full max-h-full max-w-[42%] sm:max-w-[44%] flex items-center justify-center shrink-0">
                      <img
                        src={c.img}
                        alt={c.titulo}
                        className="h-full w-auto max-h-[92%] object-contain rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
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
                  className="flex w-8 h-8 rounded-full bg-white/90 hover:bg-white items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); next(); }}
                  aria-label="Siguiente"
                  className="flex w-8 h-8 rounded-full bg-white/90 hover:bg-white items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {carrusel.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
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

        {/* Lado derecho en escritorio: Encabezado compacto + Categorías */}
        <div className="flex flex-col gap-4 justify-center">
          {carrusel.length > 0 && (
            <header className="hidden lg:flex flex-col gap-1">
              <h1 className="font-headline-lg font-extrabold text-xl lg:text-2xl text-on-surface tracking-tight leading-tight">
                Agenda y Eventos en Pucallpa
              </h1>
              <p className="font-body-md text-xs text-secondary leading-relaxed">
                Conciertos, festivales, ferias y cultura en Pucallpa y Yarinacocha.
              </p>
            </header>
          )}

          {/* Categorías */}
          <section className="flex flex-col gap-2">
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-1 lg:grid lg:grid-cols-5 lg:gap-x-2 lg:gap-y-3.5 lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              <Link
                href="/eventos/agenda"
                className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] lg:w-auto group"
              >
                <span className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-surface-container-low text-primary group-hover:bg-primary-fixed group-hover:scale-105 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">apps</span>
                </span>
                <span className="font-label-md text-[10px] text-center leading-tight text-secondary group-hover:text-primary">Todos</span>
              </Link>
              {CATEGORIAS.map((c) => (
                <Link
                  key={c.cat}
                  href={`/eventos/agenda?cat=${encodeURIComponent(c.cat)}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] lg:w-auto group"
                >
                  <span className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-surface-container-low text-primary group-hover:bg-primary-fixed group-hover:scale-105 shadow-xs">
                    <span className="material-symbols-outlined text-[24px]">{c.icon}</span>
                  </span>
                  <span className="font-label-md text-[10px] text-center leading-tight text-secondary group-hover:text-primary">{c.cat}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        </div>

        {/* Lugares para ir cualquier día (Gratis) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-headline-lg text-on-surface">Lugares para ir cualquier día (Gratis) 🌴</h2>
              <p className="text-secondary font-body-md text-xs mt-0.5">Sitios turísticos y paseos de acceso libre para conocer cualquier día del año</p>
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
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-headline-lg text-on-surface">Planes imperdibles 🔥</h2>
              <p className="text-secondary font-body-md text-xs mt-0.5">Los eventos destacados y recomendados de la ciudad</p>
            </div>
            <Link
              href="/eventos/agenda"
              className="text-primary font-bold text-xs hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>Ver toda la agenda</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-2 snap-x scroll-pl-container-margin lg:scroll-pl-0" style={{ scrollbarWidth: 'none' }}>
            {eventos.map((e) => (
              <div key={e.id} onClick={() => setEventoAbierto(e)} className="min-w-[180px] w-[180px] lg:min-w-[210px] lg:w-[210px] bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start flex flex-col cursor-pointer active:scale-[0.98] transition-transform">
                <div className="relative aspect-square overflow-hidden bg-surface-container-low">
                  <Foto src={e.img} alt={e.titulo} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full">{e.dia} {e.mes}</span>
                  <h3 className="font-headline-sm text-sm leading-tight text-on-surface line-clamp-2 min-h-[2.1rem]">{e.titulo}</h3>
                  <span className="text-secondary font-label-md text-[11px] flex items-start gap-1">
                    <span className="material-symbols-outlined text-[13px] shrink-0 mt-px">location_on</span>
                    <span className="line-clamp-2 leading-tight">{e.lugar}</span>
                  </span>
                  <div className="flex flex-col gap-1.5 mt-auto pt-1.5 border-t border-surface-container-highest">
                    <span className="font-price-lg text-primary text-[12px] leading-snug line-clamp-3">{e.precio}</span>
                    {e.linkPostOriginal && (
                      <a
                        href={e.linkPostOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        className="self-start bg-[#f2f3fd] hover:bg-[#e6e7f2] text-[#0058be] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors border border-blue-200"
                        title="Ver post original"
                      >
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>Post
                      </a>
                    )}
                  </div>
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
              <Link
                href="/eventos/agenda?cat=Fiestas"
                className="mt-4 bg-white text-on-surface font-label-md text-[12px] px-4 py-2 rounded-full active:scale-95 transition-transform inline-block w-fit"
              >
                Ver todas las fiestas
              </Link>
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

        {/* Banner CTA a Toda la agenda */}
        <section className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <span className="text-[11px] uppercase font-extrabold tracking-wider text-white/80">Cartelera completa</span>
            <h3 className="font-headline-lg font-extrabold text-xl sm:text-2xl leading-tight">¿Buscas más eventos y actividades?</h3>
            <p className="text-white/90 text-xs sm:text-sm max-w-xl">
              Descubre conciertos, festivales, ferias, deportes y cultura en Pucallpa y Yarinacocha en un solo lugar.
            </p>
          </div>
          <Link
            href="/eventos/agenda"
            className="bg-white text-primary hover:bg-white/95 font-black text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg active:scale-95 transition-transform shrink-0 flex items-center gap-1.5"
          >
            <span>Ver toda la agenda</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </section>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-1">
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
                  className="bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-md text-sm px-5 py-2.5 rounded-full active:scale-95 transition-colors"
                >
                  Cerrar
                </button>
              </div>
              {eventoAbierto.linkEntradas && (
                <a
                  href={eventoAbierto.linkEntradas}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-primary text-white font-label-md text-sm px-5 py-3 rounded-full active:scale-95 transition-transform font-bold shadow-md"
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
                  className="flex items-center justify-center gap-2 bg-[#0058be] hover:bg-[#0047a0] text-white font-label-md text-sm px-5 py-3 rounded-full active:scale-95 transition-all font-bold shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Ver publicación original
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
