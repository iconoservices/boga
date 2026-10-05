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
  CategoryChips, CombosCarrusel, PromoLateral, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

/**
 * Plantilla "Menú Directo".
 *
 * Abre directamente en la carta, sin pantalla de inicio: es como funcionan las
 * apps de delivery, y le saca al cliente el tap extra que habia entre entrar y
 * ver algo que pueda comprar. Solo tiene Menú, Pedidos y Contacto.
 *
 * Comparte motor (catalogo, carrito, WhatsApp) y componentes con las demas
 * plantillas de comida; aca solo cambia como se arma la pantalla.
 */
export default function MenuDirectoTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);

  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'menu', initialTab);
  const selectedProduct = c.detalle;
  const tienePromos = !!c.combosYOfertas && c.combosYOfertas.length > 0;

  const TABS = [
    { id: 'menu', label: 'Menú' },
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

  const irAlMenu = () => {
    setActiveTab('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={c.cartCount}
        onCarrito={() => setActiveTab('pedidos')}
        ctaLabel="Ver menú"
        onCta={irAlMenu}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── MENÚ ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">

            {/* Portada compacta: aca es el unico hero de la plantilla, asi que se
                queda. En las plantillas con Inicio se saca para no repetir foto.
                De borde a borde, sin padding ni esquinas redondeadas, igual que
                el hero de Pollería: es el banner que carga el comercio, tiene que
                verse entero y sin filtro negro encima. El texto va debajo. */}
            {/* En pantalla grande, si hay combos u ofertas, el banner queda a la izquierda y a su derecha va una
                tarjeta de plato (rota sola si hay más de una). En celular sigue como siempre: banner y, abajo, el carrusel. */}
            <div className="relative overflow-hidden lg:flex lg:items-stretch">
              {/* Un solo fondo desenfocado para toda la franja (banner + tarjeta), así se ve como una pieza. */}
              <img aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" alt="" src={store.heroImage} />
              {/* El banner del comercio puede venir en cualquier proporción (16:9, 21:9, cuadrado...): se muestra ENTERO
                  (object-contain) y lo que sobre se rellena con la misma imagen desenfocada, en vez de recortarlo.
                  En celular la altura sigue a la proporción real de la imagen (con tope); en pantalla ancha es una franja fija. */}
              <section className={`relative w-full md:h-[clamp(260px,32vw,460px)] ${tienePromos ? 'lg:flex-1 lg:min-w-0' : ''}`}>
                <img className="relative w-full h-auto max-h-[60vh] object-contain md:h-full md:max-h-none" alt={store.heroAlt} src={store.heroImage} />
                {/* Con la tarjeta de promo (escritorio) los botones van al borde derecho de toda la franja, más abajo. */}
                <div className={tienePromos ? 'lg:hidden' : ''}><StoreFloatingActions store={store} /></div>
              </section>
              {tienePromos && (
                <div className="relative hidden lg:block w-[432px] shrink-0 h-[clamp(260px,32vw,460px)] py-3 pl-3 pr-[72px]">
                  <PromoLateral
                    t={t}
                    productos={c.combosYOfertas}
                    titulo={c.comboLabel}
                    onSelect={c.abrirProducto}
                    onAdd={c.addToCart}
                  />
                </div>
              )}
              {tienePromos && (
                <div className="hidden lg:block"><StoreFloatingActions store={store} /></div>
              )}
            </div>

            {/* El nombre y el lema ya salen en el encabezado (StoreHeader, que trae el h1): aquí no se repiten.
                Solo queda la ubicación y el horario, si la tienda los cargó. */}
            {(store.zona || store.horario) && (
              <section className="px-5 md:px-6">
                <div className={`pt-4 px-1 flex items-center gap-4 ${TXT.micro} font-semibold`} style={{ color: t.onSurfaceVariant }}>
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

            <CategoryChips
              t={t}
              tabs={c.categoryTabs}
              active={c.activeCategory}
              onSelect={c.setActiveCategory}
            />

            {c.activeCategory === 'all' && tienePromos && (
              // En escritorio ya van a la derecha del banner: el carrusel queda solo para celular y tablet.
              <div className="lg:hidden">
                <CombosCarrusel
                  t={t}
                  productos={c.combosYOfertas}
                  titulo={c.comboLabel}
                  onSelect={c.abrirProducto}
                  onAdd={c.addToCart}
                  onVerMas={() => c.setActiveCategory('__combos__')}
                />
              </div>
            )}

            <div className="px-5 md:px-6">
              <h2 className={`${TXT.title} font-black uppercase italic tracking-tighter mb-4`} style={{ color: t.onSurface }}>
                {c.activeCategory === 'all'
                  ? 'Nuestra Carta'
                  : c.categoryTabs.find((x) => x.id === c.activeCategory)?.label}
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
            onIrAlMenu={irAlMenu}
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
            { icon: 'restaurant', label: 'Menú', onClick: irAlMenu },
            { icon: 'chat', label: 'Contacto', onClick: () => setActiveTab('contacto') },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'menu', icon: 'restaurant_menu', label: 'Menú' },
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
