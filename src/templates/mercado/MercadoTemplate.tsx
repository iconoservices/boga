'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import { useCatalogo } from '@/templates/shared/useCatalogo';
import { AddedToast } from '@/templates/shared/AddFeedback';
import { ProductModal, CartPanel, ContactPanel, BottomNav } from '@/templates/shared/CatalogoUI';
import type { Producto } from '@/templates/shared/tokens';

interface MercadoTemplateProps {
  store: StoreConfig;
  initialProductId?: string;
}

type Pestana = 'inicio' | 'pedidos' | 'contacto';

/**
 * Plantilla "Mercado": toma el lenguaje visual del marketplace de BogaHub
 * (banners, grilla de categorias, secciones de productos) pero muestra el
 * catalogo de UNA sola tienda. Pensada para clientes con catalogo grande:
 * minimarket, ferreteria, farmacia, distribuidora y venta por peso (plantilla "condimentos").
 *
 * El diseño es propio; la LOGICA (catalogo, carrito, medidas/presentaciones, pedido por WhatsApp o pago online,
 * contacto) es la del motor compartido de las demas plantillas (templates/shared): producto a pantalla completa
 * con selector de medida, resumen del pedido con datos de entrega y barra inferior tipo app.
 */
export default function MercadoTemplate({ store, initialProductId }: MercadoTemplateProps) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);

  const [pestana, setPestana] = useState<Pestana>('inicio');
  const [busqueda, setBusqueda] = useState('');
  const detalle = c.detalle;
  const [agregados, setAgregados] = useState<Record<string, boolean>>({});

  const irA = (p: Pestana) => {
    setPestana(p);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Banners: se arman con las mejores imagenes del catalogo ──
  const banners = React.useMemo(() => {
    const base = [
      { titulo1: 'BIENVENIDO A', titulo2: store.name.toUpperCase(), sub: store.tagline || 'Todo lo que necesitas, en un solo lugar', img: store.heroImage },
    ];
    c.products.slice(0, 2).forEach((p) => {
      base.push({
        titulo1: 'DESTACADO',
        titulo2: p.name.toUpperCase().slice(0, 22),
        sub: `Desde S/ ${p.price.toFixed(2)}`,
        img: p.image,
      });
    });
    return base;
  }, [c.products, store.name, store.tagline, store.heroImage]);

  const sliderRef = useRef<HTMLDivElement>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerIdxRef = useRef(0);

  const irABanner = useCallback((idx: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: idx * slider.clientWidth, behavior: 'smooth' });
    bannerIdxRef.current = idx;
    setBannerIdx(idx);
  }, []);

  useEffect(() => {
    if (pestana !== 'inicio' || banners.length < 2) return;
    const id = setInterval(() => {
      irABanner((bannerIdxRef.current + 1) % banners.length);
    }, 5000);
    return () => clearInterval(id);
  }, [irABanner, banners.length, pestana]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const w = slider.clientWidth;
        if (w > 0) {
          const idx = Math.round(slider.scrollLeft / w);
          if (idx !== bannerIdxRef.current) {
            bannerIdxRef.current = idx;
            setBannerIdx(idx);
          }
        }
        ticking = false;
      });
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    return () => slider.removeEventListener('scroll', onScroll);
  }, [pestana]);

  // Categorias (las de la tienda, o las que se deducen del catalogo) y filtro por categoria + busqueda.
  const categorias = c.categoriasEfectivas;
  const filtrados = c.filtered.filter((p) => p.name.toLowerCase().includes(busqueda.toLowerCase()));
  const nombreCategoria = (id: string) => categorias.find((x) => x.id === id)?.label ?? id;

  // "+" de la tarjeta: agrega directo. Con medidas (100 g / 250 g / 1 kg) va la más chica, que es la del precio "Desde";
  // para otra medida se toca el producto (se abre a pantalla completa con el selector).
  const agregarRapido = (p: Producto) => {
    c.addToCart(p);
    setAgregados((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => setAgregados((prev) => ({ ...prev, [p.id]: false })), 1000);
  };

  const iniciales = store.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-24" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 shadow-sm" style={{ background: t.surface }}>
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => irA('inicio')} className="flex items-center gap-2.5 min-w-0 text-left" aria-label="Ir al inicio">
              {store.logoImage ? (
                <img src={store.logoImage} alt={store.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-sm" style={{ background: t.primary, color: t.onPrimary }}>
                  {iniciales}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-base leading-tight truncate" style={{ fontFamily: t.fontHeadline }}>{store.name}</h1>
                <p className="text-[11px] truncate" style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {/* Escritorio: pestañas en el encabezado (en celular van abajo, tipo app). El carrito no es un botón aparte:
                  es el icono de "Pedidos", con su contador. */}
              <nav className="hidden md:flex items-center gap-1">
                {([['inicio', 'Inicio'], ['pedidos', 'Pedidos'], ['contacto', 'Contacto']] as [Pestana, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => irA(id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                    style={{ background: pestana === id ? t.surfaceContainer : 'transparent', color: pestana === id ? t.primary : t.onSurfaceVariant }}
                  >
                    {id === 'pedidos' && <span className="material-symbols-outlined text-[18px]">shopping_cart</span>}
                    {label}
                    {id === 'pedidos' && c.cartCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>
                        {c.cartCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {pestana === 'inicio' && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: t.onSurfaceVariant }}>search</span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca lo que necesites..."
                className="w-full pl-11 pr-4 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: t.surfaceContainerLow, color: t.onSurface, border: `1px solid ${t.outlineVariant}` }}
              />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-6 mt-4 px-4 lg:px-6">
        {pestana === 'inicio' && (
          <>
            {/* ── BANNERS ── */}
            <section className="relative">
              {/* ── COMPARTIR / INSTALAR — solo sobre los banners, se va con el scroll ── */}
              <StoreFloatingActions store={store} />

              <div
                ref={sliderRef}
                className="hide-scrollbar flex overflow-x-auto rounded-lg"
                style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {banners.map((b, i) => (
                  <div
                    key={i}
                    className="relative aspect-[21/9] lg:aspect-[21/6] overflow-hidden shrink-0 w-full"
                    style={{ scrollSnapAlign: 'start', flex: '0 0 100%' }}
                  >
                    <img alt="" src={b.img} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex flex-col justify-center p-6 lg:px-12" style={{ background: 'linear-gradient(to right, rgba(0,0,0,.78), rgba(0,0,0,.35), transparent)' }}>
                      <span className="text-white/70 text-[10px] lg:text-xs font-bold tracking-widest uppercase">{b.titulo1}</span>
                      <h2 className="text-white font-black text-xl lg:text-4xl leading-tight mt-1" style={{ fontFamily: t.fontHeadline }}>{b.titulo2}</h2>
                      <p className="text-white/80 text-xs lg:text-base mt-1.5 max-w-md">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {banners.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => irABanner(i)}
                      aria-label={`Ir al banner ${i + 1}`}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: bannerIdx === i ? 16 : 6,
                        height: 6,
                        background: bannerIdx === i ? t.primary : t.outlineVariant,
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── CATEGORIAS ── */}
            {categorias.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline }}>Explorar Categorías</h3>
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                  <button
                    onClick={() => c.setActiveCategory('all')}
                    aria-label="Ver todas las categorías"
                    aria-pressed={c.activeCategory === 'all'}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95"
                    style={{
                      background: c.activeCategory === 'all' ? t.primary : t.surface,
                      color: c.activeCategory === 'all' ? t.onPrimary : t.onSurface,
                      border: `1px solid ${c.activeCategory === 'all' ? t.primary : t.outlineVariant}`,
                    }}
                  >
                    <span className="material-symbols-outlined text-[22px]">grid_view</span>
                    <span className="text-[10px] font-semibold leading-tight text-center">Todas</span>
                  </button>

                  {categorias.map((cat) => {
                    const activa = c.activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => c.setActiveCategory(cat.id)}
                        aria-label={`Filtrar por ${cat.label}`}
                        aria-pressed={activa}
                        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95"
                        style={{
                          background: activa ? t.primary : t.surface,
                          color: activa ? t.onPrimary : t.onSurface,
                          border: `1px solid ${activa ? t.primary : t.outlineVariant}`,
                        }}
                      >
                        {cat.icon && <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>}
                        <span className="text-[10px] font-semibold leading-tight text-center line-clamp-2">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── PRODUCTOS ── */}
            <section className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <h3 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline }}>
                  {c.activeCategory === 'all' ? 'Recomendados para ti' : nombreCategoria(c.activeCategory)}
                </h3>
                <span className="text-xs" style={{ color: t.onSurfaceVariant }}>
                  {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>

              {c.cargando ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden animate-pulse" style={{ background: t.surfaceContainer }}>
                      <div className="aspect-square" style={{ background: t.surfaceContainerHigh }} />
                      <div className="p-3 flex flex-col gap-2">
                        <div className="h-3 rounded w-3/4" style={{ background: t.surfaceContainerHigh }} />
                        <div className="h-3 rounded w-1/2" style={{ background: t.surfaceContainerHigh }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtrados.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-center">
                  <span className="material-symbols-outlined text-4xl" style={{ color: t.outlineVariant }}>inventory_2</span>
                  <p className="font-semibold" style={{ color: t.onSurfaceVariant }}>
                    {busqueda ? `Sin resultados para "${busqueda}"` : 'Todavía no hay productos en esta categoría'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filtrados.map((p) => (
                    <article
                      key={p.id}
                      onClick={() => c.abrirProducto(p)}
                      className="rounded-lg overflow-hidden flex flex-col group cursor-pointer"
                      style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}
                    >
                      <div className="relative aspect-square overflow-hidden p-3" style={{ background: t.surfaceContainerLow }}>
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: t.onSurfaceVariant }}>{nombreCategoria(p.category)}</span>
                          <h4 className="font-bold text-sm line-clamp-2 mt-0.5" style={{ fontFamily: t.fontHeadline }}>{p.name}</h4>
                          {p.presentaciones && p.presentaciones.length > 0 && (
                            <p className="text-[10px] mt-1 leading-tight" style={{ color: t.onSurfaceVariant }}>{p.presentaciones.map((x) => x.label).join(' · ')}</p>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-black text-base" style={{ color: t.primary }}>
                            {p.presentaciones?.length ? <span className="text-[10px] font-semibold mr-1" style={{ color: t.onSurfaceVariant }}>Desde</span> : null}
                            S/ {p.price.toFixed(2)}
                            {p.priceAnterior && <span className="ml-1.5 text-xs font-medium line-through" style={{ color: t.onSurfaceVariant }}>S/ {p.priceAnterior.toFixed(2)}</span>}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); agregarRapido(p); }}
                            aria-label={`Agregar ${p.name} al carrito`}
                            className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-90"
                            style={{
                              background: agregados[p.id] ? '#25D366' : t.primary,
                              color: t.onPrimary,
                              transform: agregados[p.id] ? 'scale(1.1)' : undefined,
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">{agregados[p.id] ? 'check' : 'add'}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── PEDIDOS ── (resumen del pedido, datos de entrega y pago: la misma pantalla de las demás plantillas) */}
        {pestana === 'pedidos' && (
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
            onIrAlMenu={() => irA('inicio')}
            whatsappVisible={c.whatsappVisible}
            entregaDisponible={store.entrega}
            catalogo
          />
        )}

        {/* ── CONTACTO ── */}
        {pestana === 'contacto' && (
          <ContactPanel
            t={t}
            telefonoVisible={c.telefonoVisible}
            direccionVisible={store.direccion}
            horarioVisible={store.horario}
            facebookVisible={store.facebook}
            instagramVisible={store.instagram}
            tiktokVisible={store.tiktok}
            onEnviar={(d) =>
              enviarPedidoPorWhatsApp(store, `Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)
            }
          />
        )}
      </main>

      {/* ── AVISO "Agregado al pedido" ── */}
      {pestana !== 'pedidos' && <AddedToast t={t} onVerPedido={() => irA('pedidos')} />}

      {/* ── BARRA INFERIOR TIPO APP (celular) ── */}
      <BottomNav
        t={t}
        tabs={[
          { id: 'inicio', icon: 'home', label: 'Inicio' },
          { id: 'pedidos', icon: 'shopping_cart', label: 'Pedidos' },
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={pestana}
        onSelect={(id) => irA(id as Pestana)}
        cartCount={c.cartCount}
      />

      {/* ── PRODUCTO A PANTALLA COMPLETA (con selector de medida si tiene presentaciones) ── */}
      <ProductModal
        t={t}
        producto={detalle}
        productos={c.products}
        onSelect={c.abrirProducto}
        onClose={c.cerrarProducto}
        onAdd={c.addToCart}
        onConsultar={(p) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quiero consultar por "${p.name}".`)}
      />
    </div>
  );
}
