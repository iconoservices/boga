'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import BannerSlider from '../shared/BannerSlider';
import CuentaRegresiva from '../shared/CuentaRegresiva';
import { porcentajeOferta } from '@/lib/ofertas';
import { TXT, ICON, soles } from '../shared/tokens';
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
 *  · BAZAR (inicio): primero los combos y ofertas y después una fila que se desliza por cada categoría, y al final un botón
 *    para ir al catálogo completo;
 *  · CATÁLOGO: todos los productos, con buscador y todas las categorías en botones;
 *  · las categorías las crea el dueño desde su panel (Artesanías, Ropa amazónica, Accesorios, Recuerdos…).
 *
 * Comparte motor (catálogo, carrito, WhatsApp, ofertas, combos, medidas/tallas) con las demás plantillas del motor compartido.
 */
export default function BazarTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);

  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'menu', initialTab);
  const [busqueda, setBusqueda] = useState('');
  const selectedProduct = c.detalle;

  const TABS = [
    { id: 'menu', label: 'Bazar' },
    { id: 'catalogo', label: 'Catálogo' },
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

  // Ir a una pestaña (y, si se indica, a una categoría del catálogo).
  const ir = (tab: string, categoria?: string) => {
    setActiveTab(tab);
    c.setActiveCategory(categoria ?? 'all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // La búsqueda ignora mayúsculas y acentos ("artesania" encuentra "Artesanías").
  const sinAcentos = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = sinAcentos(busqueda.trim());
  // Busca en el nombre, la descripción y el nombre de la categoría del producto.
  const nombreCategoria = (id: string) => c.categoryTabs.find((x) => x.id === id)?.label ?? '';
  const resultados = c.filtered.filter((p) => !q || sinAcentos(`${p.name} ${p.desc} ${nombreCategoria(p.category)}`).includes(q));

  // Portada del comercio (entera, con la misma imagen desenfocada rellenando lo que sobre) y hasta 3 ofertas como diapositivas
  // que pasan solas. Si la tienda no subió banner (le queda el de fábrica de la plantilla), no se muestra la portada: solo
  // salen sus propios datos, no el contenido de ejemplo.
  const ofertas = c.combosYOfertas ?? [];
  // La oferta que termina primero marca la cuenta regresiva (solo si el dueño le puso fecha de fin).
  const finOferta = ofertas.map((p) => p.ofertaHasta).filter((f): f is string => !!f).sort()[0];
  const slides: { key: string; contenido: React.ReactNode }[] = [];
  if (store.heroImage !== PORTADA_DE_FABRICA || store.demoDePlantilla) {
    slides.push({
      key: 'portada',
      contenido: (
        <div className="relative overflow-hidden">
          <img aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" alt="" src={store.heroImage} />
          <section className="relative w-full md:h-[clamp(190px,21vw,290px)]">
            <img className="relative w-full h-auto max-h-[34vh] object-contain md:h-full md:max-h-none" alt={store.heroAlt} src={store.heroImage} />
          </section>
        </div>
      ),
    });
  }
  ofertas.slice(0, 3).forEach((p) => {
    const pct = p.priceAnterior && p.priceAnterior > p.price ? porcentajeOferta(p.priceAnterior, p.price) : '';
    slides.push({
      key: `oferta-${p.id}`,
      contenido: (
        <button
          type="button"
          onClick={() => c.abrirProducto(p)}
          className="relative overflow-hidden w-full h-[200px] md:h-[clamp(190px,21vw,290px)] grid grid-cols-2 grid-rows-1 items-center text-left"
          style={{ background: `linear-gradient(135deg, ${t.secondary}, ${t.primary})`, color: '#fff' }}
        >
          <span className="p-5 md:p-10 flex flex-col gap-2 min-w-0">
            <span className="self-start text-[11px] font-black px-2 py-0.5 rounded-md bg-white/20">{p.esCombo ? '🔥 COMBO' : 'OFERTA'} {pct}</span>
            <span className="text-lg md:text-3xl font-bold leading-tight line-clamp-3" style={{ fontFamily: t.fontHeadline }}>{p.name}</span>
            <span className="text-xl md:text-2xl font-black">
              {soles(p.price)} {p.priceAnterior && <span className="text-sm font-medium line-through opacity-70">{soles(p.priceAnterior)}</span>}
            </span>
            <span className="self-start text-xs font-bold px-3 py-1.5 rounded-full bg-white" style={{ color: t.primary }}>Ver producto</span>
          </span>
          <span className="relative h-full min-h-0">
            <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-contain p-4 drop-shadow-xl" />
          </span>
        </button>
      ),
    });
  });

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
        onSelect={(id) => ir(id)}
        cartCount={c.cartCount}
        onCarrito={() => setActiveTab('pedidos')}
        ctaLabel="Ver catálogo"
        onCta={() => ir('catalogo')}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── BAZAR ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">

            {/* Portada: el banner del comercio se muestra ENTERO, en la proporción que tenga, con la misma imagen
                desenfocada rellenando lo que sobre. Si la tienda no subió banner (le queda el de fábrica de la plantilla),
                no se muestra: solo salen sus propios datos, no el contenido de ejemplo. */}
            {slides.length > 0 && (
              <div className="relative">
                <BannerSlider slides={slides} />
                <StoreFloatingActions store={store} />
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

            {/* Combos y ofertas (módulo Promociones), siempre primero. */}
            {c.combosYOfertas && c.combosYOfertas.length > 0 && (
              <CombosCarrusel
                t={t}
                productos={c.combosYOfertas}
                titulo={c.comboLabel}
                onSelect={c.abrirProducto}
                onAdd={c.addToCart}
                onVerMas={() => ir('catalogo', '__combos__')}
                extra={finOferta ? <CuentaRegresiva t={t} hasta={finOferta} /> : undefined}
              />
            )}

            {/* Cada categoría con su título y UNA fila que se desliza de lado. En computadora (pantalla ancha CON mouse) van de a dos
                lado a lado; en tablet y celular, una categoría por fila (una tablet horizontal también pasa de 1024 px, por eso se mira el mouse). */}
            <div className="[@media(hover:hover)_and_(min-width:1024px)]:grid [@media(hover:hover)_and_(min-width:1024px)]:grid-cols-2 [@media(hover:hover)_and_(min-width:1024px)]:gap-x-2 [@media(hover:hover)_and_(min-width:1024px)]:items-start">
              {c.categoryTabs
              .filter((x) => x.id !== 'all' && x.id !== '__combos__')
              .map((cat) => {
                const deLaCategoria = c.products.filter((p) => p.category === cat.id);
                if (deLaCategoria.length === 0) return null;
                return (
                  <section key={cat.id} className="pt-4 min-w-0">
                    <div className="px-5 md:px-6 flex items-center justify-between gap-3 mb-2">
                      <h2 className={`${TXT.lead} font-black tracking-tight`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>{cat.label}</h2>
                      <button
                        onClick={() => ir('catalogo', cat.id)}
                        className={`${TXT.small} font-bold flex items-center gap-0.5 hover:underline active:scale-95 transition-transform`}
                        style={{ color: t.primary }}
                      >
                        Ver todos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                    <FilaDeslizable t={t}>
                      <ProductGrid t={t} productos={deLaCategoria} onSelect={c.abrirProducto} onAdd={c.addToCart} carrusel />
                    </FilaDeslizable>
                  </section>
                );
              })}
            </div>

            {/* Al final: ir al catálogo completo. */}
            {c.products.length > 0 && (
              <section className="px-5 md:px-6 pt-6 flex justify-center">
                <button
                  onClick={() => ir('catalogo')}
                  className={`px-8 py-3 rounded-full font-bold ${TXT.body} flex items-center gap-2 shadow-md active:scale-95 transition-transform`}
                  style={{ background: t.primary, color: t.onPrimary }}
                >
                  <span className={`material-symbols-outlined ${ICON.md}`}>grid_view</span>
                  Ver todo el catálogo
                </button>
              </section>
            )}
          </div>
        )}

        {/* ─── CATÁLOGO ─── */}
        {activeTab === 'catalogo' && (
          <div className="animate-fade-in">
            <section className="px-5 md:px-6 pt-4 max-w-3xl mx-auto">
              <label className="flex items-center gap-2 rounded-2xl px-4 py-3 shadow-sm" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}>
                <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.onSurfaceVariant }}>search</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Busca un producto…"
                  aria-label="Buscar productos"
                  className={`flex-1 min-w-0 bg-transparent outline-none ${TXT.body}`}
                  style={{ color: t.onSurface }}
                />
                {busqueda && (
                  <button type="button" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda" className="active:scale-90 transition-transform">
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ color: t.onSurfaceVariant }}>close</span>
                  </button>
                )}
              </label>
            </section>

            <ChipsCategoria t={t} tabs={c.categoryTabs} active={c.activeCategory} onSelect={c.setActiveCategory} />

            <div className="px-5 md:px-6 flex items-baseline justify-between gap-3 pb-3">
              <h2 className={`${TXT.title} font-black tracking-tight`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>
                {q ? `Resultados para «${busqueda.trim()}»` : (c.categoryTabs.find((x) => x.id === c.activeCategory)?.label ?? 'Catálogo')}
              </h2>
              <span className={`${TXT.small} font-semibold`} style={{ color: t.onSurfaceVariant }}>
                {resultados.length} {resultados.length === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            <section className="px-5 md:px-6 pb-8">
              <ProductGrid
                t={t}
                productos={resultados}
                onSelect={c.abrirProducto}
                onAdd={c.addToCart}
                catalogo
                onVerTodo={() => { setBusqueda(''); c.setActiveCategory('all'); }}
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
            onIrAlMenu={() => ir('catalogo')}
            whatsappVisible={c.whatsappVisible}
            entregaDisponible={store.entrega}
            catalogo
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
            { icon: 'grid_view', label: 'Catálogo', onClick: () => ir('catalogo') },
            { icon: 'chat', label: 'Contacto', onClick: () => setActiveTab('contacto') },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'menu', icon: 'storefront', label: 'Bazar' },
          { id: 'catalogo', icon: 'grid_view', label: 'Catálogo' },
          { id: 'pedidos', icon: 'shopping_cart', label: 'Pedidos' },
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={(id) => ir(id)}
        cartCount={c.cartCount}
      />

      <ProductModal t={t} producto={selectedProduct} productos={c.products} onSelect={c.abrirProducto} onClose={c.cerrarProducto} onAdd={c.addToCart} onConsultar={(p) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, quiero consultar por "${p.name}".`)} />
    </div>
  );
}
