'use client';

import React, { useEffect, useState } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { inicialesDe } from '../shared/tokens';
import { useTerrenos, areaDe, precioTerreno, descripcionLimpia } from './useTerrenos';

const SERIF = "'Merriweather', Georgia, 'Times New Roman', serif";

/**
 * Plantilla "Terreno 2": estilo portal de tierras rurales (referencia:
 * LandWatch). Barra oscura translúcida arriba, portada a sangre con título en
 * serif y una barra de búsqueda grande con botón de acento, y luego una grilla
 * de fotos grandes con el precio bien visible. Se consulta por WhatsApp.
 */
export default function TerrenosCampoTemplate({ store }: { store: StoreConfig }) {
  const t = store.theme;
  const c = useTerrenos(store);

  // Corazón de favoritos: se guarda solo en este navegador (sin cuenta).
  const favKey = `terrenos_fav_${store.slug}`;
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(favKey) || '[]')); } catch { /* sin storage: queda vacío */ }
  }, [favKey]);
  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(favKey, JSON.stringify(next)); } catch { /* idem */ }
      return next;
    });
  };
  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ══ PORTADA ══ */}
      <section className="relative w-full min-h-[520px] md:min-h-[540px] flex flex-col">
        <img className="absolute inset-0 w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
        <div className="absolute inset-0 bg-black/45" />

        <header className="relative z-20 flex items-center justify-between gap-4 px-5 md:px-8 py-4" style={{ background: 'rgba(30,25,18,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="flex items-center gap-6 min-w-0">
            <span className="text-white text-xl md:text-2xl font-bold truncate" style={{ fontFamily: SERIF }}>{store.name}</span>
            <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-white/90">
              <a href="#terrenos" className="hover:text-white">Ver terrenos</a>
              <a href="#contacto" className="hover:text-white">Contacto</a>
            </nav>
          </div>
          <button
            onClick={() => c.consultar()}
            className="rounded border border-white text-white px-4 py-2 text-sm font-bold hover:bg-white/10 active:scale-95 transition shrink-0"
          >
            Escríbenos
          </button>
        </header>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-5 md:px-0 md:max-w-[860px] md:mx-auto w-full pb-10">
          <h1 className="text-white text-4xl md:text-5xl font-black leading-tight" style={{ fontFamily: SERIF, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {store.tagline || 'Terrenos en venta'}
          </h1>
          <p className="text-white/90 text-base md:text-lg mt-3 mb-6" style={{ fontFamily: SERIF, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            Lotes, chacras y terrenos con título en {store.zona || 'tu zona'}.
          </p>

          <div className="flex flex-col sm:flex-row rounded overflow-hidden shadow-xl">
            <div className="flex-1 flex items-center gap-3 px-4 py-4" style={{ background: '#e5e5e5' }}>
              <span className="material-symbols-outlined text-[22px] text-neutral-700">search</span>
              <input
                value={c.busqueda}
                onChange={(e) => c.setBusqueda(e.target.value)}
                placeholder="Zona, tamaño o nombre del terreno"
                className="flex-1 bg-transparent outline-none text-base text-neutral-800 placeholder:text-neutral-500"
              />
            </div>
            <a
              href="#terrenos"
              className="px-10 py-4 text-lg font-bold text-white text-center active:opacity-90"
              style={{ background: t.primary }}
            >
              Buscar
            </a>
          </div>

          {c.zonas.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => c.setZona('all')}
                className="rounded px-3 py-1.5 text-xs font-bold text-white border border-white/40"
                style={c.zona === 'all' ? { background: 'rgba(0,0,0,0.65)' } : { background: 'rgba(0,0,0,0.3)' }}
              >
                Todas
              </button>
              {c.zonas.map((z) => (
                <button
                  key={z.id}
                  onClick={() => c.setZona(z.id)}
                  className="rounded px-3 py-1.5 text-xs font-bold text-white border border-white/40"
                  style={c.zona === z.id ? { background: 'rgba(0,0,0,0.65)' } : { background: 'rgba(0,0,0,0.3)' }}
                >
                  {z.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Caja propia bajo la cabecera para que compartir/instalar no tapen el botón de arriba. */}
        <div className="absolute right-0 top-16 w-14 h-28 z-30"><StoreFloatingActions store={store} /></div>
      </section>

      {/* ══ LISTADO ══ */}
      <main id="terrenos" className="max-w-[1200px] mx-auto px-4 md:px-6 pt-10 pb-12 scroll-mt-2">
        <h2 className="text-center text-xl md:text-2xl font-bold mb-6" style={{ fontFamily: SERIF, color: t.onBackground }}>
          Terrenos en venta{c.zona !== 'all' ? ` en ${c.nombreDeZona(c.zona)}` : ''}
        </h2>

        {c.resultados.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: t.onSurfaceVariant }}>No hay terrenos con esos filtros. Escríbenos y te avisamos cuando haya.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {c.resultados.map((p) => (
              <article key={p.id} className="rounded overflow-hidden border flex flex-col shadow-sm bg-white" style={{ borderColor: t.outlineVariant }}>
                {/* Foto con el acceso al mapa abajo a la izquierda */}
                <div className="relative aspect-[16/10]">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  <a
                    href={c.ubicacionUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 left-3 rounded-full border px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.35)' }}
                  >
                    MAPA
                  </a>
                </div>

                <div className="px-4 pt-3.5 pb-4 flex flex-col gap-0.5 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-bold" style={{ color: t.onSurface }}>
                      {precioTerreno(p.price)}{areaDe(p) ? ` • ${areaDe(p)}` : ''}
                    </p>
                    <button
                      onClick={() => toggleFav(p.id)}
                      aria-label={favs.includes(p.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                      className="shrink-0 active:scale-90 transition-transform"
                      style={{ color: favs.includes(p.id) ? '#dc2626' : t.onSurfaceVariant }}
                    >
                      <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: `'FILL' ${favs.includes(p.id) ? 1 : 0}` }}>favorite</span>
                    </button>
                  </div>
                  <p className="text-sm" style={{ color: t.onSurfaceVariant }}>{p.name}</p>
                  <p className="text-sm" style={{ color: t.onSurfaceVariant }}>
                    {[c.nombreDeZona(p.category), store.zona].filter(Boolean).join(', ')}
                  </p>
                  {descripcionLimpia(p) && <p className="text-xs line-clamp-2 mt-0.5" style={{ color: t.onSurfaceVariant }}>{descripcionLimpia(p)}</p>}

                  {/* Pie: quién lo vende + botón, como en el portal de referencia */}
                  <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {store.logoImage ? (
                        <img src={store.logoImage} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
                      ) : (
                        <span className="w-11 h-11 rounded flex items-center justify-center text-sm font-black shrink-0" style={{ background: t.onSurface, color: t.surface }}>{inicialesDe(store.name)}</span>
                      )}
                      <div className="min-w-0 leading-tight">
                        <p className="text-sm font-bold truncate" style={{ color: t.onSurface }}>{store.name}</p>
                        {store.zona && <p className="text-xs truncate" style={{ color: t.onSurfaceVariant }}>{store.zona}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => c.consultar(p)}
                      className="shrink-0 rounded border-2 px-5 py-2 text-sm font-semibold hover:bg-black/5 active:scale-95 transition"
                      style={{ borderColor: t.onSurface, color: t.onSurface }}
                    >
                      Contactar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer id="contacto" className="px-5 py-10 text-center" style={{ background: '#1e1912', color: '#fff' }}>
        <p className="text-xl font-bold" style={{ fontFamily: SERIF }}>{store.name}</p>
        {(store.direccion || store.horario) && (
          <p className="text-sm mt-1 text-white/70">{[store.direccion, store.horario].filter(Boolean).join(' · ')}</p>
        )}
        <button
          onClick={() => c.consultar()}
          className="mt-4 rounded border-2 border-white px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10 active:opacity-90"
        >
          Escríbenos por WhatsApp
        </button>
      </footer>
    </div>
  );
}
