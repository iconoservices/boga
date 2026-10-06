'use client';

import React, { useState } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';
import StoreHeader from '../shared/StoreHeader';
import { useCatalogo } from '../shared/useCatalogo';
import { useTabRuta } from '../shared/useTabRuta';
import ReservaModal from '../shared/ReservaModal';
import { TXT, ICON, soles, type Producto } from '../shared/tokens';
import { CategoryChips, ProductGrid, ProductModal, CartPanel, ContactPanel, BottomNav, StoreFooter } from '../shared/CatalogoUI';
import OtrosPrecios from '../shared/OtrosPrecios';

interface Props {
  store: StoreConfig;
  initialProductId?: string;
  /** Pestaña con la que abre (desde /<tienda>/<sección>). */
  initialTab?: string;
}

const PASOS = [
  { icon: 'checklist', titulo: 'Elige tu servicio', texto: 'Mira la carta con sus precios y duración.' },
  { icon: 'event', titulo: 'Escoge día y hora', texto: 'Solo se muestran las horas libres.' },
  { icon: 'chat', titulo: 'Confirma por WhatsApp', texto: 'Te respondemos para dejar tu cita lista.' },
];

/**
 * Plantilla "Salón de Belleza" (uñas, cabello, cejas y pestañas, spa…): la carta es de SERVICIOS con precio y
 * duración, y se reservan con fecha y hora (ReservaModal → /api/reservas → /admin/reservas). Los productos
 * (esmaltes, cremas) van aparte, con carrito, y solo aparecen si la tienda los tiene.
 * Servicio = fila de `products` con es_servicio = true; la duración se anota en subcategory.
 */
