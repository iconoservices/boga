'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';

interface PolleriaTemplateProps {
  store: StoreConfig;
}

const MOCK_PRODUCTS = [
  { id: 'cuarto-pollo', name: '1/4 de Pollo a la Brasa', desc: 'Con papas y ensalada fresca', price: 'S/. 22.90', category: 'brasa', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80' },
  { id: 'medio-pollo', name: '1/2 Pollo a la Brasa', desc: 'Porción para compartir', price: 'S/. 38.50', category: 'brasa', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80' },
  { id: 'combo-alitas', name: 'Combo 6 Alitas', desc: 'Bañadas en salsa BBQ o Spicy', price: 'S/. 18.00', category: 'combos', image: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?w=600&q=80' },
  { id: 'parrilla-mixta', name: 'Parrilla Mixta Bravoz', desc: 'Pollo, res y embutidos', price: 'S/. 54.00', category: 'parrillas', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80' },
  { id: 'chaufa', name: 'Arroz Chaufa de Pollo', desc: 'Sabor oriental peruano', price: 'S/. 19.90', category: 'combos', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80' },
  { id: 'mostrito', name: 'El Mostrito Bravo', desc: 'Pollo + Chaufa + Papas', price: 'S/. 26.50', category: 'combos', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'Todos', icon: 'apps' },
  { id: 'brasa', label: 'Pollos a la Brasa', icon: 'local_fire_department' },
  { id: 'combos', label: 'Combos', icon: 'takeout_dining' },
  { id: 'parrillas', label: 'Parrillas', icon: 'outdoor_grill' },
  { id: 'bebidas', label: 'Bebidas', icon: 'local_bar' },
];

const CATEGORIES_DATA = [
  {
    id: 'brasa',
    label: 'Pollos',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
    alt: 'Pollos a la brasa dorados',
  },
  {
    id: 'combos',
    label: 'Combos',
    image: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?w=800&q=80',
    alt: 'Combos familiares',
  },
  {
    id: 'parrillas',
    label: 'Parrillas',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    alt: 'Parrillas especiales',
  },
];

export default function PolleriaTemplate({ store }: PolleriaTemplateProps) {
  const { isDemoVisible } = useDemo();
  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const checkInstalled = () => {
      if (localStorage.getItem('boga_pwa_installed') === 'true') return true;
      if ((window.navigator as any).standalone) return true;
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      return false;
    };

    setIsInstalled(checkInstalled());

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('boga_pwa_installed', 'true');
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', () => setIsInstalled(true));
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

  useEffect(() => {
    const fetchProducts = async () => {
      const showDemo = isDemoVisible(store.slug);
      setProducts(showDemo ? MOCK_PRODUCTS : []);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);

      const dbProducts = data && !error ? data.map((p) => {
        const categoryObj = store.categories.find(c => c.name === p.category);
        return {
          id: p.id,
          name: p.name,
          desc: '',
          price: `S/. ${p.price.toFixed(2)}`,
          category: categoryObj ? categoryObj.href : p.category.toLowerCase(),
          image: p.image || 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80',
        };
      }) : [];

      setProducts(showDemo ? [...dbProducts, ...MOCK_PRODUCTS] : dbProducts);
    };

    fetchProducts();
  }, [store.slug, store.categories, isDemoVisible]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const t = store.theme;
  const filtered = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  const navToMenu = (cat?: string) => {
    setActiveTab('menu');
    if (cat) setActiveCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: t.background, color: t.onBackground, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
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
        <div className="max-w-[1200px] mx-auto px-6 w-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {store.logoImage ? (
              <img src={store.logoImage} alt={store.name} className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: t.primary }} />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-md" style={{ background: t.primary }}>
                <span className="font-black text-sm italic text-white">
                  {store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span
              className="text-xl font-black italic tracking-tight uppercase"
              style={{ color: t.primary }}
            >
              {store.name}
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-8">
            {[
              { id: 'home', label: 'Inicio' },
              { id: 'menu', label: 'Menú' },
              { id: 'pedidos', label: 'Pedidos' },
              { id: 'contacto', label: 'Contacto' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="font-bold text-sm uppercase tracking-wide transition-all relative"
                style={{
                  color: activeTab === item.id ? t.primary : t.onSurfaceVariant,
                  fontWeight: activeTab === item.id ? 700 : 500,
                }}
              >
                {item.label}
                {activeTab === item.id && (
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: t.primary }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* CTA + Cart */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navToMenu()}
              className="font-bold px-6 py-2.5 rounded-full text-sm transition-all hover:brightness-110 active:scale-95 text-white shadow-md"
              style={{ background: t.primary, boxShadow: `0 4px 14px ${t.primary}40` }}
            >
              Pedir ahora
            </button>
            <button
              onClick={() => setActiveTab('pedidos')}
              className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: `${t.primary}15`, color: t.primary }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                  style={{ background: '#b7150b' }}
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
        <div className="flex items-center gap-3">
          {store.logoImage ? (
            <img src={store.logoImage} alt={store.name} className="w-9 h-9 rounded-full object-cover border-2" style={{ borderColor: t.primary }} />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ background: t.primary }}>
              <span className="font-black text-sm italic text-white">
                {store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-base font-black italic tracking-tighter uppercase leading-none" style={{ color: t.primary }}>{store.name}</h1>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
          </div>
        </div>
      </header>

      {/* ══ FLOATING BUTTONS — mobile only, top-right ══ */}
      <div className="md:hidden fixed top-20 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: store.name, text: store.tagline, url: window.location.href });
            }
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
          style={{ background: t.primary, color: t.onPrimary }}
          title="Compartir"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
        </button>
        {!isInstalled && (
          <button
            onClick={handleInstall}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
            style={{ background: t.secondary, color: t.onPrimary }}
            title="Instalar"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════
          MAIN CONTENT
          ════════════════════════════════════════════ */}
      <main className="pt-16 md:pt-[60px] pb-24 md:pb-0">

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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20 md:bg-gradient-to-r md:from-black/75 md:via-black/45 md:to-transparent" />
              </div>

              {/* Hero content */}
              <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 pb-0 md:pb-0 h-full">

                {/* ══ PROFILE CARD — left side (desktop only) ══ */}
                <div className="hidden md:flex flex-col items-center w-[190px] shrink-0 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl text-center">
                  {store.logoImage ? (
                    <img src={store.logoImage} alt={store.name} className="w-16 h-16 rounded-xl object-cover border-[3px] shadow-lg mb-2" style={{ borderColor: t.primary }} />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg mb-2" style={{ background: t.primary }}>
                      <span className="font-black text-xl italic text-white">
                        {store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <h3 className="text-white font-extrabold text-base uppercase italic leading-tight mb-0.5">{store.name}</h3>
                  <p className="text-white/70 text-[11px] font-medium mb-3">{store.tagline}</p>
                  <div className="flex items-center gap-1 text-white/80 mb-2">
                    {[...Array(4)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-sm">star</span>
                    ))}
                    <span className="material-symbols-outlined text-sm">star_half</span>
                    <span className="text-white/60 text-[11px] font-bold ml-1">4.8</span>
                  </div>
                  <div className="flex gap-3 text-white/70 text-[11px]">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">location_on</span>Miraflores</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">schedule</span>12-11PM</span>
                  </div>
                </div>

                <div className="max-w-2xl flex-1 flex flex-col justify-center -mt-[3.25rem] md:mt-0">
                  <h2 className="text-white font-extrabold leading-tight tracking-tight uppercase italic drop-shadow-md mb-3"
                    style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
                    EL SABOR<br />
                    <span style={{ color: t.primary }}>QUE NOS UNE</span>
                  </h2>
                  <p className="text-white/90 font-medium text-sm md:text-base mb-6 max-w-lg leading-relaxed">
                    Disfruta del auténtico sabor al carbón, preparado con la receta secreta de la casa.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navToMenu()}
                      className="text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:brightness-110 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase w-full sm:w-auto"
                      style={{ backgroundColor: t.primary, boxShadow: `0 8px 16px ${t.primary}50` }}
                    >
                      Pedir Ahora
                      <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                    </button>
                    <button
                      onClick={() => navToMenu()}
                      className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-all flex items-center justify-center uppercase w-full sm:w-auto"
                    >
                      Ver Menú
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ PROFILE CARD — mobile only ══ */}
            <div className="md:hidden px-5 -mt-8 relative z-20">
              <div className="flex items-center gap-4 bg-white rounded-xl shadow-lg border p-4" style={{ borderColor: `${t.outlineVariant}40` }}>
                {store.logoImage ? (
                  <img src={store.logoImage} alt={store.name} className="w-14 h-14 rounded-xl object-cover border-[3px] shrink-0" style={{ borderColor: t.primary }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ background: t.primary }}>
                    <span className="font-black text-lg italic text-white">
                      {store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-sm uppercase italic leading-tight truncate" style={{ color: t.onBackground }}>{store.name}</h3>
                  <p className="text-[11px] font-medium truncate" style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(4)].map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-xs" style={{ color: '#f59e0b', fontSize: '12px' }}>star</span>
                    ))}
                    <span className="material-symbols-outlined text-xs" style={{ color: '#f59e0b', fontSize: '12px' }}>star_half</span>
                    <span className="text-[10px] font-bold ml-1" style={{ color: t.onSurfaceVariant }}>4.8</span>
                  </div>
                </div>
                <div className="text-[10px] font-medium shrink-0 text-right" style={{ color: t.onSurfaceVariant }}>
                  <div className="flex items-center gap-1 justify-end"><span className="material-symbols-outlined" style={{ fontSize: '11px' }}>location_on</span>Miraflores</div>
                  <div className="flex items-center gap-1 justify-end"><span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule</span>12-11PM</div>
                </div>
              </div>
            </div>

            {/* ══ CATEGORÍAS — 1 col mobile / 3 cols desktop ══ */}
            <section className="max-w-[1200px] mx-auto px-5 md:px-6 pt-8 md:pt-16 pb-6 md:pb-12">
              {/* Section header */}
              <div className="text-center mb-6 md:mb-10">
                <h2 className="font-extrabold uppercase italic tracking-tight mb-2" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', color: t.onBackground }}>
                  Explora nuestras delicias
                </h2>
                <div className="h-0.5 w-12 rounded-full mx-auto" style={{ background: t.primary }} />
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
                {CATEGORIES_DATA.map((cat, idx) => (
                  <div
                    key={cat.id}
                    onClick={() => navToMenu(cat.id)}
                    className={`group relative overflow-hidden rounded-2xl md:rounded-xl cursor-pointer shadow-md hover:shadow-xl transition-all ${idx === 2 ? 'col-span-2 md:col-span-1' : ''}`}
                  >
                    <div className="relative h-40 md:h-80">
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 saturate-[1.15]"
                        alt={cat.alt}
                        src={cat.image}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-5 md:bottom-6">
                        <span className="text-white font-extrabold text-lg md:text-2xl uppercase italic drop-shadow">{cat.label}</span>
                        <div className="h-1 mt-1 rounded-full w-6 group-hover:w-12 transition-all duration-300" style={{ backgroundColor: t.primary }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ EL SECRETO BRAVOZ ══ */}
            <section style={{ background: '#f4f3f1' }}>
              <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-10 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
                <div className="relative order-2 md:order-1">
                  <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                    <img
                      className="w-full h-full object-cover"
                      alt="Horno al carbón tradicional"
                      src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"
                    />
                  </div>
                  <div className="absolute -bottom-4 -right-3 md:-bottom-6 md:-right-6 bg-white px-4 py-3 rounded-xl shadow-md border hidden sm:block" style={{ borderColor: `${t.primary}25` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${t.primary}20`, color: t.primary }}>
                        <span className="material-symbols-outlined text-base">local_fire_department</span>
                      </div>
                      <div>
                        <p className="font-bold text-xs" style={{ color: t.primary }}>100% Carbón</p>
                        <p className="text-[10px] opacity-60" style={{ color: t.onSurfaceVariant }}>Sabor Ahumado Real</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <span className="text-xs font-bold uppercase tracking-widest block mb-2" style={{ color: t.primary }}>
                    Nuestro Legado
                  </span>
                  <h2 className="font-extrabold uppercase italic leading-tight mb-3"
                    style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', color: t.onBackground }}>
                    El Secreto Bravoz
                  </h2>
                  <p className="text-sm leading-relaxed mb-8" style={{ color: t.onSurfaceVariant }}>
                    Nuestra especialidad nace del fuego. Utilizamos el auténtico carbón de algarrobo para un aroma inigualable y una textura crujiente por fuera, jugosa por dentro.
                  </p>
                  <div className="space-y-4 mb-8">
                    {[
                      { icon: 'forest', title: 'Brasas de Algarrobo', desc: 'Madera seleccionada para un ahumado profundo.' },
                      { icon: 'timer', title: 'Asado Lento', desc: 'Cada pollo con su tiempo exacto de cocción.' },
                      { icon: 'restaurant', title: 'Marinado 24 Horas', desc: 'Especias que penetran hasta el corazón.' },
                    ].map((feat) => (
                      <div key={feat.icon} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'white', color: t.primary }}>
                          <span className="material-symbols-outlined text-lg">{feat.icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm" style={{ color: t.onBackground }}>{feat.title}</h3>
                          <p className="text-xs" style={{ color: t.onSurfaceVariant }}>{feat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navToMenu()}
                    className="flex items-center gap-1.5 font-bold text-sm hover:gap-3 transition-all active:scale-95"
                    style={{ color: t.primary }}
                  >
                    <span>Ver menú completo</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ══ NEWSLETTER ══ */}
            <section className="max-w-[1200px] mx-auto px-5 md:px-6 py-10 md:py-20">
              <div className="rounded-2xl md:rounded-[1.5rem] p-8 md:p-14 relative overflow-hidden text-center" style={{ background: t.primary }}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl bg-white/10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl bg-white/10 pointer-events-none" />
                <div className="relative z-10 max-w-lg mx-auto text-white">
                  <h2 className="font-extrabold uppercase italic leading-tight mb-3" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 2rem)' }}>
                    ¿Hambre de algo especial?
                  </h2>
                  <p className="text-white/80 text-sm font-medium mb-6">
                    Recibe promociones exclusivas y novedades directo en tu correo.
                  </p>
                  {newsletterSubscribed ? (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-5 text-white font-bold text-sm">
                      ¡Listo! Bienvenido al club VIP.
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => { e.preventDefault(); if (newsletterEmail) setNewsletterSubscribed(true); }}
                      className="flex flex-col sm:flex-row gap-3 bg-white p-1.5 rounded-full shadow-lg"
                    >
                      <input
                        className="flex-grow px-5 py-3 rounded-full border-none bg-transparent text-sm font-bold focus:ring-0 outline-none"
                        style={{ color: t.onBackground }}
                        placeholder="Tu correo electrónico"
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-[#b7150b] text-white px-6 py-3 rounded-full font-bold text-sm uppercase hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 w-full sm:w-auto"
                      >
                        Suscribirse
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="w-full py-8" style={{ background: '#f4f3f1', borderTop: `1px solid ${t.outlineVariant}40` }}>
              <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col gap-0.5 items-center md:items-start">
                  <span className="font-extrabold italic uppercase tracking-tight text-base" style={{ color: t.primary }}>{store.name}</span>
                  <p className="text-xs" style={{ color: t.onSurfaceVariant }}>© {new Date().getFullYear()}. Todos los derechos reservados.</p>
                </div>
                <div className="flex gap-6">
                  {['Privacidad', 'Términos', 'Soporte'].map(link => (
                    <a key={link} href="#" className="text-xs font-medium hover:underline" style={{ color: t.onSurfaceVariant }}>
                      {link}
                    </a>
                  ))}
                </div>
                <div className="flex gap-2">
                  {[
                    { icon: 'share', label: 'Compartir' },
                    { icon: 'restaurant', label: 'Menú' },
                    { icon: 'star', label: 'Reseñas' },
                  ].map(s => (
                    <a
                      key={s.icon}
                      href="#"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:text-white"
                      style={{ background: `${t.primary}15`, color: t.primary }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.primary; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${t.primary}15`; (e.currentTarget as HTMLElement).style.color = t.primary; }}
                      title={s.label}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{s.icon}</span>
                    </a>
                  ))}
                </div>
              </div>
            </footer>

          </div>
        )}

        {/* ─── TAB: MENÚ ─── */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            {/* Desktop menu header */}
            <div className="hidden md:block max-w-[1200px] mx-auto px-6 pt-8 pb-4">
              <h2 className="font-extrabold uppercase italic text-3xl mb-1" style={{ color: t.onBackground }}>Nuestro Menú</h2>
              <p className="text-sm" style={{ color: t.onSurfaceVariant }}>Selecciona una categoría para explorar</p>
            </div>

            {/* Promotional Banner */}
            <section className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto">
              <div className="relative w-full h-48 md:h-56 overflow-hidden rounded-2xl shadow-md group">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={store.heroAlt}
                  src={store.heroImage}
                />
                <div className="absolute inset-0 flex flex-col justify-center px-6 bg-gradient-to-r from-black/80 to-transparent">
                  <span className="text-xs font-bold mb-1 uppercase tracking-widest" style={{ color: t.primary }}>¡Sabor que Enamora!</span>
                  <h2 className="text-white font-black text-2xl md:text-3xl max-w-xs leading-tight uppercase italic">20% de Descuento en Combos Familiares</h2>
                  <button
                    onClick={() => setActiveCategory('combos')}
                    className="mt-4 text-xs font-bold px-6 py-2.5 rounded-full w-fit transition-colors shadow-md uppercase active:scale-95 transform"
                    style={{ background: t.primary, color: t.onPrimary }}
                  >
                    Pedir Combos 🔥
                  </button>
                </div>
              </div>
            </section>

            {/* Category Chips */}
            <nav
              className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto overflow-x-auto flex gap-3 whitespace-nowrap sticky top-16 md:top-[60px] py-3 z-40"
              style={{ background: `${t.background}F0`, backdropFilter: 'blur(12px)' }}
            >
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full shrink-0 text-xs font-bold transition-all active:scale-95 shadow-sm border"
                    style={{
                      background: isActive ? t.primary : t.surface,
                      color: isActive ? t.onPrimary : t.onSurfaceVariant,
                      borderColor: isActive ? 'transparent' : `${t.outlineVariant}60`,
                      boxShadow: isActive ? `0 4px 12px ${t.primary}40` : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto">
              <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4" style={{ color: t.onSurface }}>Nuestros Favoritos</h3>
            </div>

            {/* Product Grid */}
            <section className="px-5 md:px-6 md:max-w-[1200px] md:mx-auto pb-8">
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
                      <h4 className="font-bold text-sm leading-tight mb-1 line-clamp-2" style={{ color: t.onSurface }}>{product.name}</h4>
                      <p className="text-[11px] mb-3 line-clamp-2 flex-1" style={{ color: t.onSurfaceVariant }}>{product.desc}</p>
                      <div className="flex justify-between items-center mt-auto">
                        <span className="font-extrabold text-base" style={{ color: t.primary }}>{product.price}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCartCount((c) => c + 1); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                          style={{ background: t.primary, color: t.onPrimary }}
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB: PEDIDOS ─── */}
        {activeTab === 'pedidos' && (
          <div className="animate-fade-in px-5 py-8 max-w-[600px] mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-inner" style={{ backgroundColor: `${t.primary}15` }}>
              <span className="material-symbols-outlined text-4xl" style={{ color: t.primary }}>shopping_cart_checkout</span>
            </div>
            {cartCount > 0 ? (
              <div className="space-y-6 text-left bg-white p-6 rounded-3xl border shadow-sm" style={{ borderColor: `${t.outlineVariant}40` }}>
                <h3 className="font-black text-xl uppercase italic border-b pb-3" style={{ color: t.primary }}>Resumen de tu Pedido</h3>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-bold text-sm">Pollo a la Brasa (Demo)</span>
                  <span className="font-black text-sm" style={{ color: t.primary }}>{cartCount}x</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center">
                  <span className="font-bold text-xs text-gray-500 uppercase">Subtotal Estimado</span>
                  <span className="font-black text-lg" style={{ color: t.primary }}>S/. {(cartCount * 22.90).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => {
                    const message = `¡Hola! Me gustaría hacer un pedido de ${cartCount}x Pollos a la Brasa por ${store.name}.`;
                    enviarPedidoPorWhatsApp(store, message);
                  }}
                  className="w-full text-white py-4 rounded-full font-bold text-base shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase"
                  style={{ backgroundColor: t.primary }}
                >
                  Confirmar por WhatsApp 📞
                </button>
                <button
                  onClick={() => setCartCount(0)}
                  className="w-full text-gray-400 py-2 rounded-full font-bold text-xs hover:text-red-600 transition-colors uppercase"
                >
                  Vaciar Carrito
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Tu carrito está vacío</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">Explora nuestro delicioso menú y agrega tus combos o pollos favoritos.</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="text-white px-8 py-3 rounded-full font-bold text-sm shadow-md uppercase inline-block active:scale-95 transition-all"
                  style={{ backgroundColor: t.primary }}
                >
                  Ir al Menú 🔥
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
              <p className="text-sm leading-relaxed text-gray-600">
                Estamos listos para llevarte la mejor experiencia crujiente a tu mesa. Si tienes dudas, eventos especiales o pedidos corporativos, ponte en contacto.
              </p>
              <div className="space-y-4">
                {[
                  { icon: 'location_on', title: 'Nuestra Sede Central', desc: 'Av. Fuego y Brasa 1995, Miraflores, Lima' },
                  { icon: 'call', title: 'Teléfono / WhatsApp', desc: '+51 999 999 999' },
                  { icon: 'schedule', title: 'Horario de Atención', desc: 'Lunes a Domingo: 12:00 PM - 11:00 PM' },
                ].map((item) => (
                  <div key={item.icon} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ backgroundColor: t.primary }}>
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4" style={{ borderColor: `${t.outlineVariant}40` }}>
              <h4 className="font-bold text-base uppercase">Déjanos un Mensaje</h4>
              <form onSubmit={(e) => { e.preventDefault(); alert('Mensaje enviado (Simulación)'); }} className="space-y-3.5">
                {[
                  { label: 'Nombre Completo', type: 'text' },
                  { label: 'Tu Teléfono', type: 'tel' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{f.label}</label>
                    <input type={f.type} required className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none" onFocus={(e) => e.target.style.outline = `2px solid ${t.primary}`} onBlur={(e) => e.target.style.outline = 'none'} />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mensaje o Consulta</label>
                  <textarea rows={3} required className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none" onFocus={(e) => e.target.style.outline = `2px solid ${t.primary}`} onBlur={(e) => e.target.style.outline = 'none'} />
                </div>
                <button
                  type="submit"
                  className="w-full text-white py-3 rounded-full font-bold text-xs shadow-md uppercase active:scale-95 transition-all"
                  style={{ backgroundColor: t.primary }}
                >
                  Enviar Mensaje 🚀
                </button>
              </form>
            </div>
          </div>
        )}
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
              key={item.label}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 transition-all relative flex-1"
              style={{
                color: isActive ? t.primary : t.onSurfaceVariant,
                fontWeight: isActive ? 700 : 400,
                opacity: isActive ? 1 : 0.7,
              }}
            >
              <span
                className="material-symbols-outlined text-[22px] transition-all"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className="absolute top-0.5 right-[15%] w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white animate-bounce"
                  style={{ background: '#b7150b' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ════════════════════════════════════════════
          DESKTOP FAB (cart) — visible on md+
          ════════════════════════════════════════════ */}
      <button
        onClick={() => setActiveTab('pedidos')}
        className="hidden md:flex fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group text-white"
        style={{ background: '#b7150b', boxShadow: '0 15px 30px rgba(183,21,11,0.4)' }}
      >
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white bg-black">
            {cartCount}
          </span>
        )}
        <span className="absolute right-full mr-4 bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Tu Pedido
        </span>
      </button>

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedProduct(null)}>
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ background: t.surface }}>
            <div className="relative">
              <button onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <div className="aspect-square">
                <img className="w-full h-full object-cover" alt={selectedProduct.name} src={selectedProduct.image} />
              </div>
            </div>
            <div className="p-5">
              <h2 className="font-bold text-lg" style={{ color: t.onSurface }}>{selectedProduct.name}</h2>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: t.onSurfaceVariant }}>{selectedProduct.desc}</p>
              <div className="flex items-center justify-between mt-5">
                <span className="font-black text-xl" style={{ color: t.primary }}>{selectedProduct.price}</span>
                <button onClick={() => { setCartCount((c) => c + 1); setSelectedProduct(null); }}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-transform active:scale-95"
                  style={{ background: t.primary, color: t.onPrimary }}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
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
