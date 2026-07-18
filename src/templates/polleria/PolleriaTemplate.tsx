'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';
import { getDemoProducts } from '@/lib/templates.config';
import { enviarPedidoPorWhatsApp, tieneWhatsApp } from '@/lib/whatsapp';

interface PolleriaTemplateProps {
  store: StoreConfig;
}

interface Producto {
  id: string;
  name: string;
  desc: string;
  /** Numerico: el carrito necesita sumar, no puede guardar "S/ 22.90". */
  price: number;
  /** Siempre el `href` de la categoria de la tienda, para que case con los chips. */
  category: string;
  image: string;
}

/**
 * Escala tipografica unica de la plantilla.
 * Antes convivian text-[9px], text-[10px], text-[11px], text-[13px], text-xs y
 * text-sm sin criterio; cualquier ajuste habia que perseguirlo por todo el archivo.
 */
const TXT = {
  micro: 'text-[11px]',
  small: 'text-xs',
  body: 'text-sm',
  lead: 'text-base',
  title: 'text-lg',
} as const;

/**
 * Escala de iconos. Antes se mezclaban clases (text-sm, text-base, text-lg) con
 * `style={{ fontSize: '11px' }}`, asi que dos iconos "iguales" no median igual.
 */
const ICON = {
  xs: 'text-[13px]',
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
  xl: 'text-[32px]',
} as const;

/**
 * Datos que la plantilla muestra pero que todavia no existen en StoreConfig.
 * Estan aca juntos y no repartidos por el JSX para que se vea que son de relleno
 * y para poder reemplazarlos de una sola vez cuando la tienda pueda cargarlos.
 */
const INFO_LOCAL = {
  zona: 'Miraflores',
  horarioCorto: '12–11PM',
  horarioLargo: 'Lunes a Domingo: 12:00 PM – 11:00 PM',
  direccion: 'Av. Fuego y Brasa 1995, Miraflores, Lima',
  rating: 4.8,
};

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

