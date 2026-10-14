'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import { useCicloFotos } from '../shared/useCicloFotos';
import { soles, soloConsulta, type Producto } from '../shared/tokens';
import { porcentajeOferta } from '@/lib/ofertas';
import { AddedToast } from '../shared/AddFeedback';
import { BotonFavorito, ProductModal, CartPanel, ContactPanel } from '../shared/CatalogoUI';
import IconoWhatsApp from '../shared/IconoWhatsApp';
import CustomerAccountButton from '@/components/CustomerAccountButton';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

type Filtro = 'all' | 'promos' | 'novedad';

/** Portada de fábrica de la plantilla: solo se muestra en la vista previa; una tienda real sin banner propio no la muestra. */
export const PORTADA_DELVA = 'https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?w=1600&q=80';

const SEMANA = 7 * 24 * 60 * 60 * 1000;
const esNuevo = (p: Producto) => !!p.creado && Date.now() - new Date(p.creado).getTime() < SEMANA;
const enOferta = (p: Producto) => !!p.priceAnterior && p.priceAnterior > p.price;
const sinAcentos = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ════════════════════════════════════════════
   TARJETA (la de Delva: foto cuadrada, título en mayúsculas, Antes/Oferta y botón negro COMPRAR)
   ════════════════════════════════════════════ */

