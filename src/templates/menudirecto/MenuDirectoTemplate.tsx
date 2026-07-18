'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON, INFO_LOCAL, type Producto } from '../shared/tokens';
import {
  CategoryChips, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
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
export default function MenuDirectoTemplate({ store }: Props) {
  const t = store.theme;
  const c = useCatalogo(store);

  const [activeTab, setActiveTab] = useState('menu');
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

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

      <StoreFloatingActions store={store} />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── MENÚ ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">

            {/* Portada compacta: aca es el unico hero de la plantilla, asi que se
                queda. En las plantillas con Inicio se saca para no repetir foto. */}
            <section className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto pt-4">
              <div className="relative w-full h-44 md:h-60 overflow-hidden rounded-2xl shadow-md">
                <img className="w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-6">
                  <h1 className="text-white font-black text-2xl md:text-4xl uppercase italic leading-tight max-w-md line-clamp-2">
                    {store.name}
                  </h1>
                  <p className={`text-white/85 ${TXT.body} font-medium mt-1 max-w-sm line-clamp-2`}>
                    {store.tagline || 'Directo de la brasa a tu mesa'}
                  </p>
                  <div className={`flex items-center gap-4 mt-3 text-white/80 ${TXT.micro} font-semibold`}>
                    <span className="flex items-center gap-1">
                      <span className={`material-symbols-outlined ${ICON.xs}`}>location_on</span>
                      {INFO_LOCAL.zona}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`material-symbols-outlined ${ICON.xs}`}>schedule</span>
                      {INFO_LOCAL.horarioCorto}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <CategoryChips
              t={t}
              tabs={c.categoryTabs}
              active={c.activeCategory}
              onSelect={c.setActiveCategory}
            />

            <div className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto">
              <h2 className={`${TXT.title} font-black uppercase italic tracking-tighter mb-4`} style={{ color: t.onSurface }}>
                {c.activeCategory === 'all'
                  ? 'Nuestra Carta'
                  : c.categoryTabs.find((x) => x.id === c.activeCategory)?.label}
              </h2>
            </div>

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
            onIrAlMenu={irAlMenu}
            whatsappVisible={c.whatsappVisible}
          />
        )}

        {/* ─── CONTACTO ─── */}
        {activeTab === 'contacto' && (
          <ContactPanel
            t={t}
            telefonoVisible={c.telefonoVisible}
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

      <ProductModal t={t} producto={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={c.addToCart} />
    </div>
  );
}