export default function PolleriaTemplate({ store }: PolleriaTemplateProps) {
  const t = store.theme;
  const { isDemoVisible } = useDemo();
  // Booleano estable: isDemoVisible cambia de identidad en cada render del
  // provider y como dependencia del efecto disparaba refetches en bucle.
  const demoActivo = isDemoVisible(store.slug);

  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Producto[]>([]);
  // id del producto -> cantidad. Antes era un contador suelto y el resumen del
  // pedido mostraba siempre "Pollo a la Brasa" a S/ 22.90 sin importar que agregaras.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Clave estable de las categorias: store.categories es un array nuevo en cada
  // render del padre y como dependencia reejecutaba la carga sin parar.
  const catsKey = JSON.stringify(store.categories ?? []);
  const categorias = useMemo(
    () => JSON.parse(catsKey) as { name: string; icon: string; href: string }[],
    [catsKey]
  );

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleInstalled = () => {
      localStorage.setItem('boga_pwa_installed', 'true');
      setIsInstalled(true);
    };

    const checkInstalled = () => {
      if (localStorage.getItem('boga_pwa_installed') === 'true') return true;
      if ((window.navigator as any).standalone) return true;
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      return false;
    };

    setIsInstalled(checkInstalled());

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      // Antes se pasaba una funcion nueva y el listener quedaba colgado.
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    } else {
      const ua = navigator.userAgent.toLowerCase();
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (/iphone|ipad|ipod/.test(ua) && isSafari) {
        alert('Para instalar:\n\n1. Tocá el icono Compartir (📤) abajo\n2. Deslizá y tocá "Agregar a pantalla de inicio"\n3. Tocá "Agregar"');
      } else {
        alert('Para instalar:\n\n1. Abrí el menú del navegador (⋯)\n2. Buscá "Agregar a pantalla de inicio"\n3. Confirmá la instalación');
      }
    }
  };

  // ── Carga de productos ──
  // Los demo salen de templates.config (getDemoProducts) y no de una lista propia:
  // la lista propia de esta plantilla se habia desincronizado del config y por eso
  // la categoria "Bebidas" quedaba vacia.
  useEffect(() => {
    const hrefDeCategoria = (nombre: string) =>
      categorias.find((c) => c.name === nombre)?.href ?? (nombre || '').toLowerCase();

    const cargar = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);

      const deLaBase: Producto[] = data && !error
        ? data.map((p) => ({
            id: String(p.id),
            name: p.name,
            // Antes se descartaba y las fichas quedaban con un hueco vacio.
            desc: p.description || '',
            price: Number(p.price) || 0,
            category: hrefDeCategoria(p.category),
            image: p.image || store.heroImage,
          }))
        : [];

      const demo: Producto[] = demoActivo
        ? getDemoProducts(store.template).map((p, i) => ({
            id: `demo-${i}`,
            name: p.name,
            desc: p.description || '',
            price: p.price,
            category: hrefDeCategoria(p.category),
            image: p.image,
          }))
        : [];

      setProducts([...deLaBase, ...demo]);
    };

    cargar();
  }, [store.slug, store.template, store.heroImage, demoActivo, categorias]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Modal: bloquea el scroll del fondo y cierra con Escape.
  useEffect(() => {
    if (!selectedProduct) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedProduct(null); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedProduct]);

  // ── Carrito derivado ──
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ producto: products.find((p) => p.id === id), qty }))
        .filter((l): l is { producto: Producto; qty: number } => Boolean(l.producto)),
    [cart, products]
  );
  const cartCount = cartItems.reduce((n, l) => n + l.qty, 0);
  const subtotal = cartItems.reduce((n, l) => n + l.producto.price * l.qty, 0);

  const addToCart = (p: Producto) => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
  const removeFromCart = (id: string) =>
    setCart((c) => {
      const qty = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const confirmarPedido = () => {
    const lineas = cartItems
      .map((l) => `• ${l.qty}x ${l.producto.name} — ${soles(l.producto.price * l.qty)}`)
      .join('\n');
    enviarPedidoPorWhatsApp(
      store,
      `¡Hola ${store.name}! Quiero hacer este pedido:\n\n${lineas}\n\nTotal: ${soles(subtotal)}`
    );
  };

  // ── Categorias y filtrado ──
  // Los chips salen de las categorias reales de la tienda. Antes estaban escritos
  // a mano ('brasa', 'combos'...) asi que los productos cargados desde el panel
  // no casaban con ningun chip y solo aparecian en "Todos".
  // Si la tienda no cargo categorias, se deducen del catalogo (mismo criterio que Mercado)
  // para no dejar el menu con un unico chip "Todos".
  const categoriasEfectivas = categorias.length
    ? categorias.map((c) => ({ id: c.href, label: c.name, icon: c.icon }))
    : [...new Set(products.map((p) => p.category))]
        .filter(Boolean)
        .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1), icon: 'category' }));

  const categoryTabs = [{ id: 'all', label: 'Todos', icon: 'apps' }, ...categoriasEfectivas];

  const filtered = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  // Las tarjetas del home usan las categorias de la tienda y una foto real del
  // catalogo, en vez de tres imagenes fijas que podian no tener que ver con nada.
  const categoriasDestacadas = categoriasEfectivas.slice(0, 3).map((c) => ({
    ...c,
    image: products.find((p) => p.category === c.id)?.image || store.heroImage,
  }));

  const whatsappVisible = tieneWhatsApp(store);
  const telefonoVisible = whatsappVisible ? `+${(store.whatsapp || '').replace(/\D/g, '')}` : null;

  const navToMenu = (cat?: string) => {
    setActiveTab('menu');
    if (cat) setActiveCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const compartir = () => {
    if (navigator.share) {
      navigator.share({ title: store.name, text: store.tagline, url: window.location.href });
    }
  };

  const iniciales = store.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="min-h-screen"
      style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ════════════════════════════════════════════
          DESKTOP HEADER (md+)  — hidden on mobile
          ════════════════════════════════════════════ */}
      <header
        className={`hidden md:flex fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'shadow-md py-2' : 'py-3'}`}
        style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}30` }}
      >
        <div className="max-w-[1200px] mx-auto px-6 w-full flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            {store.logoImage ? (
              <img src={store.logoImage} alt={store.name} className="w-9 h-9 rounded-lg object-cover border-2 shrink-0" style={{ borderColor: t.primary }} />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-md" style={{ background: t.primary }}>
                <span className={`font-black ${TXT.body} italic`} style={{ color: t.onPrimary }}>{iniciales}</span>
              </div>
            )}
            {/* truncate: los nombres largos empujaban el nav y el carrito fuera de pantalla */}
            <span
              className="text-xl font-black italic tracking-tight uppercase truncate max-w-[240px]"
              style={{ color: t.primary }}
            >
              {store.name}
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-8 shrink-0">
            {[
              { id: 'home', label: 'Inicio' },
              { id: 'menu', label: 'Menú' },
              { id: 'pedidos', label: 'Pedidos' },
              { id: 'contacto', label: 'Contacto' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`font-bold ${TXT.body} uppercase tracking-wide transition-all relative`}
                style={{
                  color: activeTab === item.id ? t.primary : t.onSurfaceVariant,
                  fontWeight: activeTab === item.id ? 700 : 500,
                }}
              >
                {item.label}
                {activeTab === item.id && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full" style={{ background: t.primary }} />
                )}
              </button>
            ))}
          </nav>

          {/* CTA + Cart */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navToMenu()}
              className={`font-bold px-6 py-2.5 rounded-full ${TXT.body} transition-all hover:brightness-110 active:scale-95 shadow-md`}
              style={{ background: t.primary, color: t.onPrimary, boxShadow: `0 4px 14px ${t.primary}40` }}
            >
              Pedir ahora
            </button>
            <button
              onClick={() => setActiveTab('pedidos')}
              className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: `${t.primary}15`, color: t.primary }}
              aria-label={`Ver pedido (${cartCount})`}
            >
              <span className={`material-symbols-outlined ${ICON.md}`} style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: t.primary, color: t.onPrimary }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          MOBILE HEADER — hidden on md+
          ════════════════════════════════════════════ */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-16 shadow-sm transition-all duration-300"
        style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}30` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {store.logoImage ? (
            <img src={store.logoImage} alt={store.name} className="w-9 h-9 rounded-lg object-cover border-2 shrink-0" style={{ borderColor: t.primary }} />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-md" style={{ background: t.primary }}>
              <span className={`font-black ${TXT.body} italic`} style={{ color: t.onPrimary }}>{iniciales}</span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <h1 className={`${TXT.lead} font-black italic tracking-tighter uppercase leading-none truncate`} style={{ color: t.primary }}>{store.name}</h1>
            <p className={`${TXT.micro} font-bold uppercase tracking-wider truncate`} style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
          </div>
        </div>
      </header>

      {/* ══ FLOATING BUTTONS — mobile only, top-right ══ */}
      <div className="md:hidden fixed top-20 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={compartir}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
          style={{ background: t.primary, color: t.onPrimary }}
          aria-label="Compartir"
          title="Compartir"
        >
          <span className={`material-symbols-outlined ${ICON.md}`}>share</span>
        </button>
        {!isInstalled && (
          <button
            onClick={handleInstall}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
            style={{ background: t.secondary, color: t.onPrimary }}
            aria-label="Instalar aplicación"
            title="Instalar"
          >
            <span className={`material-symbols-outlined ${ICON.md}`}>download</span>
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════════ */}
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

              {/* Hero content */}
              <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 h-full">

                {/* ══ PROFILE CARD — left side (desktop only) ══ */}
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

            {/* ══ PROFILE CARD — mobile only ══ */}
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

            {/* ══ CATEGORÍAS — 2 col mobile / 3 cols desktop ══ */}
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
            {/* Desktop menu header */}
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
                    onClick={() => setActiveCategory('all')}
                    className={`mt-4 ${TXT.small} font-bold px-6 py-2.5 rounded-full w-fit transition-colors shadow-md uppercase active:scale-95`}
                    style={{ background: t.primary, color: t.onPrimary }}
                  >
                    Ver todo el menú
                  </button>
                </div>
              </div>
            </section>

            {/* Category Chips */}
            <nav
              className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto overflow-x-auto flex gap-3 whitespace-nowrap sticky top-16 md:top-[60px] py-3 z-40"
              style={{ background: `${t.background}F0`, backdropFilter: 'blur(12px)' }}
            >
              {categoryTabs.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full shrink-0 ${TXT.small} font-bold transition-all active:scale-95 shadow-sm border`}
                    style={{
                      background: isActive ? t.primary : t.surface,
                      color: isActive ? t.onPrimary : t.onSurfaceVariant,
                      borderColor: isActive ? 'transparent' : `${t.outlineVariant}60`,
                      boxShadow: isActive ? `0 4px 12px ${t.primary}40` : 'none',
                    }}
                  >
                    <span className={`material-symbols-outlined ${ICON.sm}`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto">
              <h3 className={`${TXT.title} font-black uppercase italic tracking-tighter mb-4`} style={{ color: t.onSurface }}>
                {activeCategory === 'all' ? 'Nuestros Favoritos' : categoryTabs.find((c) => c.id === activeCategory)?.label}
              </h3>
            </div>

            {/* Product Grid */}
            <section className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto pb-8">
              {filtered.length === 0 ? (
                // Antes una categoria sin productos dejaba la pantalla en blanco
                <div className="py-16 text-center">
                  <span className={`material-symbols-outlined ${ICON.xl} mb-3 block`} style={{ color: `${t.onSurfaceVariant}80` }}>restaurant_menu</span>
                  <p className={`font-bold ${TXT.body}`} style={{ color: t.onSurface }}>Todavía no hay platos en esta categoría</p>
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`mt-4 px-6 py-2.5 rounded-full font-bold ${TXT.small} uppercase active:scale-95 transition-all`}
                    style={{ background: t.primary, color: t.onPrimary }}
                  >
                    Ver todo el menú
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="rounded-2xl overflow-hidden group relative cursor-pointer border hover:shadow-lg transition-all duration-300 flex flex-col"
                      style={{ background: t.surface, borderColor: `${t.outlineVariant}30` }}
                    >
                      <div className="aspect-square overflow-hidden relative">
                        <img
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          alt={product.name}
                          src={product.image}
                        />
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h4 className={`font-bold ${TXT.body} leading-tight mb-1 line-clamp-2`} style={{ color: t.onSurface }}>{product.name}</h4>
                        <p className={`${TXT.micro} mb-3 line-clamp-2 flex-1`} style={{ color: t.onSurfaceVariant }}>{product.desc}</p>
                        <div className="flex justify-between items-center mt-auto">
                          <span className={`font-extrabold ${TXT.lead}`} style={{ color: t.primary }}>{soles(product.price)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                            style={{ background: t.primary, color: t.onPrimary }}
                            aria-label={`Agregar ${product.name} al pedido`}
                          >
                            <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ─── TAB: PEDIDOS ─── */}
        {activeTab === 'pedidos' && (
          <div className="animate-fade-in px-5 py-8 max-w-[600px] mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-inner" style={{ backgroundColor: `${t.primary}15` }}>
              <span className={`material-symbols-outlined ${ICON.xl}`} style={{ color: t.primary }}>shopping_cart_checkout</span>
            </div>
            {cartItems.length > 0 ? (
              <div className="space-y-5 text-left p-6 rounded-3xl border shadow-sm" style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}>
                <h3 className="font-black text-xl uppercase italic border-b pb-3" style={{ color: t.primary, borderColor: `${t.outlineVariant}60` }}>
                  Resumen de tu Pedido
                </h3>

                {/* Lineas reales del carrito, con su cantidad y su precio */}
                <div className="space-y-3">
                  {cartItems.map((l) => (
                    <div key={l.producto.id} className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: `${t.outlineVariant}40` }}>
                      <img src={l.producto.image} alt={l.producto.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold ${TXT.body} leading-tight line-clamp-2`} style={{ color: t.onSurface }}>{l.producto.name}</p>
                        <p className={TXT.micro} style={{ color: t.onSurfaceVariant }}>{soles(l.producto.price)} c/u</p>
                      </div>
                      {/* Total y controles apilados: en una sola fila el nombre quedaba en "Pa..." a 375px */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`font-black ${TXT.body}`} style={{ color: t.primary }}>
                          {soles(l.producto.price * l.qty)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(l.producto.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                            style={{ background: `${t.primary}15`, color: t.primary }}
                            aria-label={`Quitar uno de ${l.producto.name}`}
                          >
                            <span className={`material-symbols-outlined ${ICON.sm}`}>remove</span>
                          </button>
                          <span className={`font-black ${TXT.body} w-5 text-center`} style={{ color: t.onSurface }}>{l.qty}</span>
                          <button
                            onClick={() => addToCart(l.producto)}
                            className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                            style={{ background: t.primary, color: t.onPrimary }}
                            aria-label={`Agregar otro ${l.producto.name}`}
                          >
                            <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl flex justify-between items-center" style={{ background: t.surfaceContainer }}>
                  <span className={`font-bold ${TXT.small} uppercase`} style={{ color: t.onSurfaceVariant }}>Total</span>
                  <span className={`font-black ${TXT.title}`} style={{ color: t.primary }}>{soles(subtotal)}</span>
                </div>

                <button
                  onClick={confirmarPedido}
                  className={`w-full py-4 rounded-full font-bold ${TXT.lead} shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase`}
                  style={{ backgroundColor: t.primary, color: t.onPrimary }}
                >
                  <span className={`material-symbols-outlined ${ICON.md}`}>chat</span>
                  Confirmar por WhatsApp
                </button>
                {!whatsappVisible && (
                  <p className={`${TXT.micro} text-center`} style={{ color: t.onSurfaceVariant }}>
                    Esta tienda todavía no configuró su WhatsApp de pedidos.
                  </p>
                )}
                <button
                  onClick={() => setCart({})}
                  className={`w-full py-2 rounded-full font-bold ${TXT.small} uppercase transition-colors hover:opacity-70`}
                  style={{ color: t.onSurfaceVariant }}
                >
                  Vaciar Carrito
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className={`font-bold ${TXT.title}`}>Tu carrito está vacío</h3>
                <p className={`${TXT.body} max-w-xs mx-auto`} style={{ color: t.onSurfaceVariant }}>
                  Explora nuestro delicioso menú y agrega tus combos o pollos favoritos.
                </p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-8 py-3 rounded-full font-bold ${TXT.body} shadow-md uppercase inline-block active:scale-95 transition-all`}
                  style={{ backgroundColor: t.primary, color: t.onPrimary }}
                >
                  Ir al Menú
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: CONTACTO ─── */}
        {activeTab === 'contacto' && (
          <div className="animate-fade-in px-5 py-8 max-w-[800px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="space-y-6">
              <h3 className="font-black text-2xl uppercase italic" style={{ color: t.primary }}>¡Visítanos o Escríbenos!</h3>
              <p className={`${TXT.body} leading-relaxed`} style={{ color: t.onSurfaceVariant }}>
                Estamos listos para llevarte la mejor experiencia crujiente a tu mesa. Si tienes dudas, eventos especiales o pedidos corporativos, ponte en contacto.
              </p>
              <div className="space-y-4">
                {[
                  { icon: 'location_on', title: 'Nuestra Sede Central', desc: INFO_LOCAL.direccion },
                  // El telefono sale del WhatsApp que la tienda cargo en su panel;
                  // antes estaba escrito +51 999 999 999 para todas las tiendas.
                  ...(telefonoVisible ? [{ icon: 'call', title: 'Teléfono / WhatsApp', desc: telefonoVisible }] : []),
                  { icon: 'schedule', title: 'Horario de Atención', desc: INFO_LOCAL.horarioLargo },
                ].map((item) => (
                  <div key={item.icon} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ backgroundColor: t.primary, color: t.onPrimary }}>
                      <span className={`material-symbols-outlined ${ICON.md}`}>{item.icon}</span>
                    </div>
                    <div>
                      <h4 className={`font-bold ${TXT.body}`} style={{ color: t.onSurface }}>{item.title}</h4>
                      <p className={`${TXT.small} mt-0.5`} style={{ color: t.onSurfaceVariant }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-3xl border shadow-sm space-y-4" style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}>
              <h4 className={`font-bold ${TXT.lead} uppercase`} style={{ color: t.onSurface }}>Déjanos un Mensaje</h4>
              {/* El mensaje se abre en WhatsApp de la tienda. Antes era un alert de mentira. */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  enviarPedidoPorWhatsApp(
                    store,
                    `Hola ${store.name}, soy ${f.get('nombre')} (${f.get('telefono')}).\n\n${f.get('mensaje')}`
                  );
                }}
                className="space-y-3.5"
              >
                {[
                  { name: 'nombre', label: 'Nombre Completo', type: 'text' },
                  { name: 'telefono', label: 'Tu Teléfono', type: 'tel' },
                ].map((f) => (
                  <div key={f.name}>
                    <label htmlFor={`contacto-${f.name}`} className={`block ${TXT.micro} font-bold uppercase mb-1`} style={{ color: t.onSurfaceVariant }}>{f.label}</label>
                    <input
                      id={`contacto-${f.name}`}
                      name={f.name}
                      type={f.type}
                      required
                      className={`w-full border rounded-xl px-3 py-2 ${TXT.small} font-semibold focus:outline-none`}
                      style={{ borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
                      onFocus={(e) => (e.target.style.outline = `2px solid ${t.primary}`)}
                      onBlur={(e) => (e.target.style.outline = 'none')}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="contacto-mensaje" className={`block ${TXT.micro} font-bold uppercase mb-1`} style={{ color: t.onSurfaceVariant }}>Mensaje o Consulta</label>
                  <textarea
                    id="contacto-mensaje"
                    name="mensaje"
                    rows={3}
                    required
                    className={`w-full border rounded-xl px-3 py-2 ${TXT.small} font-semibold focus:outline-none`}
                    style={{ borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
                    onFocus={(e) => (e.target.style.outline = `2px solid ${t.primary}`)}
                    onBlur={(e) => (e.target.style.outline = 'none')}
                  />
                </div>
                <button
                  type="submit"
                  className={`w-full py-3 rounded-full font-bold ${TXT.small} shadow-md uppercase active:scale-95 transition-all`}
                  style={{ backgroundColor: t.primary, color: t.onPrimary }}
                >
                  Enviar por WhatsApp
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══ FOOTER — en todas las pestañas, no solo en Inicio ══ */}
        <footer className="w-full py-8 mt-10" style={{ background: t.surfaceContainer, borderTop: `1px solid ${t.outlineVariant}40` }}>
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col gap-0.5 items-center md:items-start">
              <span className={`font-extrabold italic uppercase tracking-tight ${TXT.lead}`} style={{ color: t.primary }}>{store.name}</span>
              <p className={TXT.small} style={{ color: t.onSurfaceVariant }}>© {new Date().getFullYear()}. Todos los derechos reservados.</p>
            </div>
            <div className="flex gap-2">
              {/* Botones con accion real; antes eran <a href="#"> que no hacian nada */}
              {[
                { icon: 'share', label: 'Compartir', onClick: compartir },
                { icon: 'restaurant', label: 'Menú', onClick: () => navToMenu() },
                { icon: 'chat', label: 'Contacto', onClick: () => setActiveTab('contacto') },
              ].map((s) => (
                <button
                  key={s.icon}
                  onClick={s.onClick}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ background: `${t.primary}15`, color: t.primary }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.primary; e.currentTarget.style.color = t.onPrimary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = `${t.primary}15`; e.currentTarget.style.color = t.primary; }}
                  aria-label={s.label}
                  title={s.label}
                >
                  <span className={`material-symbols-outlined ${ICON.sm}`}>{s.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </footer>
      </main>

      {/* ════════════════════════════════════════════
          MOBILE BOTTOM NAV — hidden on md+
          ════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex justify-around items-center px-4 rounded-t-2xl shadow-lg"
        style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderTop: `1px solid ${t.outlineVariant}25` }}
      >
        {[
          { id: 'home', icon: 'home', label: 'Inicio' },
          { id: 'menu', icon: 'restaurant_menu', label: 'Menú' },
          { id: 'pedidos', icon: 'shopping_cart', label: 'Pedidos', badge: cartCount },
          { id: 'contacto', icon: 'chat', label: 'Contacto' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 transition-all relative flex-1"
              style={{
                color: isActive ? t.primary : t.onSurfaceVariant,
                fontWeight: isActive ? 700 : 400,
                opacity: isActive ? 1 : 0.7,
              }}
            >
              <span
                className={`material-symbols-outlined ${ICON.lg} transition-all`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className="absolute top-0.5 right-[15%] w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: t.primary, color: t.onPrimary }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Product detail modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedProduct.name}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ background: t.surface }}
          >
            <div className="relative">
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}
                aria-label="Cerrar"
              >
                <span className={`material-symbols-outlined ${ICON.sm}`}>close</span>
              </button>
              <div className="aspect-square">
                <img className="w-full h-full object-cover" alt={selectedProduct.name} src={selectedProduct.image} />
              </div>
            </div>
            <div className="p-5">
              <h2 className={`font-bold ${TXT.title}`} style={{ color: t.onSurface }}>{selectedProduct.name}</h2>
              {selectedProduct.desc && (
                <p className={`${TXT.body} mt-2 leading-relaxed`} style={{ color: t.onSurfaceVariant }}>{selectedProduct.desc}</p>
              )}
              <div className="flex items-center justify-between mt-5">
                <span className="font-black text-xl" style={{ color: t.primary }}>{soles(selectedProduct.price)}</span>
                <button
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className={`px-6 py-2.5 rounded-full font-bold ${TXT.body} flex items-center gap-1.5 transition-transform active:scale-95`}
                  style={{ background: t.primary, color: t.onPrimary }}
                >
                  <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
