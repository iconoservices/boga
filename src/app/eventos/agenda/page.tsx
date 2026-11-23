"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchEventos, type Evento, type CategoriaEvento } from '@/lib/eventos';
import ReservaEntrada from '@/components/ReservaEntrada';

const CATEGORIAS: { cat: CategoriaEvento; icon: string }[] = [
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

function AgendaContent() {
  const { cartCount, setIsCartOpen } = useCart();
  const searchParams = useSearchParams();
  const catInicial = searchParams.get('cat') as CategoriaEvento | null;

  const [cat, setCat] = useState<CategoriaEvento | null>(catInicial);
  const [busqueda, setBusqueda] = useState('');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoAbierto, setEventoAbierto] = useState<Evento | null>(null);

  useEffect(() => {
    fetchEventos().then(setEventos);
  }, []);

  useEffect(() => {
    const c = searchParams.get('cat') as CategoriaEvento | null;
    if (c) setCat(c);
  }, [searchParams]);

  const lista = eventos.filter((e) => {
    const matchCat = cat ? e.cat === cat : true;
    if (!matchCat) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return (
      e.titulo.toLowerCase().includes(q) ||
      e.lugar.toLowerCase().includes(q) ||
      (e.organiza && e.organiza.toLowerCase().includes(q)) ||
      (e.descripcion && e.descripcion.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1440px] mx-auto px-container-margin lg:px-6 w-full pt-4 flex flex-col gap-6 pb-16">
        {/* Cabecera con navegación */}
        <div className="flex flex-col gap-3">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Volver a Eventos y Planes</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="font-headline-lg font-black text-2xl sm:text-3xl text-on-surface tracking-tight">
                Toda la agenda de eventos
              </h1>
              <p className="font-body-md text-xs sm:text-sm text-secondary max-w-2xl mt-0.5">
                Cartelera completa de conciertos, festivales, ferias y cultura en Pucallpa y Yarinacocha.
              </p>
            </div>

            {/* Buscador rápido */}
            <div className="relative w-full sm:w-72 shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg">search</span>
              <input
                type="text"
                placeholder="Buscar evento, lugar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-surface-container-highest rounded-full text-xs text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selector de categorías */}
        <section className="flex gap-2 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin lg:mx-0 lg:px-0 pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCat(null)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
              cat === null
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-base">apps</span>
            <span>Todos</span>
            <span className="ml-0.5 text-[10px] opacity-75">({eventos.length})</span>
          </button>
          {CATEGORIAS.map((c) => {
            const active = cat === c.cat;
            const count = eventos.filter((e) => e.cat === c.cat).length;
            return (
              <button
                key={c.cat}
                onClick={() => setCat(active ? null : c.cat)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-base">{c.icon}</span>
                <span>{c.cat}</span>
                {count > 0 && <span className="ml-0.5 text-[10px] opacity-75">({count})</span>}
              </button>
            );
          })}
        </section>

        {/* Grilla completa de eventos */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary font-bold uppercase tracking-wider">
              {cat ? `${cat} · ${lista.length} evento(s)` : `Mostrando todos (${lista.length})`}
            </span>
          </div>

          {lista.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-secondary/50 text-5xl">event_busy</span>
              <p className="text-secondary font-body-md text-sm">No encontramos eventos que coincidan con tu búsqueda.</p>
              {(cat || busqueda) && (
                <button
                  type="button"
                  onClick={() => { setCat(null); setBusqueda(''); }}
                  className="mt-2 text-primary font-bold text-xs hover:underline"
                >
                  Ver todos los eventos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lista.map((e) => (
                <article
                  key={e.id}
                  onClick={() => setEventoAbierto(e)}
                  className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col cursor-pointer active:scale-[0.98] transition-transform group"
                >
                  <div className="relative h-44 overflow-hidden bg-surface-container-low">
                    <Foto src={e.img} alt={`Foto de ${e.titulo}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 bg-white rounded-lg px-2.5 py-1 text-center shadow-md">
                      <span className="block font-black text-primary text-sm leading-none">{e.dia}</span>
                      <span className="block font-bold text-[9px] text-slate-700 uppercase">{e.mes}</span>
                    </div>
                    <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-label-md px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {e.cat}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-1.5 flex-1 justify-between">
                    <div>
                      <h3 className="font-headline-sm font-extrabold text-base text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                        {e.titulo}
                      </h3>
                      <span className="text-secondary font-label-md text-xs flex items-center gap-1 line-clamp-1 mt-1">
                        <span className="material-symbols-outlined text-rose-500 text-[15px] shrink-0">location_on</span>
                        <span className="truncate">{e.lugar}</span>
                      </span>
                      {e.organiza && (
                        <span className="text-secondary/70 font-label-md text-[10px] uppercase tracking-wider block mt-0.5">
                          Organiza · {e.organiza}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-container pt-3 mt-3">
                      <span className="font-price-lg text-primary text-sm font-extrabold">{e.precio}</span>
                      <div className="flex items-center gap-2">
                        {e.linkEntradas && (
                          <span className="bg-primary-fixed text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
                            <span>Entradas online</span>
                          </span>
                        )}
                        {e.linkPostOriginal && (
                          <a
                            href={e.linkPostOriginal}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                            className="bg-[#f2f3fd] hover:bg-[#e6e7f2] text-[#0058be] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors border border-blue-200"
                            title="Ver publicación original"
                          >
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            <span>Post original</span>
                          </a>
                        )}
                        <span className="text-primary font-bold text-xs flex items-center gap-0.5">
                          <span>Más info</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CTA para organizadores */}
        <div className="bg-surface-container-low border border-surface-container-highest rounded-2xl p-6 text-center flex flex-col items-center gap-2 mt-4">
          <span className="material-symbols-outlined text-primary text-3xl">celebration</span>
          <h4 className="font-headline-sm text-base font-bold text-on-surface">¿Organizas un evento o concierto en Pucallpa?</h4>
          <p className="text-xs text-secondary max-w-lg">
            Aparece en la cartelera oficial de BogaHub y llega a miles de personas cada semana.
          </p>
          <a
            href="https://wa.me/51950000000?text=Hola%20BogaHub,%20quiero%20publicar%20un%20evento"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span>Publicar evento por WhatsApp</span>
          </a>
        </div>
      </main>

      {/* Ficha ampliada del evento (Modal) */}
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
                <span className="material-symbols-outlined text-[16px] text-rose-500">location_on</span>
                {eventoAbierto.lugar}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
              {eventoAbierto.organiza && (
                <span className="text-secondary/70 font-label-md text-[11px] uppercase tracking-wider">
                  Organiza · {eventoAbierto.organiza}
                </span>
              )}
              {eventoAbierto.descripcion && (
                <p className="font-body-md text-xs sm:text-sm text-secondary leading-relaxed whitespace-pre-line border-t border-surface-container-highest pt-3">
                  {eventoAbierto.descripcion}
                </p>
              )}

              {/* Reserva o enlaces */}
              {eventoAbierto.reservable && (
                <ReservaEntrada eventoId={eventoAbierto.id} />
              )}

              <div className="flex items-center gap-2 pt-2">
                {eventoAbierto.linkEntradas && (
                  <a
                    href={eventoAbierto.linkEntradas}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-primary hover:bg-primary-container text-white font-label-md text-xs py-2.5 rounded-full text-center active:scale-95 transition-transform"
                  >
                    Comprar entradas
                  </a>
                )}
                {eventoAbierto.linkPostOriginal && (
                  <a
                    href={eventoAbierto.linkPostOriginal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#f2f3fd] hover:bg-[#e6e7f2] text-[#0058be] font-bold text-xs py-2.5 rounded-full text-center border border-blue-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    <span>Ver post original</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-container-lowest flex items-center justify-center text-secondary text-sm">Cargando agenda...</div>}>
      <AgendaContent />
    </Suspense>
  );
}
