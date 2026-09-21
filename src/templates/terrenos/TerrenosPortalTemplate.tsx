'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { useTerrenos, areaDe, precioTerreno } from './useTerrenos';

/**
 * Plantilla "Terreno 1": estilo inmobiliaria moderna (referencia: Los
 * Portales). Cabecera blanca redondeada que flota sobre la portada, buscador
 * en una tarjeta que se monta sobre el borde de la foto, y listado en tarjetas
 * limpias con la zona como etiqueta. Se consulta por WhatsApp.
 */
export default function TerrenosPortalTemplate({ store }: { store: StoreConfig }) {
  const t = store.theme;
  const c = useTerrenos(store);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cabecera con animación: se esconde hacia arriba al bajar y reaparece al subir.
  const [cabeceraVisible, setCabeceraVisible] = useState(true);
  const ultimoY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const baja = y > ultimoY.current;
      // Pequeña tolerancia para que un temblor del dedo no la parpadee.
      if (Math.abs(y - ultimoY.current) > 6) {
        setCabeceraVisible(!baja || y < 80);
        ultimoY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const irA = (id: string) => {
    setMenuAbierto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ══ PORTADA + CABECERA FLOTANTE ══ */}
      <section className="relative w-full h-[46vh] min-h-[320px] md:h-[440px]">
        <img className="absolute inset-0 w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />

        <header
          className="fixed top-3 left-3 right-3 md:left-8 md:right-8 z-40 flex items-center justify-between gap-3 rounded-[20px] px-4 md:px-7 py-3 shadow-lg transition-transform duration-300 ease-out"
          style={{ background: t.surface, transform: cabeceraVisible ? 'translateY(0)' : 'translateY(-140%)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {store.logoImage ? (
              <img src={store.logoImage} alt={store.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
            ) : (
              <span className="material-symbols-outlined text-[28px] shrink-0" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>landscape</span>
            )}
            <span className="font-extrabold text-base md:text-lg truncate" style={{ color: t.onSurface }}>{store.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold" style={{ color: t.onSurface }}>
            <a href="#terrenos" className="hover:opacity-70">Terrenos en venta</a>
            <a href="#contacto" className="hover:opacity-70">Contacto</a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => c.consultar()}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold active:scale-95 transition-transform"
              style={{ border: `2px solid ${t.onSurface}`, color: t.onSurface }}
              aria-label="WhatsApp"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={() => setMenuAbierto(true)}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold active:scale-95 transition-transform"
              style={{ background: t.onSurface, color: t.surface }}
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
              Menú
            </button>
          </div>
        </header>

        <div className="absolute left-5 md:left-16 bottom-24 md:bottom-28 z-10 max-w-[560px] pr-5">
          <h1 className="font-black text-3xl md:text-5xl leading-[1.05] text-white drop-shadow-lg">{store.tagline || 'Tu terreno, con título y papeles al día'}</h1>
        </div>
        {/* Caja propia bajo la cabecera para que compartir/instalar no tapen el botón de arriba. */}
        <div className="absolute right-0 top-16 w-14 h-28 z-30"><StoreFloatingActions store={store} /></div>
      </section>

      {/* ══ BUSCADOR — tarjeta montada sobre el borde de la portada ══ */}
      <section className="relative z-20 -mt-14 md:-mt-16 px-4 md:px-0">
        <div className="max-w-[860px] mx-auto rounded-[28px] shadow-xl px-5 md:px-10 py-6 md:py-8 text-center" style={{ background: t.surface }}>
          <h2 className="font-extrabold text-lg md:text-2xl mb-4" style={{ color: t.onSurface }}>¿En qué zona buscas tu terreno?</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 rounded-xl border" style={{ borderColor: t.outlineVariant }}>
              <span className="material-symbols-outlined text-[22px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>location_on</span>
              <select
                value={c.zona}
                onChange={(e) => c.setZona(e.target.value)}
                className="flex-1 bg-transparent outline-none py-3.5 text-sm font-medium"
                style={{ color: t.onSurface }}
                aria-label="Zona"
              >
                <option value="all">Todas las zonas</option>
                {c.zonas.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </div>
            <a
              href="#terrenos"
              className="rounded-xl px-8 py-3.5 font-extrabold text-sm flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: t.primary, color: t.onPrimary }}
            >
              Buscar
            </a>
          </div>
        </div>
      </section>

      {/* ══ LISTADO ══ */}
      <main id="terrenos" className="max-w-[1100px] mx-auto px-4 md:px-6 pt-10 pb-12 scroll-mt-4">
        <div className="flex items-end justify-between mb-5 gap-3">
          <h2 className="font-black text-xl md:text-3xl" style={{ color: t.onBackground }}>Terrenos en venta</h2>
          <span className="text-sm font-semibold shrink-0" style={{ color: t.onSurfaceVariant }}>{c.resultados.length} disponibles</span>
        </div>

        {c.resultados.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: t.onSurfaceVariant }}>No hay terrenos en esta zona por ahora. Escríbenos y te avisamos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {c.resultados.map((p) => (
              <article
                key={p.id}
                className="group rounded-[28px] overflow-hidden flex flex-col shadow-md hover:shadow-xl transition-shadow"
                style={{ background: t.surface }}
              >
                {/* Foto: en pantallas con mouse se encoge al pasar por encima para dejar ver el botón. */}
                <div className="relative overflow-hidden h-[300px] transition-all duration-300 [@media(hover:hover)]:group-hover:h-[190px]">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
                  <span className="absolute top-4 left-4 text-white font-extrabold text-sm tracking-wide drop-shadow truncate max-w-[55%]">{store.name}</span>
                  {areaDe(p) && (
                    <span className="absolute top-4 right-4 rounded-xl px-3.5 py-2 text-xs font-extrabold" style={{ background: t.onSurface, color: t.surface }}>{areaDe(p)}</span>
                  )}
                </div>

                <div className="px-5 pt-4 pb-5 flex flex-col items-center text-center gap-1 flex-1">
                  <h3 className="font-black text-xl uppercase tracking-wide" style={{ color: t.onSurface }}>{c.nombreDeZona(p.category) || 'Terreno'}</h3>
                  <p className="text-sm" style={{ color: t.onSurfaceVariant }}>{p.name}</p>

                  {p.desc && (
                    <div className="w-full mt-3 rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: t.surfaceContainer, color: t.onSurface }}>
                      <span className="material-symbols-outlined text-[20px] shrink-0" style={{ color: t.primary }}>square_foot</span>
                      <span className="line-clamp-2">{p.desc}</span>
                    </div>
                  )}

                  <p className="mt-3 text-xl font-bold" style={{ color: t.onSurface }}>Desde {precioTerreno(p.price)}</p>

                  {/* Botón: siempre visible en celular; en escritorio aparece al pasar el mouse. */}
                  <div className="w-full overflow-hidden transition-all duration-300 max-h-16 [@media(hover:hover)]:max-h-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:max-h-16 [@media(hover:hover)]:group-hover:opacity-100">
                    <button
                      onClick={() => c.consultar(p)}
                      className="mt-3 rounded-full px-8 py-3 text-sm font-extrabold inline-flex items-center gap-2 active:scale-95 transition-transform"
                      style={{ background: t.primary, color: t.onPrimary }}
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      Consultar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* ══ MENÚ LATERAL — se abre desde el botón "Menú" de la cabecera ══ */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${menuAbierto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!menuAbierto}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAbierto(false)} />
        <aside
          className={`absolute right-0 top-0 h-full w-[min(420px,88vw)] flex flex-col px-7 py-7 overflow-y-auto transition-transform duration-300 ${menuAbierto ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ background: t.onSurface, color: '#fff' }}
        >
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-2.5 min-w-0">
              {store.logoImage ? (
                <img src={store.logoImage} alt={store.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="material-symbols-outlined text-[34px] shrink-0" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>landscape</span>
              )}
              <span className="font-extrabold text-xl leading-tight">{store.name}</span>
            </div>
            <button
              onClick={() => setMenuAbierto(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ border: `2px solid ${t.primary}`, color: t.primary }}
              aria-label="Cerrar menú"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <button
            onClick={() => { c.setZona('all'); irA('terrenos'); }}
            className="w-full flex items-center gap-3 rounded-full px-3 py-2.5 mb-6 text-left font-bold"
            style={{ border: `2px solid ${t.primary}` }}
          >
            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>sell</span>
            </span>
            Terrenos en venta
          </button>

          <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Zonas</p>
          <nav className="flex flex-col">
            {c.zonas.map((z) => (
              <button
                key={z.id}
                onClick={() => { c.setZona(z.id); irA('terrenos'); }}
                className="text-left py-3 text-lg font-medium text-white/90 hover:text-white border-b border-white/10"
              >
                {z.label}
              </button>
            ))}
            <button
              onClick={() => { setMenuAbierto(false); c.consultar(); }}
              className="text-left py-3 text-lg font-medium text-white/90 hover:text-white border-b border-white/10"
            >
              Vende tu terreno
            </button>
            <button onClick={() => irA('contacto')} className="text-left py-3 text-lg font-medium text-white/90 hover:text-white">
              Contacto
            </button>
          </nav>

          <div className="mt-auto pt-8 flex flex-wrap gap-3">
            <button
              onClick={() => { setMenuAbierto(false); c.consultar(); }}
              className="flex-1 min-w-[150px] rounded-full px-5 py-3.5 font-extrabold flex items-center justify-center gap-2"
              style={{ background: t.primary, color: t.onPrimary }}
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              WhatsApp
            </button>
          </div>
          {(store.direccion || store.horario) && (
            <p className="mt-4 text-xs text-white/60">{[store.direccion, store.horario].filter(Boolean).join(' · ')}</p>
          )}
        </aside>
      </div>

      <footer id="contacto" className="px-5 py-10 text-center border-t" style={{ borderColor: `${t.outlineVariant}80`, background: t.surface }}>
        <p className="font-extrabold" style={{ color: t.onSurface }}>{store.name}</p>
        {(store.direccion || store.horario) && (
          <p className="text-sm mt-1" style={{ color: t.onSurfaceVariant }}>{[store.direccion, store.horario].filter(Boolean).join(' · ')}</p>
        )}
        <button
          onClick={() => c.consultar()}
          className="mt-4 rounded-full px-6 py-2.5 text-sm font-extrabold active:scale-95 transition-transform"
          style={{ background: t.primary, color: t.onPrimary }}
        >
          Escríbenos por WhatsApp
        </button>
      </footer>
    </div>
  );
}
