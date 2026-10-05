'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { TXT, ICON } from '../shared/tokens';
import { CategoryChips, ProductGrid, ProductModal, ContactPanel, BottomNav, StoreFooter } from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
}

const PASOS = [
  { icon: 'chat', titulo: 'Escríbenos', texto: 'Dinos qué balón necesitas y tu dirección.' },
  { icon: 'request_quote', titulo: 'Te cotizamos', texto: 'Te confirmamos el precio y el tiempo de entrega.' },
  { icon: 'local_shipping', titulo: 'Te lo llevamos', texto: 'Entrega a domicilio y pagas al recibir.' },
];

const SEGURIDAD = [
  'Revisa que el balón venga sellado y con su precinto.',
  'Conecta siempre con regulador y manguera en buen estado.',
  'Si sientes olor a gas: no prendas luces, abre ventanas y cierra la válvula.',
  'Mantén el balón en posición vertical y lejos del calor.',
];

/**
 * Plantilla "Distribuidora de Gas": no muestra precios. Todo se consulta por WhatsApp
 * (el motor compartido oculta el precio y el carrito cuando store.template === 'gas',
 * ver useCatalogo). Pestañas: Inicio (pedido rápido, cómo pedir, seguridad), Productos y Contacto.
 */
export default function GasTemplate({ store, initialProductId }: Props) {
  const t = store.theme;
  const limpio = store.hideHeroText === true;
  const c = useCatalogo(store, initialProductId);
  const [activeTab, setActiveTab] = useState('home');

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'productos', label: 'Productos' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const irAProductos = (cat?: string) => {
    setActiveTab('productos');
    if (cat) c.setActiveCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const consultar = (msg?: string) =>
    enviarPedidoPorWhatsApp(store, msg ?? `¡Hola ${store.name}! Quisiera pedir un balón de gas. ¿Me pueden cotizar?`);

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  const filas = [
    ...(store.horario ? [{ label: 'Horario', valor: store.horario }] : []),
    ...(store.direccion ? [{ label: 'Local', valor: store.direccion }] : []),
    ...(store.zona ? [{ label: 'Zona de reparto', valor: store.zona }] : []),
  ];

  // Mientras carga el catálogo no hay fotos reales: mostrar las tarjetas con la portada de relleno se ve como un error.
  const categorias = c.cargando ? [] : c.categoriasConFoto(6);

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
        onCarrito={() => consultar()}
        ctaLabel="Pedir gas"
        onCta={() => consultar()}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* ══ PORTADA ══ */}
            {/* Con hideHeroText el banner va limpio (la imagen del dueño ya trae sus letras); si no, nombre + mensaje encima */}
            {limpio ? (
              <section className="relative w-full">
                <img className="w-full h-auto md:h-[380px] md:object-cover block" alt={store.heroAlt} src={store.heroImage} />
                <StoreFloatingActions store={store} />
                {c.whatsappVisible && (
                  <button
                    onClick={() => consultar()}
                    className={`absolute bottom-3 right-3 flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full font-extrabold ${TXT.small} text-white backdrop-blur-md active:scale-95 transition-all`}
                    style={{ background: 'rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.55)' }}
                  >
                    <span className={`material-symbols-outlined ${ICON.md}`}>chat</span>
                    Pedir por WhatsApp
                  </button>
                )}
              </section>
            ) : (
              <section className="relative w-full h-[42vh] md:h-[380px] overflow-hidden">
                <img className="w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.secondary}ee 0%, ${t.secondary}55 55%, transparent 100%)` }} />
                <StoreFloatingActions store={store} />
                <div className="absolute bottom-0 left-0 right-0 px-5 md:px-8 pb-6 max-w-3xl md:mx-auto">
                  <h1 className="font-black text-2xl md:text-4xl leading-tight text-white">{store.name}</h1>
                  <p className={`${TXT.body} font-semibold text-white/90 mt-1`}>{store.tagline || 'Gas a domicilio, rápido y seguro'}</p>
                </div>
              </section>
            )}
            {!limpio && c.whatsappVisible && (
              <div className="px-5 md:px-8 pt-3 max-w-3xl md:mx-auto">
                <button
                  onClick={() => consultar()}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-extrabold ${TXT.lead} shadow-lg active:scale-95 transition-all`}
                  style={{ background: '#25D366', color: '#ffffff' }}
                >
                  <span className={`material-symbols-outlined ${ICON.md}`}>chat</span>
                  Pedir mi balón por WhatsApp
                </button>
              </div>
            )}

            {/* ══ CARRUSEL DE PRODUCTOS ══ */}
            {c.products.length > 0 && (
              <section className="pt-5 max-w-3xl md:mx-auto">
                <div className="flex items-center justify-between px-5 md:px-6 mb-3">
                  <h2 className={`${TXT.title} font-black`} style={{ color: t.onSurface }}>Nuestros productos</h2>
                  <button onClick={() => irAProductos()} className={`${TXT.small} font-bold`} style={{ color: t.primary }}>Ver todos</button>
                </div>
                <div className="flex gap-3 overflow-x-auto px-5 md:px-6 scroll-px-5 md:scroll-px-6 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
                  {c.products.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      className="shrink-0 w-36 rounded-2xl overflow-hidden"
                      style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}
                    >
                      <button onClick={() => c.abrirProducto(p)} className="snap-start block w-full text-left active:opacity-80 transition-all">
                        <img src={p.image} alt={p.name} className="w-full aspect-[5/4] object-contain bg-white p-1.5" />
                        <p className={`${TXT.small} font-extrabold px-2.5 pt-2 line-clamp-2`} style={{ color: t.onSurface }}>{p.name}</p>
                      </button>
                      {c.whatsappVisible && (
                        <button
                          onClick={() => consultar(`Hola ${store.name}, quiero consultar el precio de "${p.name}".`)}
                          className={`mx-2.5 mt-2 mb-2.5 w-[calc(100%-1.25rem)] flex items-center justify-center gap-1.5 py-2 rounded-full font-extrabold ${TXT.small} active:scale-95 transition-all`}
                          style={{ background: '#25D366', color: '#ffffff' }}
                        >
                          <span className={`material-symbols-outlined ${ICON.sm}`}>chat</span>
                          Consultar
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="shrink-0 w-2" aria-hidden />
                </div>
              </section>
            )}

            {/* ══ FICHA ══ */}
            {filas.length > 0 && (
              <section style={{ background: t.surface, borderBottom: `1px solid ${t.outlineVariant}40` }}>
                <div className="px-5 md:px-8 max-w-3xl md:mx-auto divide-y" style={{ borderColor: `${t.outlineVariant}50` }}>
                  {filas.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-4 py-3">
                      <span className={`${TXT.small} font-semibold shrink-0`} style={{ color: t.onSurfaceVariant }}>{f.label}</span>
                      <span className={`${TXT.small} font-bold text-right`} style={{ color: t.onSurface }}>{f.valor}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ══ CATEGORÍAS ══ */}
            {categorias.length > 0 && (
              <section className="px-5 md:px-6 pt-5 max-w-3xl md:mx-auto">
                <h2 className={`${TXT.title} font-black mb-4`} style={{ color: t.onSurface }}>¿Qué necesitas?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {categorias.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => irAProductos(cat.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.98] transition-all"
                      style={{ background: t.surface, borderColor: `${t.outlineVariant}60` }}
                    >
                      <img src={cat.image} alt="" className="w-14 h-14 rounded-xl object-contain bg-white shrink-0" />
                      <span className={`${TXT.body} font-extrabold`} style={{ color: t.onSurface }}>{cat.label}</span>
                      <span className={`material-symbols-outlined ${ICON.md} ml-auto`} style={{ color: t.onSurfaceVariant }}>chevron_right</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ CÓMO PEDIR ══ */}
            <section className="px-5 md:px-6 pt-5 max-w-3xl md:mx-auto">
              <h2 className={`${TXT.title} font-black mb-4`} style={{ color: t.onSurface }}>Así de fácil</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PASOS.map((p, i) => (
                  <div key={p.titulo} className="p-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}60` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: t.primary, color: t.onPrimary }}>
                      <span className={`material-symbols-outlined ${ICON.md}`}>{p.icon}</span>
                    </div>
                    <p className={`${TXT.body} font-extrabold`} style={{ color: t.onSurface }}>{i + 1}. {p.titulo}</p>
                    <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ SEGURIDAD ══ */}
            <section className="px-5 md:px-6 pt-5 max-w-3xl md:mx-auto">
              <div className="p-5 rounded-2xl" style={{ background: t.secondaryContainer }}>
                <h2 className={`${TXT.title} font-black mb-3 flex items-center gap-2`} style={{ color: t.secondary }}>
                  <span className={`material-symbols-outlined ${ICON.md}`}>health_and_safety</span>
                  Usa tu gas con seguridad
                </h2>
                <ul className="space-y-2">
                  {SEGURIDAD.map((s) => (
                    <li key={s} className={`${TXT.small} font-medium flex gap-2`} style={{ color: t.onSurface }}>
                      <span className={`material-symbols-outlined ${ICON.sm} shrink-0`} style={{ color: t.primary }}>check_circle</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'productos' && (
          <div className="animate-fade-in">
            <div className="px-5 md:px-6 pt-6 pb-1">
              <h2 className="font-black text-2xl md:text-3xl" style={{ color: t.onBackground }}>Nuestros productos</h2>
              <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>Toca un producto y consulta su precio por WhatsApp.</p>
            </div>
            <CategoryChips t={t} tabs={c.categoryTabs} active={c.activeCategory} onSelect={c.setActiveCategory} />
            <section className="px-5 md:px-6 pb-8">
              <ProductGrid t={t} productos={c.filtered} onSelect={c.abrirProducto} onAdd={c.addToCart} onVerTodo={() => c.setActiveCategory('all')} catalogo
                onConsultar={c.whatsappVisible ? (p) => consultar(`Hola ${store.name}, quiero consultar el precio de "${p.name}".`) : undefined} />
            </section>
          </div>
        )}

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
            onEnviar={(d) => consultar(`Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)}
          />
        )}

        <StoreFooter
          t={t}
          storeName={store.name}
          acciones={[
            { icon: 'share', label: 'Compartir', onClick: compartir },
            { icon: 'propane_tank', label: 'Productos', onClick: () => irAProductos() },
            { icon: 'chat', label: 'Pedir', onClick: () => consultar() },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'home', icon: 'home', label: 'Inicio' },
          { id: 'productos', icon: 'propane_tank', label: 'Productos' },
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={0}
      />

      <ProductModal
        t={t}
        producto={c.detalle}
        productos={c.products}
        onSelect={c.abrirProducto}
        onClose={c.cerrarProducto}
        onAdd={c.addToCart}
        onConsultar={(p) => consultar(`Hola ${store.name}, quiero consultar el precio de "${p.name}".`)}
      />
    </div>
  );
}
