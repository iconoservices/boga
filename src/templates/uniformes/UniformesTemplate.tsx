'use client';

import React, { useState, useMemo } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import CustomerAccountButton from '@/components/CustomerAccountButton';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON } from '../shared/tokens';
import {
  CombosCarrusel, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
}

/**
 * Plantilla "Uniformes Deportivos" — confección y sublimación de camisetas, conjuntos,
 * polos y uniformes para equipos, ligas y colegios.
 *
 * Diseño deportivo oscuro con acento dorado. Flujo: hero → cómo pedir (3 pasos, porque
 * un uniforme se cotiza: modelo, tallas y colores) → productos por categoría. Comparte
 * motor (catálogo, carrito, WhatsApp) y componentes con las demás plantillas de catálogo.
 */
export default function UniformesTemplate({ store, initialProductId }: Props) {
  const t = store.theme;
  // El texto "Tu equipo, tu camiseta" es de la demo: en una tienda real el banner del dueño va limpio, sin letras encima.
  const limpio = store.hideHeroText === true || store.slug !== 'uniformes';
  const c = useCatalogo(store, initialProductId);
  const [activeTab, setActiveTab] = useState<'inicio' | 'catalogo' | 'pedidos' | 'contacto'>('inicio');
  const selectedProduct = c.detalle;

  const iniciales = store.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const TABS = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'catalogo', label: 'Catálogo', icon: 'grid_view' },
    { id: 'pedidos', label: 'Pedidos', icon: 'shopping_bag' },
    { id: 'contacto', label: 'Contacto', icon: 'chat' },
  ] as const;

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  const irAlCatalogo = (cat?: string) => {
    setActiveTab('catalogo');
    if (cat) c.setActiveCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Grupos de categorías con sus productos para la página de inicio
  const seccionesDestacadas = useMemo(() => {
    return c.categoriasEfectivas.slice(0, 3).map((cat) => ({
      ...cat,
      productos: c.products.filter((p) => p.category === cat.id).slice(0, 4),
    })).filter((s) => s.productos.length > 0);
  }, [c.categoriasEfectivas, c.products]);

  return (
    // El fondo de la plantilla cubre TODA la pantalla; el contenido va centrado con un ancho máximo
    // (antes en escritorio se veía una columna oscura con márgenes blancos a los lados).
    <div className="min-h-screen w-full" style={{ background: t.background }}>
    <main
      className="min-h-screen flex flex-col mx-auto w-full relative pb-24 md:pb-0 overflow-x-hidden md:max-w-6xl md:border-x"
      style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody, borderColor: `${t.outlineVariant}50` }}
    >
      {/* ─── MODALES ─── */}
      {selectedProduct && (
        <ProductModal
          t={t}
          producto={selectedProduct}
          productos={c.products}
          onClose={c.cerrarProducto}
          onAdd={c.addToCart}
        />
      )}

      {/* ─── NAVEGACIÓN SUPERIOR ─── */}
      <header
        className="sticky top-0 z-50 px-5 md:px-8 h-16 flex items-center justify-between border-b"
        style={{ background: `${t.background}F0`, backdropFilter: 'blur(16px)', borderColor: `${t.outlineVariant}60` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {store.logoImage ? (
            <img src={store.logoImage} alt={store.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ background: t.primary, color: t.onPrimary }}
            >
              {iniciales}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-extrabold uppercase italic leading-tight text-sm truncate" style={{ color: t.onBackground }}>
              {store.name}
            </h1>
            {store.tagline && (
              <p className="hidden md:block text-[10px] font-medium leading-tight truncate" style={{ color: t.onSurfaceVariant }}>
                {store.tagline}
              </p>
            )}
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 mx-4">
          {TABS.map((tab) => {
            const activo = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0 }); }}
                className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:brightness-125 active:scale-95"
                style={{ background: activo ? `${t.primary}22` : 'transparent', color: activo ? t.primary : t.onSurfaceVariant }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          {c.cartCount > 0 && (
            <button
              onClick={() => setActiveTab('pedidos')}
              className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: t.primary, color: t.onPrimary }}
              aria-label="Ver pedidos"
            >
              <span className={`material-symbols-outlined ${ICON.md}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_bag
              </span>
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {c.cartCount}
              </span>
            </button>
          )}
          <CustomerAccountButton variant="encabezado" background={`${t.primary}22`} color={t.primary} />
        </div>
      </header>

      {/* ─── TAB: INICIO ─── */}
      {activeTab === 'inicio' && (
        <div className="animate-fade-in">

          {/* HERO */}
          {/* Con el texto oculto, el comercio carga un banner propio (con su arte y
              textos): se muestra entero, sin filtro oscuro ni recorte, y los botones
              van debajo. Con texto, es el hero clásico sobre la foto. */}
          <section className={limpio ? 'relative' : 'relative h-[60vh] min-h-[380px] max-h-[560px] md:h-[560px] md:max-h-none overflow-hidden'}>
            {limpio ? (
              <div className="relative w-full aspect-video md:max-h-[600px] overflow-hidden">
                <img src={store.heroImage} alt={store.heroAlt || store.name} className="w-full h-full object-cover" />
                <StoreFloatingActions store={store} />
              </div>
            ) : (
              <>
                <img
                  src={store.heroImage}
                  alt={store.heroAlt || store.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.55)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <StoreFloatingActions store={store} />
              </>
            )}

            <div className={limpio ? 'flex flex-col px-5 pt-4 pb-5' : 'absolute inset-0 flex flex-col justify-end px-5 md:px-12 pb-8 md:pb-14 md:max-w-2xl'}>
              {!limpio && (
                <>
                  {/* Badge de categoría */}
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-3 w-fit px-3 py-1.5 rounded-full border"
                    style={{ color: t.primary, borderColor: `${t.primary}50`, background: `${t.primary}15` }}
                  >
                    <span className="material-symbols-outlined text-[12px]">sports_soccer</span>
                    Sublimación · Bordado · Por mayor
                  </span>

                  <h2
                    className="font-black uppercase italic leading-none mb-4 drop-shadow-lg"
                    style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)', color: '#ffffff' }}
                  >
                    Tu equipo,<br />
                    <span style={{ color: t.primary }}>tu camiseta.</span>
                  </h2>

                  <p className="text-white/80 font-medium mb-6 max-w-sm text-sm md:text-base leading-relaxed">
                    {store.tagline || 'Uniformes deportivos hechos a tu medida, con tus colores y tu escudo.'}
                  </p>
                </>
              )}

              {limpio && store.tagline && (
                <p className="text-center text-sm font-semibold mb-4 leading-snug" style={{ color: t.onSurfaceVariant }}>
                  {store.tagline}
                </p>
              )}
              <div className="flex flex-col min-[420px]:flex-row gap-3">
                <button
                  onClick={() => irAlCatalogo()}
                  className="px-6 py-3.5 rounded-full font-bold text-sm uppercase transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 w-full min-[420px]:flex-1 sm:flex-none sm:px-8 md:flex-none shadow-lg"
                  style={{ background: t.primary, color: t.onPrimary, boxShadow: `0 8px 20px ${t.primary}50` }}
                >
                  <span className={`material-symbols-outlined ${ICON.sm}`} style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
                  Ver modelos
                </button>
                {/* Cotizar: el camino principal de un uniforme. Con WhatsApp cargado abre el chat directo;
                    sin él, lleva a la pestaña Contacto. Verde de WhatsApp para que se reconozca al instante. */}
                <button
                  onClick={() => {
                    if (!tieneWhatsApp(store)) { setActiveTab('contacto'); return; }
                    enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quiero cotizar un uniforme. ¿Me pueden ayudar?`);
                  }}
                  className="px-6 py-3.5 rounded-full font-bold text-sm uppercase transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2.5 w-full min-[420px]:flex-1 sm:flex-none sm:px-8 shadow-lg"
                  style={{ background: '#25D366', color: '#ffffff', boxShadow: '0 8px 20px #25D36655' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.78h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88M20.52 3.45A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41" />
                  </svg>
                  {tieneWhatsApp(store) ? 'Cotizar por WhatsApp' : 'Consultar'}
                </button>
              </div>
            </div>
          </section>

          {/* CÓMO PEDIR: un uniforme se cotiza, así que se explica el camino en 3 pasos */}
          <div
            className="px-5 md:px-8 py-5 border-y"
            style={{ background: t.surfaceContainer, borderColor: `${t.outlineVariant}40` }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-center" style={{ color: t.onSurfaceVariant }}>
              Así de fácil es pedir
            </p>
            <div className="grid grid-cols-3 gap-2 md:gap-6">
              {[
                { n: '1', icon: 'checkroom', label: 'Elige tu modelo' },
                { n: '2', icon: 'straighten', label: 'Dinos tallas y colores' },
                { n: '3', icon: 'request_quote', label: 'Cotiza por WhatsApp' },
              ].map((paso) => (
                <div key={paso.n} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className="relative w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: `${t.primary}1f`, color: t.primary }}
                  >
                    <span className={`material-symbols-outlined ${ICON.md}`} style={{ fontVariationSettings: "'FILL' 1" }}>{paso.icon}</span>
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                      style={{ background: t.primary, color: t.onPrimary }}
                    >
                      {paso.n}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold leading-tight" style={{ color: t.onSurface }}>{paso.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECCIONES POR CATEGORÍA */}
          <div className="py-8 space-y-10">
            {c.cargando ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${t.primary}40`, borderTopColor: t.primary }} />
              </div>
            ) : (
              <>
                {/* Combos/Ofertas si hay */}
                {c.combosYOfertas && c.combosYOfertas.length > 0 && (
                  <CombosCarrusel
                    t={t}
                    productos={c.combosYOfertas}
                    titulo={c.comboLabel}
                    onSelect={c.abrirProducto}
                    onAdd={c.addToCart}
                    onVerMas={() => { irAlCatalogo(); c.setActiveCategory('__combos__'); }}
                  />
                )}

                {/* Secciones por categoría */}
                {seccionesDestacadas.map((sec) => (
                  <section key={sec.id} className="px-5 md:px-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {sec.icon && (
                          <span
                            className={`material-symbols-outlined ${ICON.md}`}
                            style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}
                          >
                            {sec.icon}
                          </span>
                        )}
                        <h3
                          className={`font-black uppercase italic tracking-tight ${TXT.title}`}
                          style={{ color: t.onBackground }}
                        >
                          {sec.label}
                        </h3>
                      </div>
                      <button
                        onClick={() => irAlCatalogo(sec.id)}
                        className={`${TXT.small} font-bold flex items-center gap-0.5 transition-all active:scale-95`}
                        style={{ color: t.primary }}
                      >
                        Ver todos
                        <span className={`material-symbols-outlined ${ICON.sm}`}>arrow_forward</span>
                      </button>
                    </div>
                    <ProductGrid
                      t={t}
                      productos={sec.productos}
                      onSelect={c.abrirProducto}
                      onAdd={c.addToCart}
                      catalogo
                    />
                  </section>
                ))}

                {/* CTA Ver todo si hay muchos productos */}
                {c.products.length > 4 && (
                  <div className="px-5 md:px-8 pb-4">
                    <button
                      onClick={() => irAlCatalogo()}
                      className="w-full py-4 rounded-2xl font-bold text-sm uppercase border-2 transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                      style={{ borderColor: t.primary, color: t.primary, background: `${t.primary}10` }}
                    >
                      <span className={`material-symbols-outlined ${ICON.sm}`}>grid_view</span>
                      Ver todo el catálogo ({c.products.length} productos)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* INFO DEL NEGOCIO */}
          {(store.zona || store.horario || store.direccion) && (
            <section
              className="mx-5 md:mx-8 mb-8 rounded-2xl p-5 border"
              style={{ background: t.surfaceContainer, borderColor: `${t.outlineVariant}40` }}
            >
              <h3
                className={`font-black uppercase italic tracking-tight ${TXT.body} mb-4 flex items-center gap-2`}
                style={{ color: t.primary }}
              >
                <span className={`material-symbols-outlined ${ICON.sm}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  store
                </span>
                Información
              </h3>
              <div className={`space-y-3 ${TXT.small}`} style={{ color: t.onSurfaceVariant }}>
                {store.zona && (
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ color: t.primary }}>location_on</span>
                    <span>{store.zona}</span>
                  </div>
                )}
                {store.direccion && (
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ color: t.primary }}>maps_home_work</span>
                    <span>{store.direccion}</span>
                  </div>
                )}
                {store.horario && (
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ color: t.primary }}>schedule</span>
                    <span>{store.horario}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── TAB: CATÁLOGO ─── */}
      {activeTab === 'catalogo' && (
        <div className="animate-fade-in">
          <div className="px-5 md:px-8 pt-6 pb-2">
            <h2
              className="font-black uppercase italic text-2xl md:text-3xl mb-1"
              style={{ color: t.onBackground }}
            >
              Catálogo
            </h2>
            <p className={TXT.body} style={{ color: t.onSurfaceVariant }}>
              Selecciona una categoría para explorar
            </p>
          </div>

          {/* Chips de categoría */}
          <nav
            className="hide-scrollbar px-5 md:px-8 overflow-x-auto flex gap-3 whitespace-nowrap sticky top-16 md:top-[60px] py-3 z-40"
            style={{ background: `${t.background}F0`, backdropFilter: 'blur(12px)' }}
          >
            {c.categoryTabs.map((tab) => {
              const isActive = c.activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => c.setActiveCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full shrink-0 ${TXT.small} font-bold transition-all active:scale-95 shadow-sm border`}
                  style={{
                    background: isActive ? t.primary : t.surface,
                    color: isActive ? t.onPrimary : t.onSurfaceVariant,
                    borderColor: isActive ? 'transparent' : `${t.outlineVariant}60`,
                    boxShadow: isActive ? `0 4px 12px ${t.primary}40` : 'none',
                  }}
                >
                  {tab.icon && (
                    <span
                      className={`material-symbols-outlined ${ICON.sm}`}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {tab.icon}
                    </span>
                  )}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Carrusel combos/ofertas en vista "Todos" */}
          {c.activeCategory === 'all' && c.combosYOfertas && c.combosYOfertas.length > 0 && (
            <CombosCarrusel
              t={t}
              productos={c.combosYOfertas}
              titulo={c.comboLabel}
              onSelect={c.abrirProducto}
              onAdd={c.addToCart}
              onVerMas={() => c.setActiveCategory('__combos__')}
            />
          )}

          <section className="px-5 md:px-8 py-6">
            <ProductGrid
              t={t}
              productos={c.filtered}
              onSelect={c.abrirProducto}
              onAdd={c.addToCart}
              onVerTodo={() => c.setActiveCategory('all')}
              catalogo
            />
          </section>
        </div>
      )}

      {/* ─── TAB: PEDIDOS ─── */}
      {activeTab === 'pedidos' && (
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
          onIrAlMenu={() => setActiveTab('catalogo')}
          whatsappVisible={c.whatsappVisible}
          entregaDisponible={store.entrega}
          catalogo
        />
      )}

      {/* ─── TAB: CONTACTO ─── */}
      {activeTab === 'contacto' && (
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

      {/* ─── NAV INFERIOR ─── */}
      <BottomNav
        t={t}
        tabs={TABS.map((tab) => ({ ...tab, id: tab.id }))}
        active={activeTab}
        cartCount={c.cartCount}
        onSelect={(id) => {
          setActiveTab(id as typeof activeTab);
          window.scrollTo({ top: 0 });
        }}
      />
    </main>
    </div>
  );
}
