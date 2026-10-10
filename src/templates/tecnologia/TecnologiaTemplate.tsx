'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import BannerSlider from '../shared/BannerSlider';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import { TXT, ICON, soles, type Producto } from '../shared/tokens';
import { porcentajeOferta } from '@/lib/ofertas';
import { FilaDeslizable, ChipsCategoria } from '../shared/CarruselUI';
import {
  ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter,
} from '../shared/CatalogoUI';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

/** Portada de fábrica de la plantilla: solo se muestra en la vista previa; una tienda real sin banner propio no la muestra. */
const PORTADA_DE_FABRICA = '/templates/tecnologia-portada.svg';

type Tema = StoreConfig['theme'];

const descuento = (p: Producto) => (p.priceAnterior && p.priceAnterior > p.price ? porcentajeOferta(p.priceAnterior, p.price) : '');

/** Cuenta regresiva hasta el fin de una oferta (último día, hora de Perú). Se arma ya en el navegador (usa la hora actual). */
function CuentaRegresiva({ t, hasta }: { t: Tema; hasta: string }) {
  const [resta, setResta] = useState<number | null>(null);
  useEffect(() => {
    const fin = new Date(`${hasta}T23:59:59-05:00`).getTime();
    const tick = () => setResta(Math.max(0, fin - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasta]);
  if (resta === null || resta <= 0) return null;
  const dias = Math.floor(resta / 86400000);
  const horas = Math.floor((resta % 86400000) / 3600000);
  const min = Math.floor((resta % 3600000) / 60000);
  const seg = Math.floor((resta % 60000) / 1000);
  const dos = (n: number) => String(n).padStart(2, '0');
  const partes: [string, string][] = [...(dias > 0 ? [[String(dias), 'Día' + (dias === 1 ? '' : 's')] as [string, string]] : []), [dos(horas), 'Hra'], [dos(min), 'Min'], [dos(seg), 'Seg']];
  return (
    <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums" style={{ background: t.secondary, color: '#fff' }} aria-label="Tiempo que queda de la oferta">
      {partes.map(([n, u], i) => (
        <React.Fragment key={u}>
          {i > 0 && <span className="opacity-60">:</span>}
          <span>{n} <span className="font-medium opacity-70">{u}</span></span>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Plantilla "Tienda de Tecnología" (celulares, laptops, audio, gaming, accesorios).
 *
 *  · INICIO: portada, buscador, ofertas y una fila que se desliza de lado por cada categoría, y al final un botón para ir al
 *    catálogo completo. Así el cliente ve de todo sin entrar a nada.
 *  · CATÁLOGO: todas las categorías en botones, buscador y la grilla con todos los productos.
 * Modelos con varias capacidades (128 GB / 256 GB) van como presentaciones; las fichas técnicas, en la descripción (una línea
 * por dato). Comparte motor (catálogo, carrito, WhatsApp, ofertas, otras monedas) con las demás plantillas del motor compartido.
 */
export default function TecnologiaTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);

  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'home', initialTab);
  const [busqueda, setBusqueda] = useState('');
  const selectedProduct = c.detalle;

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'contacto', label: 'Contacto' },
  ];

  const ir = (tab: string, categoria?: string) => {
    setActiveTab(tab);
    c.setActiveCategory(categoria ?? 'all');
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

  // Escribir en el buscador del inicio lleva al catálogo, donde están los resultados.
  const buscar = (texto: string) => {
    setBusqueda(texto);
    if (texto.trim() && activeTab !== 'catalogo') {
      setActiveTab('catalogo');
      c.setActiveCategory('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // La búsqueda ignora mayúsculas y acentos ("audifonos" encuentra "Audífonos").
  const sinAcentos = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = sinAcentos(busqueda.trim());
  // Busca en el nombre, la descripción y el nombre de la categoría del producto.
  const nombreCategoria = (id: string) => c.categoryTabs.find((x) => x.id === id)?.label ?? '';
  const resultados = c.filtered.filter((p) => !q || sinAcentos(`${p.name} ${p.desc} ${nombreCategoria(p.category)}`).includes(q));
  const categorias = c.categoryTabs.filter((x) => x.id !== 'all' && x.id !== '__combos__');
  const hayPortada = store.heroImage !== PORTADA_DE_FABRICA || store.demoDePlantilla;

  const buscador = (
    <label
      className="flex items-center gap-2 rounded-2xl px-4 py-3 shadow-sm"
      style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}
    >
      <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.onSurfaceVariant }}>search</span>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => buscar(e.target.value)}
        placeholder="Busca un producto, marca o modelo…"
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
  );

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <StoreHeader
        store={store}
        tabs={TABS}
        active={activeTab}
        onSelect={(id) => ir(id)}
        cartCount={c.cartCount}
        onCarrito={() => ir('pedidos')}
        ctaLabel="Ver catálogo"
        onCta={() => ir('catalogo')}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {/* ─── INICIO ─── (cada bloque solo aparece si hay contenido para él) */}
        {activeTab === 'home' && (() => {
          const ofertas = [...(c.combosYOfertas ?? [])];
          // "Lo último": los cargados más recientemente (si la tienda no trae la fecha, los últimos de la lista).
          const ultimos = (c.products.some((p) => p.creado)
            ? [...c.products].filter((p) => p.creado).sort((x, y) => String(y.creado).localeCompare(String(x.creado)))
            : [...c.products].reverse()
          ).slice(0, 8);
          // La oferta que termina primero marca la cuenta regresiva (solo si el dueño le puso fecha de fin).
          const fin = ofertas.map((p) => p.ofertaHasta).filter((f): f is string => !!f).sort()[0];

          const slides: { key: string; contenido: React.ReactNode }[] = [];
          if (hayPortada) {
            slides.push({
              key: 'portada',
              contenido: (
                <div className="relative overflow-hidden">
                  <img aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70" alt="" src={store.heroImage} />
                  <section className="relative w-full md:h-[clamp(240px,30vw,430px)]">
                    <img className="relative w-full h-auto max-h-[60vh] object-contain md:h-full md:max-h-none" alt={store.heroAlt} src={store.heroImage} />
                  </section>
                </div>
              ),
            });
          }
          ofertas.slice(0, 3).forEach((p) => {
            slides.push({
              key: `oferta-${p.id}`,
              contenido: (
                <button
                  type="button"
                  onClick={() => c.abrirProducto(p)}
                  className="relative overflow-hidden w-full flex-1 min-h-[220px] md:min-h-[clamp(240px,30vw,430px)] grid grid-cols-2 grid-rows-1 items-center text-left"
                  style={{ background: `linear-gradient(135deg, ${t.secondary}, ${t.primary})`, color: '#fff' }}
                >
                  <span className="p-5 md:p-10 flex flex-col gap-2 min-w-0">
                    <span className="self-start text-[11px] font-black px-2 py-0.5 rounded-md bg-white/20">{p.esCombo ? '🔥 COMBO' : 'OFERTA'} {descuento(p)}</span>
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

          return (
            <div className="animate-fade-in">
              <section className="px-5 md:px-6 pt-4 max-w-3xl mx-auto">{buscador}</section>

              {slides.length > 0 && (
                <div className="relative mt-4">
                  <BannerSlider slides={slides} />
                  <StoreFloatingActions store={store} />
                </div>
              )}

              {ultimos.length > 0 && (
                <section className="pt-6">
                  <div className="px-5 md:px-6 flex items-center justify-between gap-3 mb-3">
                    <h2 className={`${TXT.lead} font-bold tracking-tight`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>Lo último</h2>
                    <button onClick={() => ir('catalogo')} className={`${TXT.small} font-bold flex items-center gap-0.5 hover:underline active:scale-95 transition-transform`} style={{ color: t.primary }}>
                      Ver todos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                  <FilaDeslizable t={t}>
                    <ProductGrid t={t} productos={ultimos} onSelect={c.abrirProducto} onAdd={c.addToCart} carrusel />
                  </FilaDeslizable>
                </section>
              )}

              {ofertas.length > 0 && (
                <section className="pt-6">
                  <div className="px-5 md:px-6 flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <h2 className={`${TXT.lead} font-bold tracking-tight flex items-center gap-1.5`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>
                      <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>bolt</span>
                      ¡Ofertas relámpago!
                    </h2>
                    <div className="flex items-center gap-3">
                      {fin && <CuentaRegresiva t={t} hasta={fin} />}
                      <button onClick={() => ir('catalogo', '__combos__')} className={`${TXT.small} font-bold flex items-center gap-0.5 hover:underline`} style={{ color: t.primary }}>
                        Ver todas <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                  <FilaDeslizable t={t}>
                    <ProductGrid t={t} productos={ofertas} onSelect={c.abrirProducto} onAdd={c.addToCart} carrusel />
                  </FilaDeslizable>
                </section>
              )}

              {/* Una fila por categoría con productos, que se desliza de lado. */}
              {categorias.map((cat) => {
                const deLaCategoria = c.products.filter((p) => p.category === cat.id);
                if (deLaCategoria.length === 0) return null;
                return (
                  <section key={cat.id} className="pt-6">
                    <div className="px-5 md:px-6 flex items-center justify-between gap-3 mb-3">
                      <h2 className={`${TXT.lead} font-bold tracking-tight flex items-center gap-2`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>
                        {cat.icon && <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.primary }}>{cat.icon}</span>}
                        {cat.label}
                      </h2>
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

              {/* Al final: ir al catálogo completo. */}
              {c.products.length > 0 && (
                <section className="px-5 md:px-6 pt-8 flex justify-center">
                  <button
                    onClick={() => ir('catalogo')}
                    className={`px-8 py-3.5 rounded-full font-bold ${TXT.body} flex items-center gap-2 shadow-md active:scale-95 transition-transform`}
                    style={{ background: t.primary, color: t.onPrimary }}
                  >
                    <span className={`material-symbols-outlined ${ICON.md}`}>grid_view</span>
                    Ver todo el catálogo
                  </button>
                </section>
              )}
            </div>
          );
        })()}

        {/* ─── CATÁLOGO ─── */}
        {activeTab === 'catalogo' && (
          <div className="animate-fade-in">
            <section className="px-5 md:px-6 pt-5 max-w-3xl mx-auto">{buscador}</section>

            <ChipsCategoria t={t} tabs={c.categoryTabs} active={c.activeCategory} onSelect={c.setActiveCategory} />

            <div className="px-5 md:px-6 flex items-baseline justify-between gap-3 pb-3">
              <h2 className={`${TXT.title} font-bold tracking-tight`} style={{ color: t.onSurface, fontFamily: t.fontHeadline }}>
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
            { icon: 'chat', label: 'Contacto', onClick: () => ir('contacto') },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'home', icon: 'home', label: 'Inicio' },
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
