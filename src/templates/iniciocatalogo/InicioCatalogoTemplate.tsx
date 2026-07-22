'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON, type Producto } from '../shared/tokens';
import {
  CategoryChips, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
}

/**
 * Plantilla "Inicio con Catálogo".
 *
 * Tiene pantalla de inicio, pero abajo van los productos: el home clasico de
 * ecommerce. Es la respuesta al problema de la plantilla Pollería, donde el
 * inicio tenia hero, categorias, historia y newsletter pero cero productos, y
 * el cliente tenia que dar un tap extra para ver algo que pudiera comprar.
 *
 * A diferencia del Menú Directo, aca el Menú NO lleva banner propio: el hero
 * del inicio ya cumple esa funcion y repetirlo mostraba la misma foto dos veces.
 */
export default function InicioCatalogoTemplate({ store }: Props) {
  const t = store.theme;
  const c = useCatalogo(store);

  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'menu', label: 'Menú' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const destacados = c.products.slice(0, 8);

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  const navToMenu = (cat?: string) => {
    setActiveTab('menu');
    if (cat) c.setActiveCategory(cat);
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
        onCta={() => navToMenu()}
      />

      <StoreFloatingActions store={store} />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── INICIO ─── */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">

            {/* ══ HERO ══ */}
            <section className="relative w-full h-[42vh] md:h-[360px] overflow-hidden flex items-center">
              <div className="absolute inset-0 z-0">
                <img
                  className="w-full h-full object-cover saturate-[1.15] contrast-[1.05] scale-105"
                  alt={store.heroAlt}
                  src={store.heroImage}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/40 md:bg-gradient-to-r md:from-black/85 md:via-black/60 md:to-black/25" />
              </div>

              <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6">
                <h1
                  className="text-white font-extrabold leading-tight tracking-tight uppercase italic drop-shadow-md mb-3 max-w-2xl line-clamp-3"
                  style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}
                >
                  {store.name}
                </h1>
                <p className={`text-white/90 font-medium ${TXT.body} md:text-base mb-5 max-w-lg leading-relaxed line-clamp-2`}>
                  {store.tagline || 'Disfruta del auténtico sabor al carbón, preparado con la receta secreta de la casa.'}
                </p>
                {(store.zona || store.horario) && (
                  <div className={`flex flex-wrap items-center gap-4 mb-6 text-white/85 ${TXT.small} font-semibold`}>
                    {store.zona && (
                      <span className="flex items-center gap-1">
                        <span className={`material-symbols-outlined ${ICON.sm}`}>location_on</span>
                        {store.zona}
                      </span>
                    )}
                    {store.horario && (
                      <span className="flex items-center gap-1">
                        <span className={`material-symbols-outlined ${ICON.sm}`}>schedule</span>
                        {store.horario}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => navToMenu()}
                  className={`px-6 py-3 rounded-full font-bold ${TXT.body} shadow-lg hover:brightness-110 hover:scale-105 active:scale-95 transition-all inline-flex items-center justify-center gap-2 uppercase`}
                  style={{ backgroundColor: t.primary, color: t.onPrimary, boxShadow: `0 8px 16px ${t.primary}50` }}
                >
                  Pedir Ahora
                  <span className={`material-symbols-outlined ${ICON.sm}`}>shopping_cart</span>
                </button>
              </div>
            </section>

            {/* ══ CATEGORÍAS ══ */}
            {c.categoriasEfectivas.length > 0 && (
              <section className="max-w-[1200px] mx-auto px-5 md:px-6 pt-8 md:pt-12">
                <div className="flex items-end justify-between mb-4">
                  <h2 className="font-extrabold uppercase italic tracking-tight" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', color: t.onBackground }}>
                    Categorías
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {c.categoriasConFoto(6).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navToMenu(cat.id)}
                      className="group relative overflow-hidden rounded-2xl shrink-0 w-36 h-24 md:w-48 md:h-32 shadow-md hover:shadow-xl transition-all text-left"
                    >
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt={cat.label}
                        src={cat.image}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      <span className="absolute bottom-3 left-3 right-3 text-white font-extrabold text-sm md:text-base uppercase italic drop-shadow leading-tight line-clamp-2">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ PRODUCTOS — lo que la plantilla Pollería no tenia en su inicio ══ */}
            <section className="max-w-[1200px] mx-auto px-5 md:px-6 pt-8 pb-10">
              <div className="flex items-end justify-between mb-4">
                <h2 className="font-extrabold uppercase italic tracking-tight" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', color: t.onBackground }}>
                  Nuestros Favoritos
                </h2>
                <button
                  onClick={() => navToMenu()}
                  className={`flex items-center gap-1 font-bold ${TXT.small} hover:gap-2 transition-all shrink-0`}
                  style={{ color: t.primary }}
                >
                  Ver todo
                  <span className={`material-symbols-outlined ${ICON.sm}`}>arrow_forward</span>
                </button>
              </div>
              <ProductGrid
                t={t}
                productos={destacados}
                onSelect={setSelectedProduct}
                onAdd={c.addToCart}
              />
            </section>
          </div>
        )}

        {/* ─── MENÚ ─── (sin banner: el hero del inicio ya cumple esa funcion) */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className="max-w-[1200px] mx-auto px-5 md:px-6 pt-6 pb-2">
              <h2 className="font-extrabold uppercase italic text-2xl md:text-3xl mb-1" style={{ color: t.onBackground }}>
                Nuestro Menú
              </h2>
              <p className={TXT.body} style={{ color: t.onSurfaceVariant }}>
                Selecciona una categoría para explorar
              </p>
            </div>

            <CategoryChips
              t={t}
              tabs={c.categoryTabs}
              active={c.activeCategory}
              onSelect={c.setActiveCategory}
            />

            <section className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto pb-8">
              <ProductGrid
                t={t}
                productos={c.filtered}
                onSelect={setSelectedProduct}
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
            onIrAlMenu={() => navToMenu()}
            whatsappVisible={c.whatsappVisible}
          />
        )}

        {/* ─── CONTACTO ─── */}
        {activeTab === 'contacto' && (
          <ContactPanel
            t={t}
            telefonoVisible={c.telefonoVisible}
            direccionVisible={store.direccion}
            horarioVisible={store.horario}
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
            { icon: 'restaurant', label: 'Menú', onClick: () => navToMenu() },
            { icon: 'chat', label: 'Contacto', onClick: () => setActiveTab('contacto') },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'home', icon: 'home', label: 'Inicio' },
          { id: 'menu', icon: 'restaurant_menu', label: 'Menú' },
          { id: 'pedidos', icon: 'shopping_cart', label: 'Pedidos' },
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={c.cartCount}
      />

      <ProductModal t={t} producto={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={c.addToCart} />
    </div>
  );
}