function Tarjeta({ p, onSelect, onAdd }: { p: Producto; onSelect: (p: Producto) => void; onAdd: (p: Producto) => void }) {
  const fotos = p.images && p.images.length > 1 ? p.images : [p.image];
  const { ref: refFoto, activa, rotando, handlers } = useCicloFotos(fotos.length, 2500);
  const [ok, setOk] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const oferta = enOferta(p) && !p.sinPrecio;
  const desde = !!p.presentaciones?.length;
  const consultar = soloConsulta(p);

  return (
    <div
      className="dv-pc"
      onClick={() => onSelect(p)}
    >
      <div className="dv-pc-media" ref={refFoto} {...handlers}>
        {fotos.map((src, i) => (
          <img key={i} src={src} alt={p.name} loading="lazy" className="dv-pc-img" style={{ opacity: activa === i ? 1 : 0 }} />
        ))}
        {fotos.length > 1 && rotando && (
          <div className="dv-pc-progress">
            {fotos.map((_, i) => <div key={i} style={{ flex: 1, background: i === activa ? '#fff' : 'transparent' }} />)}
          </div>
        )}
        {(p.esCombo || esNuevo(p)) && (
          <div className="dv-pc-badges">
            {p.esCombo && <span className="dv-pc-badge dv-pc-badge-combo">Combo</span>}
            {esNuevo(p) && <span className="dv-pc-badge">Nuevo</span>}
          </div>
        )}
        <BotonFavorito producto={p} className="absolute top-2 right-2 z-10" />
      </div>

      <div className="dv-pc-body">
        {oferta && <span className="dv-pc-discount">{porcentajeOferta(p.priceAnterior!, p.price)}</span>}
        <h4 className="dv-pc-title">{p.name}</h4>
        <div className="dv-pc-divider" />
        <div className="dv-pc-prices">
          {p.sinPrecio ? (
            <div className="dv-pc-regular dv-pc-consulta">Consultar precio</div>
          ) : oferta ? (
            <>
              <div className="dv-pc-old">Antes <s>{soles(p.priceAnterior!)}</s></div>
              <div className="dv-pc-offer">Oferta {soles(p.price)}</div>
            </>
          ) : (
            <div className="dv-pc-regular">{desde && <span className="dv-pc-desde">Desde </span>}{soles(p.price)}</div>
          )}
        </div>
        <button
          type="button"
          className={`dv-pc-buy ${consultar ? 'dv-pc-buy-consulta' : ''} ${ok ? 'dv-pc-buy-ok' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            // Un servicio, un producto sin precio o uno con medidas se resuelve en su ficha.
            if (consultar || desde) { onSelect(p); return; }
            onAdd(p);
            setOk(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setOk(false), 1000);
          }}
        >
          {ok ? '✓ Agregado' : consultar ? 'Consultar' : desde ? 'Elegir' : 'Comprar'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CARRUSEL DE PRODUCTOS (avanza solo, se pausa al tocarlo; flechas solo con mouse)
   ════════════════════════════════════════════ */

function Carrusel({ children, intervalo = 3500 }: { children: React.ReactNode; intervalo?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const pausaHasta = useRef(0);
  const [desliza, setDesliza] = useState(false);

  const ir = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const primero = el.firstElementChild as HTMLElement | null;
    const paso = primero ? primero.offsetWidth + 12 : el.clientWidth * 0.8;
    const alFinal = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && alFinal) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir === -1 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: dir * paso, behavior: 'smooth' });
  };
  const pausa = (ms = 6000) => { pausaHasta.current = Date.now() + ms; };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setDesliza(el.scrollWidth > el.clientWidth + 4);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    if (!desliza) return;
    const id = setInterval(() => {
      if (Date.now() < pausaHasta.current || document.hidden || document.querySelector('[role="dialog"]')) return;
      ir(1);
    }, intervalo);
    return () => clearInterval(id);
  }, [desliza, intervalo]);

  return (
    <div className="dv-pcar" onMouseEnter={() => pausa(60000)} onMouseLeave={() => pausa(1500)} onTouchStart={() => pausa()} onWheel={() => pausa()}>
      <div className="dv-pcar-track" ref={ref} onPointerDown={() => pausa()}>{children}</div>
      {desliza && (
        <>
          <button className="dv-pcar-arrow dv-pcar-prev" aria-label="Anterior" onClick={() => { pausa(); ir(-1); }}>‹</button>
          <button className="dv-pcar-arrow dv-pcar-next" aria-label="Siguiente" onClick={() => { pausa(); ir(1); }}>›</button>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   BANNER GRANDE (portada de la tienda + sus ofertas, con degradado verde y puntos)
   ════════════════════════════════════════════ */

interface Slide { key: string; img: string; tag: string; titulo: string; sub: string; limpio?: boolean; onClick?: () => void }

function Banner({ slides }: { slides: Slide[] }) {
  const [actual, setActual] = useState(0);
  const pausa = useRef(false);
  const toqueX = useRef(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => { if (!pausa.current) setActual((i) => (i + 1) % slides.length); }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);
  useEffect(() => { if (actual >= slides.length) setActual(0); }, [actual, slides.length]);

  const ir = (d: number) => setActual((i) => (i + d + slides.length) % slides.length);

  return (
    <div
      className="dv-hero"
      onMouseEnter={() => { pausa.current = true; }}
      onMouseLeave={() => { pausa.current = false; }}
      onTouchStart={(e) => { toqueX.current = e.touches[0].clientX; pausa.current = true; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - toqueX.current;
        if (dx < -40) ir(1); else if (dx > 40) ir(-1);
        pausa.current = false;
      }}
    >
      {slides.map((s, i) => (
        <div
          key={s.key}
          className="dv-hero-slide"
          style={{ opacity: i === actual ? 1 : 0, transform: i === actual ? 'scale(1)' : 'scale(1.04)', pointerEvents: i === actual ? 'auto' : 'none' }}
          onClick={s.onClick}
        >
          <img src={s.img} alt="" className="dv-hero-img" />
          {!s.limpio && (
            <>
              <div className="dv-hero-shade" />
              <div className="dv-hero-text">
                <span className="dv-hero-tag">{s.tag}</span>
                <h2>{s.titulo}</h2>
                {s.sub && <p>{s.sub}</p>}
              </div>
            </>
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button className="dv-hero-arrow dv-hero-prev" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }}>‹</button>
          <button className="dv-hero-arrow dv-hero-next" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); ir(1); }}>›</button>
          <div className="dv-hero-dots">
            {slides.map((s, i) => (
              <button key={s.key} aria-label={`Banner ${i + 1}`} onClick={(e) => { e.stopPropagation(); setActual(i); }} className={i === actual ? 'on' : ''} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Plantilla "Delva": el diseño de la tienda Delva (delvape.vercel.app) como plantilla de BogaHub.
 *
 *  · Cabecera fija y blanca con logo + nombre en mayúsculas, lupa y botón redondo de WhatsApp.
 *  · Cinta de avisos que corre, banner grande de borde a borde, chips Promos / Novedad y categorías.
 *  · INICIO: Destacados, Promos, Novedades y una fila por categoría (carruseles que avanzan solos), y "Ver toda la tienda".
 *  · TIENDA: buscador, categorías y la grilla completa.
 *  · Tarjeta Delva: foto cuadrada, título en mayúsculas, "Antes / Oferta" en rojo y botón negro COMPRAR.
 *  · Barra inferior flotante con emojis (solo en el celular).
 * Comparte motor (catálogo, carrito, WhatsApp, ofertas, medidas, otras monedas, favoritos) con las demás plantillas.
 */
export default function DelvaTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);
  const [tab, setTab] = useTabRuta(store.slug, 'home', initialTab);
  const [filtro, setFiltro] = useState<Filtro>('all');
  const [busqueda, setBusqueda] = useState('');
  const [lupa, setLupa] = useState(false);
  const lupaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (lupa) lupaRef.current?.focus(); }, [lupa]);

  const ir = (nueva: string, categoria = 'all') => {
    setTab(nueva);
    c.setActiveCategory(categoria);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categorias = c.categoryTabs.filter((x) => x.id !== 'all' && x.id !== '__combos__');
  const nombreCategoria = (id: string) => c.categoryTabs.find((x) => x.id === id)?.label ?? '';
  const q = sinAcentos(busqueda.trim());
  const coincide = (p: Producto) => !q || sinAcentos(`${p.name} ${p.desc} ${nombreCategoria(p.category)}`).includes(q);

  const ofertas = c.combosYOfertas ?? [];
  const nuevos = (c.products.some((p) => p.creado)
    ? [...c.products].filter((p) => p.creado).sort((a, b) => String(b.creado).localeCompare(String(a.creado)))
    : [...c.products].reverse()
  ).slice(0, 10);

  // Con un chip (Promos / Novedad), una búsqueda o una categoría, el inicio pasa a una sola grilla de resultados (como en Delva).
  const enResultados = filtro !== 'all' || !!q || c.activeCategory !== 'all';
  const resultados = (filtro === 'promos' ? ofertas : filtro === 'novedad' ? c.products.filter(esNuevo) : c.filtered).filter(
    (p) => coincide(p) && (c.activeCategory === 'all' || p.category === c.activeCategory),
  );
  const tituloResultados = filtro === 'promos' ? '🔥 Promos' : filtro === 'novedad' ? '✨ Lo más nuevo' : q ? `Resultados para «${busqueda.trim()}»` : nombreCategoria(c.activeCategory) || 'Resultados';

  const sugerencias = q ? c.products.filter(coincide) : [];

  const hayPortada = !!store.heroImage && (store.heroImage !== PORTADA_DELVA || store.demoDePlantilla);
  const slides: Slide[] = [
    ...(hayPortada
      ? [{ key: 'portada', img: store.heroImage, tag: 'DESTACADO', titulo: store.name, sub: store.tagline, limpio: store.hideHeroText, onClick: () => ir('tienda') }]
      : []),
    ...ofertas.slice(0, 3).map((p) => ({
      key: `of-${p.id}`,
      img: p.image,
      tag: p.esCombo ? '🔥 COMBO' : `OFERTA ${porcentajeOferta(p.priceAnterior ?? p.price, p.price)}`.trim(),
      titulo: p.name,
      sub: p.priceAnterior && p.priceAnterior > p.price ? `Antes ${soles(p.priceAnterior)} · Ahora ${soles(p.price)}` : soles(p.price),
      onClick: () => c.abrirProducto(p),
    })),
  ];

  const avisos = [
    store.tagline ? `🌿 ${store.tagline.toUpperCase()}` : `🌿 ${store.name.toUpperCase()}`,
    ...(store.whatsapp ? ['💬 COMPRA FÁCIL POR WHATSAPP'] : []),
    ...(ofertas.length ? ['🔥 PROMOS TODA LA SEMANA'] : []),
    ...(store.entrega === 'recojo' ? ['🏪 RECOGE EN TIENDA'] : ['🛵 DELIVERY A TU CASA']),
    '✨ NUEVOS INGRESOS',
  ];

  const consultarWa = () => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, me gustaría hacer una consulta.`);

  const grilla = (lista: Producto[]) =>
    lista.length === 0 ? (
      <div className="dv-vacio">
        <p>No hay productos por aquí todavía.</p>
        <button onClick={() => { setFiltro('all'); setBusqueda(''); c.setActiveCategory('all'); }}>Ver todo</button>
      </div>
    ) : (
      <div className="dv-grid">
        {lista.map((p) => <Tarjeta key={p.id} p={p} onSelect={c.abrirProducto} onAdd={c.addToCart} />)}
      </div>
    );

  const seccion = (id: string, titulo: string, lista: Producto[], verTodo: () => void) =>
    lista.length > 0 && (
      <section key={id} className="dv-section">
        <div className="dv-section-head">
          <h3 className="dv-section-title">{titulo}</h3>
          <button className="dv-section-link" onClick={verTodo}>Ver todo →</button>
        </div>
        <Carrusel>
          {lista.map((p) => (
            <div key={p.id} className="dv-pcar-item"><Tarjeta p={p} onSelect={c.abrirProducto} onAdd={c.addToCart} /></div>
          ))}
        </Carrusel>
      </section>
    );

  const chipsCategoria = categorias.length > 0 && (
    <div className="dv-cat-chips dv-solo-movil">
      <button className={`dv-cat-chip ${c.activeCategory === 'all' ? 'on' : ''}`} onClick={() => c.setActiveCategory('all')}>Todo</button>
      {categorias.map((cat) => (
        <button key={cat.id} className={`dv-cat-chip ${c.activeCategory === cat.id ? 'on' : ''}`} onClick={() => c.setActiveCategory(c.activeCategory === cat.id ? 'all' : cat.id)}>
          {cat.label}
        </button>
      ))}
    </div>
  );

  const filtrosRapidos = ([
    { id: 'promos', label: 'Promos', icon: '🔥', color: '#E91E63', hay: ofertas.length > 0 },
    { id: 'novedad', label: 'Novedad', icon: '✨', color: '#00A651', hay: c.products.some(esNuevo) },
  ] as const).filter((f) => f.hay);

  const chipFiltro = (f: (typeof filtrosRapidos)[number]) => (
    <button
      key={f.id}
      className={`dv-filter-chip ${filtro === f.id ? 'on' : ''}`}
      style={{ '--c': f.color } as React.CSSProperties}
      onClick={() => { setFiltro(filtro === f.id ? 'all' : f.id); if (tab !== 'home') ir('home'); }}
    >
      <span className="dv-filter-chip-icon">{f.icon}</span>
      {f.label}
      {filtro === f.id && <span className="dv-filter-chip-x">✕</span>}
    </button>
  );

  // Barra lateral de escritorio (como Delva en la computadora): filtros, categorías y WhatsApp a la mano.
  const barraLateral = (
    <aside className="dv-side">
      {filtrosRapidos.length > 0 && (
        <>
          <p className="dv-side-label">Explora</p>
          <div className="dv-side-filtros">{filtrosRapidos.map(chipFiltro)}</div>
        </>
      )}
      {categorias.length > 0 && (
        <>
          <p className="dv-side-label">Categorías</p>
          <div className="dv-side-cats">
            {[{ id: 'all', label: 'Todo' }, ...categorias].map((cat) => {
              const n = cat.id === 'all' ? c.products.length : c.products.filter((p) => p.category === cat.id).length;
              return (
                <button key={cat.id} className={c.activeCategory === cat.id ? 'on' : ''} onClick={() => { c.setActiveCategory(cat.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <span>{cat.label}</span><span className="dv-side-n">{n}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {(c.whatsappVisible || store.demoDePlantilla) && (
        <div className="dv-side-wa">
          <p className="dv-side-wa-t">¿Tienes dudas?</p>
          <p className="dv-side-wa-s">Escríbenos y te ayudamos con tu pedido.</p>
          <button onClick={consultarWa}><IconoWhatsApp className="w-[18px] h-[18px]" /> Escríbenos</button>
        </div>
      )}
    </aside>
  );

  const TABS = [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'tienda', label: 'Tienda', icon: '🛍️' },
    { id: 'pedidos', label: 'Carrito', icon: '🛒' },
    { id: 'contacto', label: 'Contacto', icon: '💬' },
  ];

  const estilo = {
    '--dv-primary': t.primary,
    '--dv-secondary': t.secondary,
    '--dv-on-primary': t.onPrimary,
    '--dv-ink': t.onSurface,
    '--dv-ink-soft': t.onSurfaceVariant,
    '--dv-line': `${t.outlineVariant}`,
    '--dv-chip': t.surfaceContainer,
    '--dv-bg': t.background,
    '--dv-font': t.fontBody,
    '--dv-font-head': t.fontHeadline,
  } as React.CSSProperties;

  return (
    <div className="dv" style={estilo}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{CSS}</style>

      {/* ─── CABECERA ─── */}
      <nav className="dv-navbar">
        <button className="dv-logo" onClick={() => { setFiltro('all'); setBusqueda(''); ir('home'); }}>
          {store.logoImage ? <img src={store.logoImage} alt="" className="dv-logo-img" /> : <span className="dv-logo-ini">{store.name[0]}</span>}
          <span className="dv-wordmark">{store.name}</span>
        </button>

        <div className="dv-nav-tabs">
          {TABS.map((x) => (
            <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => ir(x.id)}>
              {x.label}{x.id === 'pedidos' && c.cartCount > 0 && <span className="dv-badge dv-badge-inline">{c.cartCount}</span>}
            </button>
          ))}
        </div>

        <div className="dv-nav-actions">
          <button className="dv-icon-btn" aria-label="Buscar" onClick={() => setLupa((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
          <CustomerAccountButton variant="encabezado" color={t.onSurface} background={t.surfaceContainer} />
          {(c.whatsappVisible || store.demoDePlantilla) && (
            <button className="dv-wa-btn" aria-label="WhatsApp" onClick={consultarWa}>
              <IconoWhatsApp className="w-[18px] h-[18px]" />
              WhatsApp
            </button>
          )}
        </div>
      </nav>

      {/* ─── LUPA: buscador debajo de la cabecera, con resultados al vuelo ─── */}
      {lupa && (
        <>
          <div className="dv-search-backdrop" onClick={() => setLupa(false)} />
          <form
            className="dv-search"
            onSubmit={(e) => { e.preventDefault(); setLupa(false); setFiltro('all'); ir('tienda'); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setLupa(false); }}
          >
            <div className="dv-search-bar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input ref={lupaRef} className="dv-search-input" placeholder={`Buscar en ${store.name}...`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <button type="button" className="dv-search-close" aria-label="Cerrar" onClick={() => { setBusqueda(''); setLupa(false); }}>✕</button>
            </div>
            {q && (
              <div className="dv-search-results">
                {sugerencias.length === 0 ? (
                  <p className="dv-nsr-empty">Sin resultados para “{busqueda.trim()}”</p>
                ) : (
                  <>
                    {sugerencias.slice(0, 6).map((p) => (
                      <button type="button" key={p.id} className="dv-nsr-item" onClick={() => { setLupa(false); c.abrirProducto(p); }}>
                        <img src={p.image} alt="" />
                        <span className="dv-nsr-title">{p.name}</span>
                        {!p.sinPrecio && <span className="dv-nsr-price">{soles(p.price)}</span>}
                      </button>
                    ))}
                    <button type="submit" className="dv-nsr-all">Ver los {sugerencias.length} resultado{sugerencias.length === 1 ? '' : 's'} →</button>
                  </>
                )}
              </div>
            )}
          </form>
        </>
      )}

      <main className="dv-main">
        {(tab === 'home' || tab === 'tienda') && (
        <div className="dv-layout">
        {barraLateral}
        <div className="dv-col">
        {/* ─── INICIO ─── */}
        {tab === 'home' && (
          <div className="animate-fade-in">
            <div className="dv-announce" aria-label="Avisos">
              <div className="dv-announce-track">
                {[0, 1].map((copia) => (
                  <div className="dv-announce-group" key={copia} aria-hidden={copia === 1}>
                    {avisos.map((m) => <span key={m} className="dv-announce-item">{m}</span>)}
                  </div>
                ))}
              </div>
            </div>

            {slides.length > 0 && (
              <div className="dv-hero-wrap relative">
                <Banner slides={slides} />
                <StoreFloatingActions store={store} />
              </div>
            )}

            {filtrosRapidos.length > 0 && <div className="dv-filter-chips dv-solo-movil">{filtrosRapidos.map(chipFiltro)}</div>}
            {chipsCategoria}

            {q && (
              <div className="dv-search-active">
                <span>Buscando: <b>{busqueda.trim()}</b></span>
                <button aria-label="Quitar búsqueda" onClick={() => setBusqueda('')}>✕</button>
              </div>
            )}

            {c.cargando ? (
              <div className="dv-grid dv-pad">{[1, 2, 3, 4].map((i) => <div key={i} className="dv-skeleton" />)}</div>
            ) : enResultados ? (
              <section className="dv-section dv-pad">
                <div className="dv-section-head" style={{ padding: 0 }}><h3 className="dv-section-title">{tituloResultados}</h3></div>
                {grilla(resultados)}
              </section>
            ) : (
              <>
                {seccion('destacados', '🔥 Lo más pedido', c.products.slice(0, 12), () => ir('tienda'))}
                {seccion('promos', '🔥 Promos', ofertas, () => setFiltro('promos'))}
                {seccion('nuevos', '✨ Novedades', nuevos, () => ir('tienda'))}
                {categorias.map((cat) => seccion(`cat-${cat.id}`, cat.label, c.products.filter((p) => p.category === cat.id), () => ir('tienda', cat.id)))}
                {c.products.length > 0 && (
                  <div className="dv-see-all-wrap">
                    <button className="dv-see-all-btn" onClick={() => ir('tienda')}>Ver toda la tienda →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── TIENDA: catálogo completo ─── */}
        {tab === 'tienda' && (
          <div className="animate-fade-in">
            <div className="dv-pad" style={{ paddingTop: 14 }}>
              <label className="dv-search-bar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input className="dv-search-input" type="search" placeholder={`Buscar en ${store.name}...`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar productos" />
                {busqueda && <button type="button" className="dv-search-close" aria-label="Borrar búsqueda" onClick={() => setBusqueda('')}>✕</button>}
              </label>
            </div>
            {chipsCategoria}
            <section className="dv-section dv-pad">
              <div className="dv-section-head" style={{ padding: 0 }}>
                <h3 className="dv-section-title">{q ? `Resultados para «${busqueda.trim()}»` : nombreCategoria(c.activeCategory) || 'Toda la tienda'}</h3>
                <span className="dv-count">{c.filtered.filter(coincide).length} productos</span>
              </div>
              {grilla(c.filtered.filter(coincide))}
            </section>
          </div>
        )}

        </div>
        </div>
        )}

        {/* ─── CARRITO ─── */}
        {tab === 'pedidos' && (
          <CartPanel
            t={t}
            cartItems={c.cartItems}
            subtotal={c.subtotal}
            onAdd={c.addToCart}
            onRemove={c.removeFromCart}
            onVaciar={c.vaciarCarrito}
            onConfirmar={c.confirmarPedido}
            pagoOnline={c.cobraOnline}
            onPagarOnline={c.pagarOnline}
            onIrAlMenu={() => ir('tienda')}
            whatsappVisible={c.whatsappVisible}
            entregaDisponible={store.entrega}
            catalogo
          />
        )}

        {/* ─── CONTACTO ─── */}
        {tab === 'contacto' && (
          <ContactPanel
            t={t}
            telefonoVisible={c.telefonoVisible}
            direccionVisible={store.direccion}
            horarioVisible={store.horario}
            facebookVisible={store.facebook}
            instagramVisible={store.instagram}
            tiktokVisible={store.tiktok}
            onEnviar={(d) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)}
          />
        )}

        <p className="dv-footer">{store.name}{store.tagline ? ` · ${store.tagline}` : ''}</p>
      </main>

      {/* ─── BARRA INFERIOR (celular) ─── */}
      <nav className="dv-bottom-nav" aria-label="Navegación principal">
        {TABS.filter((x) => x.id !== 'contacto').map((x) => (
          <button key={x.id} className={`dv-bn-item ${tab === x.id ? 'on' : ''}`} onClick={() => ir(x.id)}>
            <span className="dv-bn-icon">
              {x.icon}
              {x.id === 'pedidos' && c.cartCount > 0 && <span key={c.cartCount} className="dv-badge cart-badge-bump">{c.cartCount}</span>}
            </span>
            <span>{x.label}</span>
          </button>
        ))}
        {/* Contacto por WhatsApp, a un toque (sin número cargado, abre la pestaña de contacto). */}
        <button
          className={`dv-bn-item dv-bn-wa ${tab === 'contacto' ? 'on' : ''}`}
          onClick={() => (c.whatsappVisible || store.demoDePlantilla ? consultarWa() : ir('contacto'))}
        >
          <span className="dv-bn-icon"><span className="dv-bn-wa-circle"><IconoWhatsApp className="w-[18px] h-[18px]" /></span></span>
          <span>WhatsApp</span>
        </button>
      </nav>

      {tab !== 'pedidos' && <AddedToast t={t} onVerPedido={() => ir('pedidos')} />}

      <ProductModal
        t={t}
        producto={c.detalle}
        productos={c.products}
        onSelect={c.abrirProducto}
        onClose={c.cerrarProducto}
        onAdd={c.addToCart}
        onConsultar={(p) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quiero consultar por "${p.name}".`)}
      />
    </div>
  );
}

/* Estilos de Delva (app/globals.css de Delva, bloque "DESIGN REFRESH"), con prefijo dv- para no chocar con el resto de BogaHub. */
const CSS = `
.dv { min-height: 100vh; background: var(--dv-bg); color: var(--dv-ink); font-family: var(--dv-font); -webkit-font-smoothing: antialiased; }
.dv button { font-family: inherit; cursor: pointer; }
.dv h1, .dv h2, .dv h3, .dv h4 { letter-spacing: -0.02em; line-height: 1.15; }

/* Cabecera */
.dv-navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 50; height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px;
  background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(18px); -webkit-backdrop-filter: saturate(180%) blur(18px); border-bottom: 1px solid var(--dv-line); }
.dv-logo { display: flex; align-items: center; gap: 8px; background: none; border: none; padding: 0; min-width: 0; }
.dv-logo-img { height: 30px; width: auto; border-radius: 8px; display: block; }
.dv-logo-ini { width: 30px; height: 30px; border-radius: 8px; background: var(--dv-primary); color: var(--dv-on-primary); font-weight: 900; display: flex; align-items: center; justify-content: center; }
.dv-wordmark { font-weight: 800; font-size: 1.15rem; letter-spacing: 0.06em; color: var(--dv-primary); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--dv-font-head); }
.dv-nav-tabs { display: none; }
.dv-nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.dv-wa-btn { display: none; align-items: center; gap: 6px; white-space: nowrap; border: none; background: #25D366; color: #fff; padding: 10px 16px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; transition: background 0.2s; }
.dv-wa-btn:hover { background: #1ebe5b; }
.dv-icon-btn { border: none; width: 40px; height: 40px; border-radius: 50%; background: var(--dv-chip); color: var(--dv-ink); display: flex; align-items: center; justify-content: center; }
.dv-badge { position: absolute; top: -6px; right: 4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: #e5484d; color: #fff; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
.dv-badge-inline { position: static; display: inline-flex; margin-left: 6px; border: none; }
.dv-main { padding-top: 58px; padding-bottom: 110px; }

/* Lupa */
.dv-search-backdrop { position: fixed; inset: 0; z-index: 48; background: rgba(15,31,24,0.25); }
.dv-search { position: fixed; top: 58px; left: 0; right: 0; z-index: 49; padding: 8px 14px 10px; background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--dv-line); animation: dv-search-in 0.2s ease; }
@keyframes dv-search-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.dv-search-bar { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--dv-line); border-radius: 16px; padding: 0 16px; height: 46px; max-width: 760px; margin: 0 auto; box-shadow: 0 1px 6px rgba(15,31,24,0.06); }
.dv-search-bar:focus-within { border-color: var(--dv-primary); }
.dv-search-input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 0.95rem; font-weight: 500; color: var(--dv-ink); }
.dv-search-close { background: var(--dv-chip); border: none; border-radius: 50%; width: 26px; height: 26px; font-size: 0.7rem; font-weight: 800; color: var(--dv-ink-soft); flex-shrink: 0; }
.dv-search-results { max-width: 760px; margin: 8px auto 0; background: #fff; border: 1px solid var(--dv-line); border-radius: 16px; box-shadow: 0 12px 30px rgba(15,31,24,0.14); max-height: 60vh; overflow-y: auto; padding: 6px; }
.dv-nsr-item { display: flex; align-items: center; gap: 12px; width: 100%; background: none; border: none; text-align: left; padding: 8px; border-radius: 12px; }
.dv-nsr-item:hover { background: var(--dv-chip); }
.dv-nsr-item img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: #f1f3f2; flex-shrink: 0; }
.dv-nsr-title { flex: 1; font-size: 0.85rem; font-weight: 600; color: var(--dv-ink); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dv-nsr-price { font-size: 0.85rem; font-weight: 800; color: var(--dv-primary); white-space: nowrap; }
.dv-nsr-all { width: 100%; margin-top: 4px; background: var(--dv-primary); color: var(--dv-on-primary); border: none; border-radius: 12px; padding: 12px; font-weight: 700; font-size: 0.85rem; }
.dv-nsr-empty { text-align: center; color: var(--dv-ink-soft); padding: 18px 10px; font-size: 0.88rem; }
.dv-search-active { display: inline-flex; align-items: center; gap: 10px; background: var(--dv-chip); border-radius: 999px; padding: 8px 8px 8px 16px; font-size: 0.85rem; margin: 8px 14px 0; }
.dv-search-active button { background: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 0.65rem; font-weight: 800; color: var(--dv-ink-soft); }

/* Cinta de avisos */
.dv-announce { background: var(--dv-primary); color: var(--dv-on-primary); overflow: hidden; white-space: nowrap; }
.dv-announce-track { display: flex; width: max-content; animation: dv-announce 26s linear infinite; }
.dv-announce:hover .dv-announce-track { animation-play-state: paused; }
.dv-announce-group { display: flex; flex-shrink: 0; }
.dv-announce-item { padding: 9px 28px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; }
.dv-announce-item::after { content: '•'; margin-left: 56px; color: #D9A441; }
@keyframes dv-announce { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .dv-announce-track { animation: none; } }

/* Banner */
.dv-hero { position: relative; width: 100%; height: clamp(190px, 58vw, 320px); overflow: hidden; background: #050a0f; user-select: none; cursor: pointer; }
.dv-hero-slide { position: absolute; inset: 0; transition: opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1); }
.dv-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.dv-hero-shade { position: absolute; inset: 0; background: linear-gradient(105deg, color-mix(in srgb, var(--dv-primary) 88%, #000) 0%, color-mix(in srgb, var(--dv-primary) 40%, transparent) 60%, transparent 100%); }
.dv-hero-text { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 25px; }
.dv-hero-tag { color: #FF5722; font-weight: 900; font-size: 0.65rem; letter-spacing: 1px; margin-bottom: 6px; }
.dv-hero-text h2 { color: #fff; font-size: clamp(1.3rem, 7vw, 2rem); font-weight: 900; margin: 0 0 8px; text-shadow: 0 2px 15px rgba(0,0,0,0.4); max-width: 560px; font-family: var(--dv-font-head); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dv-hero-text p { color: rgba(255,255,255,0.85); font-size: clamp(0.75rem, 3vw, 0.9rem); font-weight: 600; max-width: 280px; margin: 0; line-height: 1.4; }
.dv-hero-dots { position: absolute; bottom: 12px; right: 25px; display: flex; gap: 8px; z-index: 3; }
.dv-hero-dots button { width: 8px; height: 8px; border-radius: 10px; background: rgba(255,255,255,0.3); border: none; padding: 0; transition: all 0.3s ease; }
.dv-hero-dots button.on { width: 22px; background: #FF5722; }
.dv-hero-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 4; width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(0,0,0,0.35); color: #fff; font-size: 1.6rem; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0 0 3px; backdrop-filter: blur(4px); }
.dv-hero-arrow:hover { background: rgba(0,0,0,0.6); }
.dv-hero-prev { left: 10px; } .dv-hero-next { right: 10px; }

/* Chips Promos / Novedad */
.dv-filter-chips { display: flex; gap: 10px; padding: 14px 14px 4px; overflow-x: auto; scrollbar-width: none; }
.dv-filter-chips:empty { display: none; }
.dv-filter-chip { --c: var(--dv-primary); display: flex; align-items: center; gap: 8px; flex-shrink: 0; white-space: nowrap; padding: 6px 16px 6px 6px; border-radius: 999px;
  border: 1.5px solid color-mix(in srgb, var(--c) 22%, transparent); background: color-mix(in srgb, var(--c) 9%, #fff); color: var(--c); font-size: 0.85rem; font-weight: 700; transition: all 0.2s ease; }
.dv-filter-chip-icon { width: 30px; height: 30px; border-radius: 50%; background: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; }
.dv-filter-chip-x { font-size: 0.7rem; opacity: 0.85; margin-left: 2px; }
.dv-filter-chip.on { background: var(--c); border-color: var(--c); color: #fff; }

/* Chips de categoría */
.dv-cat-chips { display: flex; gap: 8px; padding: 12px 14px 6px; overflow-x: auto; scrollbar-width: none; }
.dv-cat-chips::-webkit-scrollbar, .dv-filter-chips::-webkit-scrollbar { display: none; }
.dv-cat-chip { flex-shrink: 0; white-space: nowrap; padding: 9px 18px; border-radius: 999px; background: #fff; border: 1.5px solid var(--dv-line); color: var(--dv-ink); font-size: 0.85rem; font-weight: 600; transition: all 0.2s ease; }
.dv-cat-chip.on { background: var(--dv-primary); border-color: var(--dv-primary); color: var(--dv-on-primary); }

/* Secciones */
.dv-pad { padding-left: 14px; padding-right: 14px; }
.dv-section { margin-top: 22px; }
.dv-section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 15px; padding: 0 14px; margin-bottom: 12px; }
.dv-section-title { font-size: 1.2rem; font-weight: 800; color: var(--dv-ink); margin: 0; font-family: var(--dv-font-head); }
.dv-section-link { background: none; border: none; color: var(--dv-primary); font-weight: 700; font-size: 0.82rem; padding: 6px 2px; white-space: nowrap; }
.dv-count { font-size: 0.78rem; font-weight: 600; color: var(--dv-ink-soft); white-space: nowrap; }
.dv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.dv-skeleton { height: 260px; border-radius: 18px; background: linear-gradient(90deg, #f0f2f1 25%, #e6eae8 50%, #f0f2f1 75%); background-size: 200% 100%; animation: dv-shimmer 1.2s infinite; }
@keyframes dv-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.dv-vacio { text-align: center; padding: 50px 10px; color: var(--dv-ink-soft); font-weight: 600; }
.dv-vacio button { margin-top: 14px; background: var(--dv-primary); color: var(--dv-on-primary); border: none; border-radius: 999px; padding: 10px 22px; font-weight: 700; }

/* Carrusel */
.dv-pcar { position: relative; }
.dv-pcar-track { display: flex; gap: 12px; overflow-x: auto; padding: 0 14px 14px; align-items: stretch; scroll-snap-type: x proximity; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.dv-pcar-track::-webkit-scrollbar { display: none; }
.dv-pcar-item { flex-shrink: 0; width: 164px; display: flex; flex-direction: column; scroll-snap-align: start; scroll-margin-left: 14px; }
.dv-pcar-arrow { position: absolute; top: 38%; transform: translateY(-50%); z-index: 5; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,0.95); color: var(--dv-primary);
  font-size: 1.5rem; line-height: 1; padding: 0 0 3px; box-shadow: 0 0 0 1px var(--dv-line), 0 4px 12px rgba(15,31,24,0.15); display: flex; align-items: center; justify-content: center; }
.dv-pcar-prev { left: 4px; } .dv-pcar-next { right: 4px; }
@media (hover: none), (pointer: coarse) { .dv-pcar-arrow, .dv-hero-arrow { display: none !important; } }
/* Con mouse hay flechas en el banner: el texto se corre para que la de la izquierda no lo tape. */
@media (hover: hover) and (pointer: fine) { .dv-hero-text { padding: 0 64px; } }

/* Tarjeta */
.dv-pc { position: relative; display: flex; flex-direction: column; background: #fff; border-radius: 18px; border: 1px solid var(--dv-line); overflow: hidden; cursor: pointer; height: 100%; flex: 1; transition: transform 0.2s, box-shadow 0.2s; }
.dv-pc:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(15,31,24,0.08); }
.dv-pc-media { position: relative; overflow: hidden; aspect-ratio: 1 / 1; background: #fff; flex-shrink: 0; }
.dv-pc-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 6px; transition: opacity 0.4s ease-in-out; }
.dv-pc-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; display: flex; background: rgba(0,0,0,0.15); z-index: 5; }
.dv-pc-badges { position: absolute; top: 8px; left: 8px; display: flex; gap: 4px; z-index: 6; }
.dv-pc-badge { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; color: #fff; background: rgba(15,31,24,0.72); backdrop-filter: blur(6px); }
.dv-pc-badge-combo { background: #f39c12; }
.dv-pc-body { padding: 0 12px 12px; display: flex; flex-direction: column; flex: 1; text-align: center; align-items: stretch; }
.dv-pc-discount { align-self: flex-start; margin: -1px 0 6px -12px; background: #e10600; color: #fff; font-weight: 800; font-size: 0.95rem; line-height: 1; padding: 9px 12px; border-radius: 0 8px 8px 0; }
.dv-pc-title { text-transform: uppercase; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.01em; color: #2b3a34; line-height: 1.3; min-height: 3.9em; margin: 12px 0 0;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.dv-pc-discount + .dv-pc-title { margin-top: 4px; }
.dv-pc-divider { height: 1px; background: #222; opacity: 0.7; margin: 8px 0; }
.dv-pc-prices { min-height: 2.9em; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; }
.dv-pc-old { font-size: 0.85rem; font-weight: 700; color: #4a5751; }
.dv-pc-old s { color: #6b7873; }
.dv-pc-offer { font-size: 1rem; font-weight: 800; color: #e10600; }
.dv-pc-regular { font-size: 1.1rem; font-weight: 800; color: var(--dv-ink); }
.dv-pc-desde { font-size: 0.75rem; font-weight: 600; color: var(--dv-ink-soft); }
.dv-pc-consulta { font-size: 0.9rem; color: var(--dv-ink-soft); }
.dv-pc-buy { margin-top: auto; width: 100%; border: none; border-radius: 10px; background: #111; color: #fff; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 12px 0; transition: background 0.2s, transform 0.1s; }
.dv-pc-prices + .dv-pc-buy { margin-top: 10px; }
.dv-pc-buy:hover { background: var(--dv-primary); }
.dv-pc-buy:active { transform: scale(0.97); }
.dv-pc-buy-consulta { background: #25D366; }
.dv-pc-buy-consulta:hover { background: #1ebe5b; }
.dv-pc-buy-ok, .dv-pc-buy-ok:hover { background: #16a34a; }

/* Cierre del inicio */
.dv-see-all-wrap { display: flex; justify-content: center; padding: 8px 14px 12px; }
.dv-see-all-btn { width: 100%; max-width: 420px; background: var(--dv-primary); color: var(--dv-on-primary); border: none; border-radius: 14px; padding: 16px 24px; font-size: 1rem; font-weight: 700; letter-spacing: 0.02em; transition: background 0.2s; }
.dv-see-all-btn:hover { background: var(--dv-secondary); }
.dv-footer { text-align: center; font-size: 0.8rem; color: #bbb; font-weight: 900; letter-spacing: 3px; margin: 30px 16px 0; text-transform: uppercase; }

/* Barra lateral (solo escritorio) */
.dv-side { display: none; }
.dv-side-label { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dv-ink-soft); margin: 4px 4px 10px; }
.dv-side-label ~ .dv-side-label { margin-top: 20px; }
.dv-side-filtros { display: flex; flex-direction: column; gap: 8px; }
.dv-side-filtros .dv-filter-chip { width: 100%; }
.dv-side-cats { display: flex; flex-direction: column; gap: 2px; }
.dv-side-cats button { display: flex; justify-content: space-between; align-items: center; background: none; border: none; padding: 10px 12px; border-radius: 12px; font-size: 0.9rem; font-weight: 600; color: var(--dv-ink); text-align: left; transition: background 0.15s; }
.dv-side-cats button:hover { background: var(--dv-chip); }
.dv-side-cats button.on { background: var(--dv-primary); color: var(--dv-on-primary); }
.dv-side-n { font-size: 0.72rem; font-weight: 700; opacity: 0.6; }
.dv-side-wa { margin-top: 20px; border-radius: 16px; padding: 14px; background: #e9f9ef; border: 1px solid #c6efd4; }
.dv-side-wa-t { font-weight: 800; font-size: 0.92rem; color: #0f3d26; margin: 0; }
.dv-side-wa-s { font-size: 0.78rem; color: #3b5f4b; margin: 4px 0 12px; line-height: 1.35; }
.dv-side-wa button { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 12px; background: #25D366; color: #fff; font-weight: 700; font-size: 0.88rem; padding: 11px; transition: background 0.2s; }
.dv-side-wa button:hover { background: #1ebe5b; }

/* Barra inferior flotante (celular) */
.dv-bottom-nav { display: none; }
@media (max-width: 767px) {
  .dv-bottom-nav { display: flex; position: fixed; left: 10px; right: 10px; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 45; padding: 6px 8px; border-radius: 22px;
    background: rgba(255,255,255,0.96); backdrop-filter: saturate(180%) blur(18px); -webkit-backdrop-filter: saturate(180%) blur(18px); border: 1px solid var(--dv-line); box-shadow: 0 8px 24px rgba(15,31,24,0.14); }
  .dv-bn-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; padding: 6px 0; border-radius: 12px; font-size: 0.68rem; font-weight: 600; color: var(--dv-ink-soft); -webkit-tap-highlight-color: transparent; outline: none; }
  .dv-bn-item.on { color: var(--dv-primary); }
  .dv-bn-icon { position: relative; font-size: 1.25rem; line-height: 1; padding: 4px 16px; border-radius: 999px; transition: background 0.2s; }
  .dv-bn-item.on .dv-bn-icon { background: var(--dv-chip); }
  .dv-bn-wa { color: #128C7E; }
  .dv-bn-wa .dv-bn-icon { padding: 0 16px; }
  .dv-bn-wa-circle { width: 28px; height: 28px; border-radius: 50%; background: #25D366; color: #fff; display: inline-flex; align-items: center; justify-content: center; }
}

/* Escritorio */
@media (min-width: 768px) {
  .dv-nav-tabs { display: flex; gap: 4px; }
  .dv-wa-btn { display: flex; }
  .dv-nav-tabs button { background: none; border: none; padding: 8px 14px; border-radius: 999px; font-weight: 700; font-size: 0.88rem; color: var(--dv-ink-soft); display: flex; align-items: center; }
  .dv-nav-tabs button.on { background: var(--dv-chip); color: var(--dv-primary); }
  .dv-main { padding-bottom: 40px; }
  .dv-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px; }
}
@media (min-width: 1025px) {
  .dv-navbar { height: 64px; padding: 0 max(20px, calc((100% - 1400px) / 2 + 20px)); }
  .dv-main { padding-top: 64px; }
  .dv-search { top: 64px; }
  .dv-wordmark { font-size: 1.3rem; }
  .dv-layout { max-width: 1400px; margin: 0 auto; padding: 20px 20px 0; display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 28px; align-items: start; }
  .dv-solo-movil { display: none !important; }
  .dv-side { display: flex; flex-direction: column; position: sticky; top: 84px; background: #fff; border: 1px solid var(--dv-line); border-radius: 22px; padding: 18px 16px; }
  .dv-col .dv-announce { border-radius: 14px; margin-bottom: 14px; }
  .dv-col .dv-hero-wrap { padding: 0; }
  .dv-hero { border-radius: 22px; height: clamp(240px, 24vw, 360px); }
  .dv-col .dv-pad, .dv-col .dv-section-head { padding-left: 0; padding-right: 0; }
  .dv-col .dv-pcar-track { padding-left: 0; padding-right: 0; }
  .dv-col .dv-search-active { margin-left: 0; }
  .dv-col .dv-section:first-of-type { margin-top: 26px; }
  .dv-section-title { font-size: 1.45rem; }
  .dv-pcar-item { width: 230px; }
  .dv-pc-title { font-size: 0.85rem; }
  .dv-pc-body { padding: 0 14px 14px; }
  .dv-pc-discount { margin-left: -14px; }
}
`;
