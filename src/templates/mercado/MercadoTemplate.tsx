'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import CustomerAccountButton from '@/components/CustomerAccountButton';
import { useCatalogo } from '@/templates/shared/useCatalogo';
import { AddedToast } from '@/templates/shared/AddFeedback';
import { ProductModal, CartPanel, ContactPanel, BottomNav, CombosCarrusel } from '@/templates/shared/CatalogoUI';
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
    const base: { titulo1: string; titulo2: string; sub: string; img: string; limpio?: boolean }[] = [
      // El banner del comercio trae su propio arte y textos: se muestra limpio, sin letras ni oscurecido encima.
      { titulo1: '', titulo2: '', sub: '', img: store.heroImage, limpio: true },
    ];
    // Los banners destacados son SOLO las promos (combos y ofertas): es lo que más mueve a comprar. Recién si la tienda
    // no tiene ninguna, se muestran los primeros productos para que el carrusel no quede vacío.
    const promos = c.combosYOfertas ?? [];
    const destacados = promos.length > 0 ? promos.slice(0, 4) : c.products.slice(0, 3);
    destacados.forEach((p) => {
      const enOferta = Boolean(p.priceAnterior) && p.priceAnterior! > p.price;
      base.push({
        titulo1: p.esCombo ? 'COMBO' : enOferta ? 'OFERTA' : 'DESTACADO',
        titulo2: p.name.toUpperCase().slice(0, 28),
        sub: enOferta ? `Antes S/ ${p.priceAnterior!.toFixed(2)} · Ahora S/ ${p.price.toFixed(2)}` : `Desde S/ ${p.price.toFixed(2)}`,
        img: p.image,
      });
    });
    return base;
  }, [c.products, c.combosYOfertas, store.name, store.tagline, store.heroImage]);

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
              {tieneWhatsApp(store) && (
                <button
                  onClick={() => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quiero hacer una consulta. ¿Me pueden ayudar?`)}
                  aria-label="Consultar por WhatsApp"
                  className="h-9 px-3 rounded-full flex items-center gap-1.5 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
                  style={{ background: '#25D366' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.78h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88M20.52 3.45A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41" /></svg>
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}
              <CustomerAccountButton variant="encabezado" background={`${t.primary}15`} color={t.primary} />
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

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-4 mt-3 px-4 lg:px-6">
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
                    className="relative aspect-video lg:aspect-auto lg:h-[clamp(260px,30vw,420px)] overflow-hidden shrink-0 w-full"
                    style={{ scrollSnapAlign: 'start', flex: '0 0 100%', background: t.surfaceContainer }}
                  >
                    {/* La imagen se ve ENTERA (contain); lo que sobra a los lados se rellena con la misma imagen desenfocada. */}
                    <img aria-hidden alt="" src={b.img} className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" />
                    <img alt={b.limpio ? store.name : b.titulo2} src={b.img} className="relative w-full h-full object-contain" />
                    {!b.limpio && (
                      /* Promos y productos destacados: el texto va ABAJO, compacto, para no tapar la foto. */
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 pb-3 pt-14 lg:px-10 lg:pb-5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.35) 60%, transparent)' }}>
                        <span className="text-white/75 text-[10px] font-bold tracking-widest uppercase">{b.titulo1}</span>
                        <h2 className="text-white font-black text-base lg:text-2xl leading-tight line-clamp-1" style={{ fontFamily: t.fontHeadline }}>{b.titulo2}</h2>
                        <p className="text-white/85 text-[11px] lg:text-sm">{b.sub}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {banners.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-1.5">
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
              <section className="flex flex-col gap-2">
                <h3 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline }}>Explorar Categorías</h3>
                {/* Etiquetas compactas (ícono + nombre en una línea): ocupan poco alto y se deslizan de lado si son muchas. */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap pb-0.5" style={{ scrollbarWidth: 'none' }}>
                  <button
                    onClick={() => c.setActiveCategory('all')}
                    aria-label="Ver todas las categorías"
                    aria-pressed={c.activeCategory === 'all'}
                    className="shrink-0 flex items-center gap-1.5 py-1.5 pl-2.5 pr-3.5 rounded-full transition-all active:scale-95"
                    style={{
                      background: c.activeCategory === 'all' ? t.primary : t.surface,
                      color: c.activeCategory === 'all' ? t.onPrimary : t.onSurface,
                      border: `1px solid ${c.activeCategory === 'all' ? t.primary : t.outlineVariant}`,
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                    <span className="text-xs font-semibold whitespace-nowrap">Todas</span>
                  </button>

                  {categorias.map((cat) => {
                    const activa = c.activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => c.setActiveCategory(cat.id)}
                        aria-label={`Filtrar por ${cat.label}`}
                        aria-pressed={activa}
                        className="shrink-0 flex items-center gap-1.5 py-1.5 pl-2.5 pr-3.5 rounded-full transition-all active:scale-95"
                        style={{
                          background: activa ? t.primary : t.surface,
                          color: activa ? t.onPrimary : t.onSurface,
                          border: `1px solid ${activa ? t.primary : t.outlineVariant}`,
                        }}
                      >
                        {cat.icon && <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>}
                        <span className="text-xs font-semibold whitespace-nowrap">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── COMBOS Y OFERTAS ── solo en "Todas" y sin búsqueda: es una vitrina, no un filtro */}
            {c.activeCategory === 'all' && !busqueda && c.combosYOfertas && c.combosYOfertas.length > 0 && (
              <div className="-mx-4 lg:-mx-6">
                <CombosCarrusel
                  t={t}
                  productos={c.combosYOfertas}
                  titulo={c.comboLabel}
                  onSelect={c.abrirProducto}
                  onAdd={agregarRapido}
                />
              </div>
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
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                          {p.esCombo && (
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">🔥 COMBO</span>
                          )}
                          {p.priceAnterior && p.priceAnterior > p.price && (
                            <span className="text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm" style={{ background: t.primary }}>
                              -{Math.round((1 - p.price / p.priceAnterior) * 100)}%
                            </span>
                          )}
                        </div>
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
                          {p.presentaciones?.some((x) => x.promo) && (
                            <span className="mt-1 inline-block w-fit text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white">🔥 Promos por cantidad</span>
                          )}
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
            catalogo
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
