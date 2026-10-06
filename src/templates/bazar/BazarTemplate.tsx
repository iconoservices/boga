'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import { TXT, ICON } from '../shared/tokens';
import { FilaDeslizable, ChipsCategoria } from '../shared/CarruselUI';
import {
  CombosCarrusel, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

/** Portada de fábrica de la plantilla: solo se muestra en la vista previa; una tienda real sin banner propio no la muestra. */
const PORTADA_DE_FABRICA = '/templates/bazar-portada.svg';

/**
 * Plantilla "Bazar Amazónico".
 *
 * Para bazares y tiendas de artesanías y ropa de la cultura amazónica (Bazar de la Abuelita Pucallpa): paleta de
 * tierra y selva, una franja con patrón geométrico inspirado en los diseños shipibo, chips de categoría
 * (Artesanías, Ropa…) y un botón de ayuda por WhatsApp.
 *  · en "Todo" salen primero los combos y ofertas y después una fila por categoría, en el orden de la tienda;
 *  · las categorías las crea el dueño desde su panel (Artesanías, Ropa amazónica, Accesorios, Recuerdos…).
 *
 * Comparte motor (catálogo, carrito, WhatsApp, ofertas, combos, medidas/tallas) con las demás plantillas del motor compartido.
 */
export default function BazarTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);

  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'menu', initialTab);
  const selectedProduct = c.detalle;

  const TABS = [
    { id: 'menu', label: 'Bazar' },
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

  const irAlBazar = () => {
    setActiveTab('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Franja con patrón en zigzag (de inspiración shipibo), hecha solo con CSS.
  const patron: React.CSSProperties = {
    height: 14,
    backgroundColor: t.primary,
    backgroundImage: `linear-gradient(135deg, ${t.secondary} 25%, transparent 25%), linear-gradient(225deg, ${t.secondary} 25%, transparent 25%)`,
    backgroundSize: '28px 28px',
    backgroundPosition: '0 0',
  };

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={c.cartCount}
        onCarrito={() => setActiveTab('pedidos')}
        ctaLabel="Ver bazar"
        onCta={irAlBazar}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── BAZAR ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">

            {/* Portada: el banner del comercio se muestra ENTERO, en la proporción que tenga, con la misma imagen
                desenfocada rellenando lo que sobre. Si la tienda no subió banner (le queda el de fábrica de la plantilla),
                no se muestra: solo salen sus propios datos, no el contenido de ejemplo. */}
            {(store.heroImage !== PORTADA_DE_FABRICA || store.demoDePlantilla) && (
              <div className="relative overflow-hidden">
                <img aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" alt="" src={store.heroImage} />
                <section className="relative w-full md:h-[clamp(260px,32vw,460px)]">
                  <img className="relative w-full h-auto max-h-[60vh] object-contain md:h-full md:max-h-none" alt={store.heroAlt} src={store.heroImage} />
                  <StoreFloatingActions store={store} />
                </section>
              </div>
            )}
            <div aria-hidden="true" style={patron} />

            {/* Ubicación y horario, si la tienda los cargó (el nombre y el lema ya salen en el encabezado). */}
            {(store.zona || store.horario) && (
              <section className="px-5 md:px-6">
                <div className={`pt-3 px-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${TXT.micro} font-semibold`} style={{ color: t.onSurfaceVariant }}>
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

            <ChipsCategoria
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

            {/* En "Todo": cada categoría con su título y UNA fila que se desliza de lado, con la misma tarjeta que se ve al entrar
                a una categoría. Una grilla aquí dejaba 1 o 2 tarjetas pegadas a la izquierda y el resto vacío. */}
            {c.activeCategory === 'all' && c.categoryTabs
              .filter((x) => x.id !== 'all')
              .map((cat) => {
                const deLaCategoria = c.products.filter((p) => p.category === cat.id);
                if (deLaCategoria.length === 0) return null;
                return (
                  <section key={cat.id} className="pt-6">
                    <div className="px-5 md:px-6 flex items-center justify-between gap-3 mb-3">
                      <h2 className={`${TXT.lead} font-black tracking-tight`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>{cat.label}</h2>
                      <button
                        onClick={() => c.setActiveCategory(cat.id)}
                        className={`${TXT.small} font-bold flex items-center gap-0.5 hover:underline active:scale-95 transition-transform`}
                        style={{ color: t.primary }}
                      >
                        Ver todos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                    <FilaDeslizable t={t}>
                      <ProductGrid
                        t={t}
                        productos={deLaCategoria}
                        onSelect={c.abrirProducto}
                        onAdd={c.addToCart}
                        carrusel
                      />
                    </FilaDeslizable>
                  </section>
                );
              })}

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
            onIrAlMenu={irAlBazar}
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
            { icon: 'storefront', label: 'Bazar', onClick: irAlBazar },
            { icon: 'chat', label: 'Contacto', onClick: () => setActiveTab('contacto') },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'menu', icon: 'storefront', label: 'Bazar' },
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