export default function BellezaTemplate({ store, initialProductId, initialTab }: Props) {
  const t = store.theme;
  const c = useCatalogo(store, initialProductId);
  const [activeTab, setActiveTab] = useTabRuta(store.slug, 'home', initialTab);
  const [reservando, setReservando] = useState<Producto | null>(null);

  const servicios = c.products.filter((p) => p.esServicio);
  const productos = c.products.filter((p) => !p.esServicio);
  const hayProductos = productos.length > 0;

  // Chips por pestaña: solo categorías que tienen algo de ese tipo (una vacía parece un error).
  const chipsDe = (lista: Producto[]) => c.categoryTabs.filter((cat) => cat.id === 'all' || lista.some((p) => p.category === cat.id));
  const filtrar = (lista: Producto[]) => (c.activeCategory === 'all' ? lista : lista.filter((p) => p.category === c.activeCategory));

  const TABS = [
    { id: 'home', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    ...(hayProductos ? [{ id: 'productos', label: 'Productos' }, { id: 'pedidos', label: 'Pedidos' }] : []),
    { id: 'contacto', label: 'Contacto' },
  ];

  const ir = (tab: string, cat?: string) => {
    setActiveTab(tab);
    c.setActiveCategory(cat ?? 'all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Un servicio no se agrega al carrito: tocarlo abre la reserva.
  const reservar = (p?: Producto) => {
    const elegido = p ?? servicios[0] ?? null;
    if (!elegido) { enviarPedidoPorWhatsApp(store, `¡Hola ${store.name}! Quisiera reservar una cita.`); return; }
    c.cerrarProducto();
    setReservando(elegido);
  };

  const compartir = () => {
    if (navigator.share) navigator.share({ title: store.name, text: store.tagline, url: window.location.href }).catch(() => {});
    else { navigator.clipboard?.writeText(window.location.href); alert('Enlace copiado ✅'); }
  };

  const filas = [
    ...(store.horario ? [{ label: 'Horario', valor: store.horario }] : []),
    ...(store.direccion ? [{ label: 'Dirección', valor: store.direccion }] : []),
    ...(store.zona ? [{ label: 'Zona', valor: store.zona }] : []),
  ];

  const destacados = servicios.slice(0, 8);
  const duracion = (p: Producto) => p.extra?.area || '';

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
        onCarrito={() => (hayProductos ? setActiveTab('pedidos') : reservar())}
        ctaLabel="Reservar cita"
        onCta={() => reservar()}
      />

      <main className="pt-16 md:pt-[60px] pb-24 md:pb-12">

        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* ══ PORTADA ══ */}
            <section className="relative w-full h-[44vh] md:h-[400px] overflow-hidden">
              <img className="w-full h-full object-cover" alt={store.heroAlt} src={store.heroImage} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.secondary}ee 0%, ${t.secondary}55 55%, transparent 100%)` }} />
              <StoreFloatingActions store={store} />
              <div className="absolute bottom-0 left-0 right-0 px-5 md:px-8 pb-6 max-w-3xl md:mx-auto">
                <h1 className="font-black text-2xl md:text-4xl leading-tight text-white">{store.name}</h1>
                <p className={`${TXT.body} font-semibold text-white/90 mt-1`}>{store.tagline || 'Tu momento de belleza, con cita'}</p>
                <button
                  onClick={() => reservar()}
                  className={`mt-4 px-7 py-3 rounded-full font-extrabold ${TXT.body} shadow-xl active:scale-95 transition-all flex items-center gap-2`}
                  style={{ background: t.primary, color: t.onPrimary }}
                >
                  <span className={`material-symbols-outlined ${ICON.sm}`}>event_available</span>
                  Reservar mi cita
                </button>
              </div>
            </section>

            {/* ══ SERVICIOS DESTACADOS ══ */}
            {destacados.length > 0 && (
              <section className="pt-8 max-w-3xl md:mx-auto">
                <div className="flex items-center justify-between px-5 md:px-6 mb-3">
                  <h2 className={`${TXT.title} font-black`}>Nuestros servicios</h2>
                  <button onClick={() => ir('servicios')} className={`${TXT.small} font-bold`} style={{ color: t.primary }}>Ver todos</button>
                </div>
                <div className="flex gap-3 overflow-x-auto px-5 md:px-6 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
                  {destacados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => c.abrirProducto(p)}
                      className="snap-start shrink-0 w-40 rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-all"
                      style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}
                    >
                      <img src={p.image} alt={p.name} className="w-full h-28 object-cover" />
                      <div className="p-2.5">
                        <p className={`${TXT.small} font-extrabold line-clamp-2`}>{p.name}</p>
                        <p className={`${TXT.micro} font-bold mt-1`} style={{ color: t.primary }}>
                          {p.price > 0 ? soles(p.price) : 'Consultar'}{duracion(p) ? ` · ${duracion(p)}` : ''}
                        </p>
                        {p.price > 0 && <OtrosPrecios precios={p.preciosMoneda} className={TXT.micro} style={{ color: t.onSurfaceVariant }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ══ FICHA ══ */}
            {filas.length > 0 && (
              <section className="mt-8" style={{ background: t.surface, borderTop: `1px solid ${t.outlineVariant}`, borderBottom: `1px solid ${t.outlineVariant}` }}>
                <div className="px-5 md:px-8 max-w-3xl md:mx-auto divide-y" style={{ borderColor: `${t.outlineVariant}` }}>
                  {filas.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-4 py-3">
                      <span className={`${TXT.small} font-semibold shrink-0`} style={{ color: t.onSurfaceVariant }}>{f.label}</span>
                      <span className={`${TXT.small} font-bold text-right`}>{f.valor}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ══ CÓMO RESERVAR ══ */}
            <section className="px-5 md:px-6 pt-10 max-w-3xl md:mx-auto">
              <h2 className={`${TXT.title} font-black mb-4`}>Reservar es muy fácil</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PASOS.map((p, i) => (
                  <div key={p.titulo} className="p-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: t.primary, color: t.onPrimary }}>
                      <span className={`material-symbols-outlined ${ICON.md}`}>{p.icon}</span>
                    </div>
                    <p className={`${TXT.body} font-extrabold`}>{i + 1}. {p.titulo}</p>
                    <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>{p.texto}</p>
                  </div>
                ))}
              </div>
            </section>

            {hayProductos && (
              <section className="px-5 md:px-6 pt-10 max-w-3xl md:mx-auto">
                <button
                  onClick={() => ir('productos')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.98] transition-all"
                  style={{ background: t.secondaryContainer }}
                >
                  <span className={`material-symbols-outlined ${ICON.lg}`} style={{ color: t.primary }}>shopping_bag</span>
                  <span className="flex-1">
                    <span className={`${TXT.body} font-extrabold block`}>También vendemos productos</span>
                    <span className={`${TXT.small} block`} style={{ color: t.onSurfaceVariant }}>Cuidado para llevar a casa</span>
                  </span>
                  <span className={`material-symbols-outlined ${ICON.md}`} style={{ color: t.onSurfaceVariant }}>chevron_right</span>
                </button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'servicios' && (
          <div className="animate-fade-in">
            <div className="px-5 md:px-6 pt-6 pb-1">
              <h2 className="font-black text-2xl md:text-3xl">Nuestros servicios</h2>
              <p className={`${TXT.small} mt-1`} style={{ color: t.onSurfaceVariant }}>Toca un servicio para ver el detalle y reservar tu hora.</p>
            </div>
            <CategoryChips t={t} tabs={chipsDe(servicios)} active={c.activeCategory} onSelect={c.setActiveCategory} />
            <section className="px-5 md:px-6 pb-8">
              <ProductGrid t={t} productos={filtrar(servicios)} onSelect={c.abrirProducto} onAdd={c.addToCart} onVerTodo={() => c.setActiveCategory('all')} servicios />
            </section>
          </div>
        )}

        {activeTab === 'productos' && hayProductos && (
          <div className="animate-fade-in">
            <div className="px-5 md:px-6 pt-6 pb-1">
              <h2 className="font-black text-2xl md:text-3xl">Productos</h2>
            </div>
            <CategoryChips t={t} tabs={chipsDe(productos)} active={c.activeCategory} onSelect={c.setActiveCategory} />
            <section className="px-5 md:px-6 pb-8">
              <ProductGrid t={t} productos={filtrar(productos)} onSelect={c.abrirProducto} onAdd={c.addToCart} onVerTodo={() => c.setActiveCategory('all')} catalogo />
            </section>
          </div>
        )}

        {activeTab === 'pedidos' && hayProductos && (
          <CartPanel
            t={t}
            catalogo
            cartItems={c.cartItems}
            subtotal={c.subtotal}
            onAdd={c.addToCart}
            onRemove={c.removeFromCart}
            onVaciar={c.vaciarCarrito}
            onConfirmar={c.confirmarPedido}
            pagoOnline={c.cobraOnline}
            onPagarOnline={c.pagarOnline}
            onIrAlMenu={() => ir('productos')}
            whatsappVisible={c.whatsappVisible}
            entregaDisponible={store.entrega}
          />
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
            onEnviar={(d) => enviarPedidoPorWhatsApp(store, `Hola ${store.name}, soy ${d.nombre} (${d.telefono}).\n\n${d.mensaje}`)}
          />
        )}

        <StoreFooter
          t={t}
          storeName={store.name}
          acciones={[
            { icon: 'share', label: 'Compartir', onClick: compartir },
            { icon: 'spa', label: 'Servicios', onClick: () => ir('servicios') },
            { icon: 'event_available', label: 'Reservar', onClick: () => reservar() },
          ]}
        />
      </main>

      <BottomNav
        t={t}
        tabs={[
          { id: 'home', icon: 'home', label: 'Inicio' },
          { id: 'servicios', icon: 'spa', label: 'Servicios' },
          ...(hayProductos ? [{ id: 'pedidos', icon: 'shopping_bag', label: 'Pedidos' }] : []),
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
        cartCount={c.cartCount}
      />

      <ProductModal
        t={t}
        producto={c.detalle}
        productos={c.products}
        onSelect={c.abrirProducto}
        onClose={c.cerrarProducto}
        onAdd={c.addToCart}
        onConsultar={(p) => reservar(p)}
        textoConsultar={{ texto: 'Reservar cita', icono: 'event_available' }}
      />

      <ReservaModal store={store} servicios={servicios} inicial={reservando} onClose={() => setReservando(null)} />
    </div>
  );
}
