'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON, INFO_LOCAL, inicialesDe, type Producto } from '../shared/tokens';
import {
  CategoryChips, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface PolleriaTemplateProps {
  store: StoreConfig;
}

/**
 * Plantilla "Pollería Bravoz".
 *
 * Su inicio es de marca, no de catalogo: hero, ficha del local, categorias, la
 * historia de la casa y newsletter. Sirve para el negocio que quiere contar su
 * tradicion antes de vender. Para el que quiere que el cliente vea platos de
 * entrada estan "Menú Directo" e "Inicio con Catálogo", que comparten este
 * mismo motor.
 */
export default function PolleriaTemplate({ store }: PolleriaTemplateProps) {
  const t = store.theme;
  const c = useCatalogo(store);

  const [activeTab, setActiveTab] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const iniciales = inicialesDe(store.name);
  const categoriasDestacadas = c.categoriasConFoto(3);

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

      {/* ══ COMPARTIR / INSTALAR — en movil y escritorio ══ */}
      <StoreFloatingActions store={store} />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── TAB: INICIO ─── */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">

            {/* ══ HERO — Full bleed ══ */}
            <section className="relative w-full h-[45vh] md:h-[380px] overflow-hidden flex items-center">
              <div className="absolute inset-0 z-0">
                <img
                  className="w-full h-full object-cover saturate-[1.15] contrast-[1.05] scale-105"
                  alt={store.heroAlt}
                  src={store.heroImage}
                />
                {/* Velo mas oscuro: con el anterior el titular quedaba ilegible sobre la foto */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/65 to-black/40 md:bg-gradient-to-r md:from-black/85 md:via-black/60 md:to-black/25" />
              </div>

              <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 h-full">

                {/* ══ FICHA DEL LOCAL — escritorio ══ */}
                <div className="hidden md:flex flex-col items-center w-[190px] shrink-0 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl text-center">
                  {store.logoImage ? (
                    <img src={store.logoImage} alt={store.name} className="w-16 h-16 rounded-xl object-cover border-[3px] shadow-lg mb-2" style={{ borderColor: t.primary }} />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg mb-2" style={{ background: t.primary }}>
                      <span className="font-black text-xl italic" style={{ color: t.onPrimary }}>{iniciales}</span>
                    </div>
                  )}
                  <h3 className={`text-white font-extrabold ${TXT.lead} uppercase italic leading-tight mb-0.5 line-clamp-2`}>{store.name}</h3>
                  <p className={`text-white/70 ${TXT.micro} font-medium mb-3 line-clamp-2`}>{store.tagline}</p>
                  {/* Mismo color de estrellas que en movil; antes eran blancas aca y ambar alla */}
                  <div className="flex items-center gap-1 mb-2" style={{ color: '#f59e0b' }}>
                    {[...Array(4)].map((_, i) => (
                      <span key={i} className={`material-symbols-outlined ${ICON.sm}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
                    <span className={`text-white/80 ${TXT.micro} font-bold ml-1`}>{INFO_LOCAL.rating}</span>
                  </div>
                  <div className={`flex gap-3 text-white/70 ${TXT.micro}`}>
                    <span className="flex items-center gap-1"><span className={`material-symbols-outlined ${ICON.sm}`}>location_on</span>{INFO_LOCAL.zona}</span>
                    <span className="flex items-center gap-1"><span className={`material-symbols-outlined ${ICON.sm}`}>schedule</span>{INFO_LOCAL.horarioCorto}</span>
                  </div>
                </div>

                <div className="max-w-2xl flex-1 flex flex-col justify-center -mt-[3.25rem] md:mt-0">
                  <h2 className="text-white font-extrabold leading-tight tracking-tight uppercase italic drop-shadow-md mb-3"
                    style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
                    EL SABOR<br />
                    {/* primaryContainer y no primary: el primary oscuro sobre foto oscura no se leia */}
                    <span style={{ color: t.primaryContainer }}>QUE NOS UNE</span>
                  </h2>
                  <p className="text-white/90 font-medium text-sm md:text-base mb-6 max-w-lg leading-relaxed">
                    Disfruta del auténtico sabor al carbón, preparado con la receta secreta de la casa.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navToMenu()}
                      className={`px-6 py-3 rounded-full font-bold ${TXT.body} shadow-lg hover:brightness-110 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase w-full sm:w-auto`}
                      style={{ backgroundColor: t.primary, color: t.onPrimary, boxShadow: `0 8px 16px ${t.primary}50` }}
                    >
                      Pedir Ahora
                      <span className={`material-symbols-outlined ${ICON.sm}`}>shopping_cart</span>
                    </button>
                    <button
                      onClick={() => navToMenu()}
                      className={`bg-white/10 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full font-bold ${TXT.body} hover:bg-white hover:text-black transition-all flex items-center justify-center uppercase w-full sm:w-auto`}
                    >
                      Ver Menú
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ FICHA DEL LOCAL — movil ══ */}
            <div className="md:hidden px-5 -mt-8 relative z-20">
              <div className="flex items-center gap-4 rounded-xl shadow-lg border p-4" style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}>
                {store.logoImage ? (
                  <img src={store.logoImage} alt={store.name} className="w-14 h-14 rounded-xl object-cover border-[3px] shrink-0" style={{ borderColor: t.primary }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ background: t.primary }}>
                    <span className={`font-black ${TXT.title} italic`} style={{ color: t.onPrimary }}>{iniciales}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-extrabold ${TXT.body} uppercase italic leading-tight truncate`} style={{ color: t.onBackground }}>{store.name}</h3>
                  <p className={`${TXT.micro} font-medium truncate`} style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
                  {/* Estrellas en ICON.xs: en la ficha compacta las de 16px empujaban al 4.8 contra la columna de la derecha */}
                  <div className="flex items-center gap-0.5 mt-1" style={{ color: '#f59e0b' }}>
                    {[...Array(4)].map((_, i) => (
                      <span key={i} className={`material-symbols-outlined ${ICON.xs}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                    <span className={`material-symbols-outlined ${ICON.xs}`} style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
                    <span className={`${TXT.micro} font-bold ml-1`} style={{ color: t.onSurfaceVariant }}>{INFO_LOCAL.rating}</span>
                  </div>
                </div>
                <div className={`${TXT.micro} font-medium shrink-0 text-right`} style={{ color: t.onSurfaceVariant }}>
                  <div className="flex items-center gap-1 justify-end"><span className={`material-symbols-outlined ${ICON.xs}`}>location_on</span>{INFO_LOCAL.zona}</div>
                  <div className="flex items-center gap-1 justify-end"><span className={`material-symbols-outlined ${ICON.xs}`}>schedule</span>{INFO_LOCAL.horarioCorto}</div>
                </div>
              </div>
            </div>

            {/* ══ CATEGORÍAS — 2 col movil / 3 cols escritorio ══ */}
            {categoriasDestacadas.length > 0 && (
              <section className="max-w-[1200px] mx-auto px-5 md:px-6 pt-8 md:pt-16 pb-6 md:pb-12">
                <div className="text-center mb-6 md:mb-10">
                  <h2 className="font-extrabold uppercase italic tracking-tight mb-2" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', color: t.onBackground }}>
                    Explora nuestras delicias
                  </h2>
                  <div className="h-0.5 w-12 rounded-full mx-auto" style={{ background: t.primary }} />
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
                  {categoriasDestacadas.map((cat, idx) => (
                    // <button> y no <div onClick>: antes no se podia navegar con teclado
                    <button
                      key={cat.id}
                      onClick={() => navToMenu(cat.id)}
                      className={`group relative overflow-hidden rounded-2xl md:rounded-xl cursor-pointer shadow-md hover:shadow-xl transition-all text-left ${idx === 2 ? 'col-span-2 md:col-span-1' : ''}`}
                    >
                      <div className="relative h-40 md:h-80">
                        <img
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 saturate-[1.15]"
                          alt={cat.label}
                          src={cat.image}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                        <div className="absolute bottom-4 left-5 md:bottom-6 right-4">
                          {/* line-clamp y no truncate: "Pollos a la Brasa" no entra en una linea en movil */}
                          <span className={`text-white font-extrabold ${TXT.lead} md:text-2xl uppercase italic drop-shadow block leading-tight line-clamp-2`}>{cat.label}</span>
                          <div className="h-1 mt-1 rounded-full w-6 group-hover:w-12 transition-all duration-300" style={{ backgroundColor: t.primary }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ EL SECRETO DE LA CASA ══ */}
            <section style={{ background: t.surfaceContainer }}>
              <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-10 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="relative order-2 md:order-1">
                  <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                    <img className="w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
                  </div>
                  <div className="absolute -bottom-4 -right-3 md:-bottom-6 md:-right-6 px-4 py-3 rounded-xl shadow-md border hidden sm:block" style={{ background: t.surface, borderColor: `${t.primary}25` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${t.primary}20`, color: t.primary }}>
                        <span className={`material-symbols-outlined ${ICON.sm}`}>local_fire_department</span>
                      </div>
                      <div>
                        <p className={`font-bold ${TXT.small}`} style={{ color: t.primary }}>100% Carbón</p>
                        <p className={TXT.micro} style={{ color: t.onSurfaceVariant }}>Sabor Ahumado Real</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <span className={`${TXT.small} font-bold uppercase tracking-widest block mb-2`} style={{ color: t.primary }}>
                    Nuestro Legado
                  </span>
                  <h2 className="font-extrabold uppercase italic leading-tight mb-3"
                    style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', color: t.onBackground }}>
                    El Secreto de la Casa
                  </h2>
                  <p className={`${TXT.body} leading-relaxed mb-8`} style={{ color: t.onSurfaceVariant }}>
                    Nuestra especialidad nace del fuego. Utilizamos el auténtico carbón de algarrobo para un aroma inigualable y una textura crujiente por fuera, jugosa por dentro.
                  </p>
                  <div className="space-y-4 mb-8">
                    {[
                      { icon: 'forest', title: 'Brasas de Algarrobo', desc: 'Madera seleccionada para un ahumado profundo.' },
                      { icon: 'timer', title: 'Asado Lento', desc: 'Cada pollo con su tiempo exacto de cocción.' },
                      { icon: 'restaurant', title: 'Marinado 24 Horas', desc: 'Especias que penetran hasta el corazón.' },
                    ].map((feat) => (
                      <div key={feat.icon} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm" style={{ background: t.surface, color: t.primary }}>
                          <span className={`material-symbols-outlined ${ICON.md}`}>{feat.icon}</span>
                        </div>
                        <div>
                          <h3 className={`font-bold ${TXT.body}`} style={{ color: t.onBackground }}>{feat.title}</h3>
                          <p className={TXT.small} style={{ color: t.onSurfaceVariant }}>{feat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navToMenu()}
                    className={`flex items-center gap-1.5 font-bold ${TXT.body} hover:gap-3 transition-all active:scale-95`}
                    style={{ color: t.primary }}
                  >
                    <span>Ver menú completo</span>
                    <span className={`material-symbols-outlined ${ICON.sm}`}>arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ══ NEWSLETTER ══ */}
            <section className="max-w-[1200px] mx-auto px-5 md:px-6 py-10 md:py-20">
              <div className="rounded-2xl md:rounded-[1.5rem] p-8 md:p-14 relative overflow-hidden text-center" style={{ background: t.primary }}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl bg-white/10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl bg-white/10 pointer-events-none" />
                <div className="relative z-10 max-w-lg mx-auto" style={{ color: t.onPrimary }}>
                  <h2 className="font-extrabold uppercase italic leading-tight mb-3" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2rem)' }}>
                    ¿Hambre de algo especial?
                  </h2>
                  <p className={`opacity-80 ${TXT.body} font-medium mb-6`}>
                    Recibe promociones exclusivas y novedades directo en tu correo.
                  </p>
                  {newsletterSubscribed ? (
                    <div className={`bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-5 font-bold ${TXT.body}`}>
                      ¡Listo! Bienvenido al club VIP.
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (newsletterEmail) setNewsletterSubscribed(true); }}
                      className="flex flex-col sm:flex-row gap-3 p-1.5 rounded-full shadow-lg"
                      style={{ background: t.surface }}
                    >
                      <input
                        className={`flex-grow px-5 py-3 rounded-full border-none bg-transparent ${TXT.body} font-bold focus:ring-0 outline-none`}
                        style={{ color: t.onSurface }}
                        placeholder="Tu correo electrónico"
                        aria-label="Tu correo electrónico"
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                      />
                      <button
                        type="submit"
                        className={`px-6 py-3 rounded-full font-bold ${TXT.body} uppercase hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 w-full sm:w-auto`}
                        style={{ background: t.primary, color: t.onPrimary }}
                      >
                        Suscribirse
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB: MENÚ ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className="hidden md:block max-w-[1200px] mx-auto px-6 pt-8 pb-4">
              <h2 className="font-extrabold uppercase italic text-3xl mb-1" style={{ color: t.onBackground }}>Nuestro Menú</h2>
              <p className={TXT.body} style={{ color: t.onSurfaceVariant }}>Selecciona una categoría para explorar</p>
            </div>

            {/* Banner — habla de la tienda, no de un descuento inventado que nadie va a honrar */}
            <section className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto">
              <div className="relative w-full h-48 md:h-56 overflow-hidden rounded-2xl shadow-md group">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={store.heroAlt}
                  src={store.heroImage}
                />
                <div className="absolute inset-0 flex flex-col justify-center px-6 bg-gradient-to-r from-black/85 via-black/55 to-transparent">
                  <span className={`${TXT.small} font-bold mb-1 uppercase tracking-widest`} style={{ color: t.primaryContainer }}>¡Sabor que Enamora!</span>
                  <h2 className="text-white font-black text-2xl md:text-3xl max-w-xs leading-tight uppercase italic line-clamp-2">
                    {store.tagline || 'Directo de la brasa a tu mesa'}
                  </h2>
                  <button
                    onClick={() => c.setActiveCategory('all')}
                    className={`mt-4 ${TXT.small} font-bold px-6 py-2.5 rounded-full w-fit transition-colors shadow-md uppercase active:scale-95`}
                    style={{ background: t.primary, color: t.onPrimary }}
                  >
                    Ver todo el menú
                  </button>
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
              <h3 className={`${TXT.title} font-black uppercase italic tracking-tighter mb-4`} style={{ color: t.onSurface }}>
                {c.activeCategory === 'all' ? 'Nuestros Favoritos' : c.categoryTabs.find((x) => x.id === c.activeCategory)?.label}
              </h3>
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
            onEnviar={(d) =>
              enviarPedidoPorWhatsApp(store, `Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)
            }
          />
        )}

        {/* ══ FOOTER — en todas las pestañas, no solo en Inicio ══ */}
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
