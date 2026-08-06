'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON, estrellasDe, type Producto } from '../shared/tokens';
import {
  CategoryChips, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
}

/**
 * Plantilla "Ficha Plana".
 *
 * Variante de "Ficha Digital" sin la tarjeta flotante ni la galería de fotos:
 * la ficha del negocio (horario, dirección, delivery) ocupa todo el ancho,
 * integrada a la página en vez de verse como una tarjeta superpuesta. El
 * resto (categorías en círculo, buscador, listado) es igual. Comparte motor
 * (catálogo, carrito, WhatsApp) con las demás plantillas de comida.
 */
export default function FichaPlanaTemplate({ store }: Props) {
  const t = store.theme;
  const c = useCatalogo(store);

  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaHome, setCategoriaHome] = useState('all');

  const iniciales = store.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const categoriasCirculo = c.categoriasConFoto(6);

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'menu', label: 'Menú' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const navToMenu = (cat?: string) => {
    setActiveTab('menu');
    if (cat) c.setActiveCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  const escribirPorWhatsApp = () => {
    enviarPedidoPorWhatsApp(store, `¡Hola ${store.name}! Quisiera hacer una consulta.`);
  };

  // Fila de datos de la ficha: cada uno solo aparece si el comercio lo cargó.
  const filas = [
    ...(store.horario ? [{ label: 'Horario', valor: store.horario }] : []),
    ...(store.direccion ? [{ label: 'Dirección', valor: store.direccion }] : []),
    ...(store.zona ? [{ label: 'Provincia-Distrito', valor: store.zona }] : []),
    ...(c.telefonoVisible ? [{ label: 'Delivery', valor: c.telefonoVisible }] : []),
  ];

  // Búsqueda en vivo: si hay texto, se muestra un grid plano de resultados en
  // vez de las secciones agrupadas por categoría.
  const resultadosBusqueda = busqueda.trim()
    ? c.products.filter((p) => p.name.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : [];

  const seccionesHome = categoriaHome === 'all'
    ? c.categoriasEfectivas
    : c.categoriasEfectivas.filter((cat) => cat.id === categoriaHome);

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

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── TAB: INICIO ─── */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">

            {/* ══ PORTADA ══ */}
            <section className="relative w-full h-[30vh] md:h-[280px] overflow-hidden">
              <img className="w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <StoreFloatingActions store={store} />
            </section>

            {/* ══ FICHA DE NEGOCIO — de borde a borde, no una tarjeta superpuesta ══ */}
            <section className="relative z-20" style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
              <div className="px-5 md:px-8 max-w-3xl md:mx-auto pb-6">

                {/* Logo + nombre — solo el logo sube sobre la portada */}
                <div className="flex items-end gap-4 mb-4">
                  {store.logoImage ? (
                    <img src={store.logoImage} alt={store.name} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 shadow-lg shrink-0 -mt-14" style={{ borderColor: t.surface }} />
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center border-4 shadow-lg shrink-0 -mt-14" style={{ background: t.primary, borderColor: t.surface }}>
                      <span className="font-black text-2xl italic" style={{ color: t.onPrimary }}>{iniciales}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className={`font-black ${TXT.title} md:text-2xl leading-tight truncate`} style={{ color: t.onSurface }}>{store.name}</h1>
                    <p className={`${TXT.small} font-semibold truncate`} style={{ color: t.onSurfaceVariant }}>{store.tagline || store.marketplaceCategory}</p>
                    {store.rating != null && (
                      <div className="flex items-center gap-0.5 mt-1" style={{ color: '#f59e0b' }}>
                        {[...Array(estrellasDe(store.rating).llenas)].map((_, i) => (
                          <span key={i} className={`material-symbols-outlined ${ICON.xs}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        ))}
                        <span className={`${TXT.micro} font-bold ml-1`} style={{ color: t.onSurfaceVariant }}>{store.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de datos */}
                {filas.length > 0 && (
                  <div className="divide-y" style={{ borderColor: `${t.outlineVariant}50` }}>
                    {filas.map((f) => (
                      <div key={f.label} className="flex items-start justify-between gap-4 py-3">
                        <span className={`${TXT.small} font-semibold shrink-0`} style={{ color: t.onSurfaceVariant }}>{f.label}</span>
                        <span className={`${TXT.small} font-bold text-right`} style={{ color: t.onSurface }}>{f.valor}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botones de contacto */}
                {(c.telefonoVisible || c.whatsappVisible) && (
                  <div className="flex gap-3 mt-5">
                    {c.telefonoVisible && (
                      <a
                        href={`tel:${c.telefonoVisible}`}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-2 font-bold ${TXT.body} active:scale-95 transition-all`}
                        style={{ borderColor: t.primary, color: t.primary }}
                      >
                        <span className={`material-symbols-outlined ${ICON.sm}`}>call</span>
                        Teléfono
                      </a>
                    )}
                    {c.whatsappVisible && (
                      <button
                        onClick={escribirPorWhatsApp}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold ${TXT.body} shadow-md active:scale-95 transition-all`}
                        style={{ background: '#25D366', color: '#ffffff' }}
                      >
                        <span className={`material-symbols-outlined ${ICON.sm}`}>chat</span>
                        WhatsApp
                      </button>
                    )}
                  </div>
                )}

                {/* Métodos de pago */}
                <div className="flex items-center justify-center gap-2.5 mt-5 flex-wrap">
                  {['Visa', 'Mastercard', 'Efectivo', 'Yape/Plin'].map((m) => (
                    <span key={m} className={`px-3 py-1 rounded-lg border font-bold ${TXT.micro} uppercase tracking-wide`} style={{ borderColor: `${t.outlineVariant}80`, color: t.onSurfaceVariant }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ CATEGORÍAS EN CÍRCULO ══ */}
            {categoriasCirculo.length > 0 && (
              <section className="px-5 md:px-6 pt-8">
                <div className="flex gap-5 overflow-x-auto pb-2">
                  <button onClick={() => setCategoriaHome('all')} className="flex flex-col items-center gap-2 shrink-0 w-20">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2"
                      style={{ background: categoriaHome === 'all' ? t.primary : t.surface, borderColor: categoriaHome === 'all' ? t.primary : `${t.outlineVariant}60` }}
                    >
                      <span className={`material-symbols-outlined ${ICON.lg}`} style={{ color: categoriaHome === 'all' ? t.onPrimary : t.onSurfaceVariant }}>apps</span>
                    </div>
                    <span className={`${TXT.micro} font-bold text-center leading-tight`} style={{ color: t.onSurface }}>Todos</span>
                  </button>
                  {categoriasCirculo.map((cat) => (
                    <button key={cat.id} onClick={() => setCategoriaHome(cat.id)} className="flex flex-col items-center gap-2 shrink-0 w-20">
                      <div
                        className="w-16 h-16 rounded-full overflow-hidden border-2"
                        style={{ borderColor: categoriaHome === cat.id ? t.primary : `${t.outlineVariant}60` }}
                      >
                        <img className="w-full h-full object-cover" alt={cat.label} src={cat.image} />
                      </div>
                      <span className={`${TXT.micro} font-bold text-center leading-tight line-clamp-2`} style={{ color: t.onSurface }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ BUSCADOR ══ */}
            <section className="px-5 md:px-6 pt-5">
              <div className="flex items-center gap-2 px-4 py-3 rounded-full border" style={{ background: t.surface, borderColor: `${t.outlineVariant}60` }}>
                <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.onSurfaceVariant }}>search</span>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar"
                  className={`flex-1 bg-transparent outline-none ${TXT.body} font-medium`}
                  style={{ color: t.onSurface }}
                />
              </div>
            </section>

            {/* ══ LISTADO ══ */}
            <section className="px-5 md:px-6 pt-6 pb-8 space-y-8">
              {busqueda.trim() ? (
                <div>
                  <h3 className={`${TXT.title} font-black mb-4`} style={{ color: t.onSurface }}>
                    {resultadosBusqueda.length > 0 ? 'Resultados' : `Sin resultados para "${busqueda}"`}
                  </h3>
                  <ProductGrid t={t} productos={resultadosBusqueda} onSelect={setSelectedProduct} onAdd={c.addToCart} />
                </div>
              ) : (
                seccionesHome.map((cat) => {
                  const productosCat = c.products.filter((p) => p.category === cat.id);
                  if (productosCat.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <h3 className={`${TXT.title} font-black mb-4`} style={{ color: t.onSurface }}>{cat.label}</h3>
                      <ProductGrid t={t} productos={productosCat} onSelect={setSelectedProduct} onAdd={c.addToCart} />
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* ─── TAB: MENÚ ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className="px-5 md:px-6 pt-6 pb-2">
              <h2 className="font-black text-2xl md:text-3xl" style={{ color: t.onBackground }}>Nuestro Menú</h2>
            </div>

            <CategoryChips
              t={t}
              tabs={c.categoryTabs}
              active={c.activeCategory}
              onSelect={c.setActiveCategory}
            />

            <section className="px-5 md:px-6 pb-8">
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
            onIrAlMenu={() => navToMenu()}
            whatsappVisible={c.whatsappVisible}
          />
        )}

        {/* ─── TAB: CONTACTO ─── */}
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

      <ProductModal t={t} producto={selectedProduct} productos={c.products} onSelect={setSelectedProduct} onClose={() => setSelectedProduct(null)} onAdd={c.addToCart} />
    </div>
  );
}
