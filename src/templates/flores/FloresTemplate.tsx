'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import { TXT, ICON } from '../shared/tokens';
import {
  CategoryChips, CombosCarrusel, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

/**
 * Plantilla "Florería".
 *
 * Ramos, arreglos, plantas y regalos:
 *  · en "Todo" salen primero los combos y ofertas y después una fila por categoría, en el orden de la tienda;
 *  · las fechas (San Valentín, Día de la Madre…) son una categoría más: el dueño la crea con el nombre de la fecha,
 *    la sube al principio mientras dura y la borra después;
 *  · como mucha gente no sabe qué regalar, hay un botón de asesoría que abre WhatsApp con la ocasión y el presupuesto.
 *
 * Comparte motor (catálogo, carrito, WhatsApp, ofertas, combos, medidas) con las demás plantillas del motor compartido.
 */
export default function FloresTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);

  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'menu', initialTab);
  const selectedProduct = c.detalle;

  const TABS = [
    { id: 'menu', label: 'Tienda' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  const irATienda = () => {
    setActiveTab('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pedirPersonalizado = () =>
    enviarPedidoPorWhatsApp(
      store,
      `Hola ${store.name}, necesito un arreglo para regalar. Es para: (ocasión y persona)
Presupuesto aproximado: `,
    );

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={c.cartCount}
        onCarrito={() => setActiveTab('pedidos')}
        ctaLabel="Ver tienda"
        onCta={irATienda}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── TIENDA ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">

            {/* Portada: el banner del comercio se muestra ENTERO, en la proporción que tenga, con la misma imagen
                desenfocada rellenando lo que sobre (igual que Menú Directo). */}
            <div className="relative overflow-hidden">
              <img aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" alt="" src={store.heroImage} />
              <section className="relative w-full md:h-[clamp(260px,32vw,460px)]">
                <img className="relative w-full h-auto max-h-[60vh] object-contain md:h-full md:max-h-none" alt={store.heroAlt} src={store.heroImage} />
                <StoreFloatingActions store={store} />
              </section>
            </div>

            {/* Ubicación y horario, si la tienda los cargó (el nombre y el lema ya salen en el encabezado). */}
            {(store.zona || store.horario) && (
              <section className="px-5 md:px-6">
                <div className={`pt-4 px-1 flex flex-wrap items-center gap-x-4 gap-y-1 ${TXT.micro} font-semibold`} style={{ color: t.onSurfaceVariant }}>
                  {store.zona && (
                    <span className="flex items-center gap-1">
                      <span className={`material-symbols-outlined ${ICON.xs}`}>location_on</span>
                      {store.zona}
                    </span>
                  )}
                  {store.horario && (
                    <span className="flex items-center gap-1">
                      <span className={`material-symbols-outlined ${ICON.xs}`}>schedule</span>
                      {store.horario}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* Pedido personalizado: casi todo se hace a pedido, así que va a la vista y no escondido en Contacto. */}
            {c.whatsappVisible && (
              <section className="px-5 md:px-6 pt-4">
                <button
                  type="button"
                  onClick={pedirPersonalizado}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
                  style={{ background: t.primaryContainer, color: t.onSurface, border: `1px dashed ${t.primary}` }}
                >
                  <span className="material-symbols-outlined shrink-0" style={{ color: t.primary }}>redeem</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-black">¿No sabes qué regalar?</span>
                    <span className="block text-xs" style={{ color: t.onSurfaceVariant }}>
                      Cuéntanos la ocasión y tu presupuesto, y te armamos el arreglo ideal.
                    </span>
                  </span>
                  <span className="material-symbols-outlined shrink-0" style={{ color: t.primary }}>chat</span>
                </button>
              </section>
            )}

            <CategoryChips
              t={t}
              tabs={c.categoryTabs}
              active={c.activeCategory}
              onSelect={c.setActiveCategory}
            />

            {/* Combos y ofertas (módulo Promociones), siempre primero. */}
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

            {/* En "Todo": una fila por categoría, en el orden de la tienda (cada una con su "Ver todos"). Al elegir un chip se ve la grilla completa. */}
            {c.activeCategory === 'all' && c.categoryTabs
              .filter((x) => x.id !== 'all')
              .map((cat) => (
                <CombosCarrusel
                  key={cat.id}
                  t={t}
                  productos={c.products.filter((p) => p.category === cat.id)}
                  titulo={cat.label}
                  icono=""
                  onSelect={c.abrirProducto}
                  onAdd={c.addToCart}
                  onVerMas={() => c.setActiveCategory(cat.id)}
                />
              ))}

            {c.activeCategory !== 'all' && (
              <>
                <div className="px-5 md:px-6">
                  <h2 className={`${TXT.title} font-black tracking-tight mb-4`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>
                    {c.categoryTabs.find((x) => x.id === c.activeCategory)?.label}
                  </h2>
                </div>

                <section className="px-5 md:px-6 pb-8">
                  <ProductGrid
                    t={t}
                    productos={c.filtered}
                    onSelect={c.abrirProducto}
                    onAdd={c.addToCart}
                    onVerTodo={() => c.setActiveCategory('all')}
                  />
                </section>
              </>
            )}
          </div>
        )}

        {/* ─── PEDIDOS ─── */}
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
            onIrAlMenu={irATienda}
            whatsappVisible={c.whatsappVisible}
            entregaDisponible={store.entrega}
          />
        )}

        {/* ─── CONTACTO ─── */}
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

        <StoreFooter
          t={t}
          storeName={store.name}
          acciones={[
            { icon: 'share', label: 'Compartir', onClick: compartir },
            { icon: 'storefront', label: 'Tienda', onClick: irATienda },
            { icon: 'chat', label: 'Contacto', onClick: () => setActiveTab('contacto') },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'menu', icon: 'storefront', label: 'Tienda' },
          { id: 'pedidos', icon: 'shopping_cart', label: 'Pedidos' },
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={c.cartCount}
      />

      <ProductModal t={t} producto={selectedProduct} productos={c.products} onSelect={c.abrirProducto} onClose={c.cerrarProducto} onAdd={c.addToCart} onConsultar={(p) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quiero consultar por "${p.name}".`)} />
    </div>
  );
}
