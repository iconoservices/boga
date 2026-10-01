'use client';

import React, { useState, useMemo } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
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
 * Plantilla "TechHome Showroom" — Racks y Soportes para TV.
 *
 * Diseño showroom oscuro estilo tech-hogar: fondo casi negro con acentos en
 * cobre/dorado. Flujo: hero de impacto → categorías horizontales tipo pills →
 * productos en grilla. Comparte motor (catálogo, carrito, WhatsApp) y
 * componentes con las demás plantillas de catálogo.
 */
export default function RackTemplate({ store, initialProductId }: Props) {
  const t = store.theme;
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
    <main
      className="min-h-screen flex flex-col mx-auto w-full relative pb-24 md:pb-0 overflow-x-hidden md:max-w-6xl md:shadow-[0_0_80px_rgba(0,0,0,0.5)]"
      style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}
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
          <section className={store.hideHeroText ? 'relative' : 'relative h-[60vh] min-h-[380px] max-h-[560px] md:h-[560px] md:max-h-none overflow-hidden'}>
            {store.hideHeroText ? (
              <div className="relative w-full aspect-video overflow-hidden">
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

            <div className={store.hideHeroText ? 'flex flex-col px-5 pt-4 pb-5' : 'absolute inset-0 flex flex-col justify-end px-5 md:px-12 pb-8 md:pb-14 md:max-w-2xl'}>
              {!store.hideHeroText && (
                <>
                  {/* Badge de categoría */}
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-3 w-fit px-3 py-1.5 rounded-full border"
                    style={{ color: t.primary, borderColor: `${t.primary}50`, background: `${t.primary}15` }}
                  >
                    <span className="material-symbols-outlined text-[12px]">tv</span>
                    Racks · Soportes · Instalación
                  </span>

                  <h2
                    className="font-black uppercase italic leading-none mb-4 drop-shadow-lg"
                    style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)', color: '#ffffff' }}
                  >
                    Tu TV<br />
                    <span style={{ color: t.primary }}>merece más.</span>
                  </h2>

                  <p className="text-white/80 font-medium mb-6 max-w-sm text-sm md:text-base leading-relaxed">
                    {store.tagline || 'Racks, soportes y muebles para armar el espacio perfecto.'}
                  </p>
                </>
              )}

              {store.hideHeroText && store.tagline && (
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
                  Ver catálogo
                </button>
                <button
                  onClick={() => setActiveTab('contacto')}
                  className="px-6 py-3.5 rounded-full font-bold text-sm uppercase transition-all border active:scale-95 flex items-center justify-center gap-2 w-full min-[420px]:flex-1 sm:flex-none sm:px-8"
                  style={store.hideHeroText
                    ? { borderColor: `${t.primary}80`, color: t.primary, background: `${t.primary}10` }
                    : { borderColor: 'rgba(255,255,255,0.3)', color: '#fff', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
                >
                  <span className={`material-symbols-outlined ${ICON.sm}`}>chat</span>
                  Consultar
                </button>
              </div>
            </div>
          </section>

          {/* STATS / TRUST BAR */}
          <div
            className="px-6 py-4 flex items-center justify-around gap-2 border-b"
            style={{ background: t.surfaceContainer, borderColor: `${t.outlineVariant}40` }}
          >
            {[
              { icon: 'local_shipping', label: store.entrega === 'recojo' ? 'Recojo en tienda' : store.entrega === 'delivery' ? 'Delivery' : 'Delivery y recojo' },
              { icon: 'build', label: 'Instalación incluida' },
              { icon: 'verified', label: 'Garantía real' },
            ].map((item) => (
              <div key={item.icon} className="flex flex-col items-center gap-1 text-center">
                <span
                  className={`material-symbols-outlined ${ICON.md}`}
                  style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold uppercase" style={{ color: t.onSurfaceVariant }}>
                  {item.label}
                </span>
              </div>
            ))}
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
        />
      )}

      {/* ─── TAB: CONTACTO ─── */}
      {activeTab === 'contacto' && (
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
  );
}
