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

const SELLOS = [
  { icon: 'interests', texto: 'Artesanía amazónica' },
  { icon: 'checkroom', texto: 'Ropa con identidad' },
  { icon: 'chat', texto: 'Pedido por WhatsApp' },
];

/** Iconos para los accesos por categoría: si el nombre dice ropa/accesorio/recuerdo se ajusta; si no, uno genérico. */
const iconoDe = (nombre: string) => {
  const n = nombre.toLowerCase();
  if (/ropa|vestid|blusa|polo|camis|prenda/.test(n)) return 'checkroom';
  if (/accesor|collar|aretes|pulsera|joya|bisut/.test(n)) return 'diamond';
  if (/recuerdo|souvenir|regalo/.test(n)) return 'redeem';
  if (/artesan|tejid|cerámic|ceramic|madera/.test(n)) return 'interests';
  return 'sell';
};

/**
 * Plantilla "Bazar Amazónico".
 *
 * Para bazares y tiendas de artesanías y ropa de la cultura amazónica (Bazar de la Abuelita Pucallpa): paleta de
 * tierra y selva, una franja con patrón geométrico inspirado en los diseños shipibo, accesos grandes por categoría
 * (Artesanías, Ropa…) y un botón para quien busca un recuerdo o un regalo de Pucallpa.
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

  const pedirRecuerdo = () =>
    enviarPedidoPorWhatsApp(
      store,
      `Hola ${store.name}, busco un recuerdo o regalo de Pucallpa. Es para: (persona u ocasión)
Presupuesto aproximado: `,
    );

  const categorias = c.categoryTabs.filter((x) => x.id !== 'all').slice(0, 4);

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
                desenfocada rellenando lo que sobre. */}
            <div className="relative overflow-hidden">
              <img aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" alt="" src={store.heroImage} />
              <section className="relative w-full md:h-[clamp(260px,32vw,460px)]">
                <img className="relative w-full h-auto max-h-[60vh] object-contain md:h-full md:max-h-none" alt={store.heroAlt} src={store.heroImage} />
                <StoreFloatingActions store={store} />
              </section>
            </div>
            <div aria-hidden="true" style={patron} />

            {/* Sellos: de un vistazo, qué vende el bazar. */}
            <section className="px-5 md:px-6 pt-5">
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {SELLOS.map((s) => (
                  <li key={s.texto} className={`flex items-center gap-2 ${TXT.small} font-bold`} style={{ color: t.secondary }}>
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ color: t.primary }}>{s.icon}</span>
                    {s.texto}
                  </li>
                ))}
              </ul>
            </section>

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

            {/* Accesos grandes por categoría: solo en "Todo" y si hay al menos dos. */}
            {c.activeCategory === 'all' && categorias.length > 1 && (
              <section className="px-5 md:px-6 pt-5">
                <div className={`grid gap-3 ${categorias.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                  {categorias.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => c.setActiveCategory(cat.id)}
                      className="group flex flex-col items-center justify-center gap-2 rounded-2xl py-5 px-3 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
                      style={{ background: t.primaryContainer, border: `1px solid ${t.outlineVariant}` }}
                    >
                      <span className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: t.primary, color: t.onPrimary }}>
                        <span className={`material-symbols-outlined ${ICON.lg}`}>{iconoDe(cat.label)}</span>
                      </span>
                      <span className={`${TXT.body} font-extrabold leading-tight`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Recuerdo o regalo de Pucallpa: casi todo el que visita pregunta por esto, así que va a la vista. */}
            {c.whatsappVisible && (
              <section className="px-5 md:px-6 pt-4">
                <button
                  type="button"
                  onClick={pedirRecuerdo}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
                  style={{ background: t.surface, color: t.onSurface, border: `1px dashed ${t.primary}` }}
                >
                  <span className="material-symbols-outlined shrink-0" style={{ color: t.primary }}>redeem</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-black">¿Buscas un recuerdo de Pucallpa?</span>
                    <span className="block text-xs" style={{ color: t.onSurfaceVariant }}>
                      Cuéntanos para quién es y tu presupuesto, y te ayudamos a elegir.
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
