'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';

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

export default function PolleriaTemplate({ store }: PolleriaTemplateProps) {
  const { isDemoVisible } = useDemo();
  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

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

  const t = store.theme;
  const filtered = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen pb-24" style={{ background: t.background, color: t.onBackground, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* TopAppBar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-20 shadow-md transition-all duration-300"
        style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}30` }}
      >
        <div className="flex items-center gap-3">
          {store.logoImage ? (
            <img src={store.logoImage} alt={store.name} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: t.primary }} />
          ) : (
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 rotate-3 transform shadow-md" style={{ background: t.primary }}>
              <span className="font-black text-lg italic text-white">
                {store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none" style={{ color: t.primary }}>{store.name}</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: t.onSurfaceVariant }}>{store.tagline}</p>
          </div>
        </div>
        <button
          className="font-bold px-4 py-2 rounded-full text-xs transition-all active:scale-95"
          style={{ color: t.primary }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: store.name, text: store.tagline, url: window.location.href });
            } else {
              alert('Copiado al portapapeles!');
            }
          }}
        >
          Compartir
        </button>
      </header>

      {/* Main Content Area */}
      <main className="pt-20">
        
        {/* TAB 1: INICIO (HOME) */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* Hero Section — full bleed, NO max-width constraints */}
            <section className="relative w-screen h-[70vh] md:h-[580px] overflow-hidden" style={{ marginLeft: 0, marginRight: 0 }}>
              <div className="absolute inset-0 z-0">
                <img 
                  className="w-full h-full object-cover saturate-[1.2] contrast-[1.1] scale-105" 
                  alt="Pollos a la brasa jugosos" 
                  src="https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=1200&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
              </div>
              <div className="absolute inset-0 z-10 flex flex-col justify-end pb-12 px-6">
                <div style={{ maxWidth: '100%', width: '100%' }}>
                  <h2 className="text-white font-extrabold text-4xl md:text-6xl mb-4 leading-tight tracking-tight uppercase italic drop-shadow-md">
                    EL SABOR<br/>
                    <span style={{ color: t.primary }}>QUE NOS UNE</span>
                  </h2>
                  <p className="text-white/90 font-medium text-base md:text-lg mb-8 max-w-md leading-relaxed w-full">
                    Disfruta del auténtico pollo a la brasa con el toque secreto de la casa. Tradición, fuego y pasión en cada bocado.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button 
                      onClick={() => setActiveTab('menu')}
                      className="text-white px-8 py-4 rounded-full font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase w-full sm:w-auto"
                      style={{ backgroundColor: t.primary, boxShadow: `0 10px 20px ${t.primary}50` }}
                    >
                      Pedir Ahora
                      <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('menu')}
                      className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-bold text-base hover:bg-white hover:text-black transition-all flex items-center justify-center uppercase w-full sm:w-auto"
                    >
                      Ver el Menú
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Rest of the content in a max-width constrained wrapper */}
            <div className="max-w-[1200px] mx-auto space-y-6">

            {/* Category Grid Section (Responsive 2 cols top + 1 full-width bottom on mobile) */}
            <section className="px-5 py-8">
              <div className="flex justify-between items-center mb-6 border-b-2 pb-3" style={{ borderColor: t.primary }}>
                <h3 className="text-xl font-extrabold uppercase italic tracking-tighter" style={{ color: t.onBackground }}>Categorías</h3>
                <button 
                  onClick={() => { setActiveTab('menu'); setActiveCategory('all'); }}
                  className="text-[11px] font-bold uppercase flex items-center gap-0.5 hover:underline"
                  style={{ color: t.primary }}
                >
                  Ver todo <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {/* Category 1: Pollos */}
                <div 
                  onClick={() => { setActiveTab('menu'); setActiveCategory('brasa'); }}
                  className="group relative h-40 md:h-64 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all col-span-1"
                >
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 saturate-[1.2]" 
                    alt="Pollos a la brasa" 
                    src="https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-white font-extrabold text-sm md:text-xl uppercase italic">Pollos</span>
                    <div className="h-1 mt-1 rounded-full w-6 group-hover:w-12 transition-all duration-300" style={{ backgroundColor: t.primary }} />
                  </div>
                </div>

                {/* Category 2: Combos */}
                <div 
                  onClick={() => { setActiveTab('menu'); setActiveCategory('combos'); }}
                  className="group relative h-40 md:h-64 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all col-span-1"
                >
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 saturate-[1.2]" 
                    alt="Combos familiares" 
                    src="https://images.unsplash.com/photo-1610614819513-58e34989848b?w=600&q=80" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-white font-extrabold text-sm md:text-xl uppercase italic">Combos</span>
                    <div className="h-1 mt-1 rounded-full w-6 group-hover:w-12 transition-all duration-300" style={{ backgroundColor: t.primary }} />
                  </div>
                </div>

                {/* Category 3: Parrillas (Full width on mobile, 3rd column on desktop) */}
                <div 
                  onClick={() => { setActiveTab('menu'); setActiveCategory('parrillas'); }}
                  className="group relative h-40 md:h-64 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all col-span-2 md:col-span-1"
                >
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 saturate-[1.2]" 
                    alt="Parrillas" 
                    src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-white font-extrabold text-sm md:text-xl uppercase italic">Parrillas</span>
                    <div className="h-1 mt-1 rounded-full w-6 group-hover:w-12 transition-all duration-300" style={{ backgroundColor: t.primary }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Specialty Section */}
            <section className="bg-black py-16 px-5 relative overflow-hidden rounded-3xl mx-3">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div 
                  className="absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" 
                  style={{ backgroundColor: t.primary }}
                />
              </div>
              <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                <div className="w-full md:w-1/2 relative group">
                  <div className="absolute -inset-4 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" style={{ backgroundColor: t.primary }} />
                  <div className="relative rounded-2xl overflow-hidden aspect-square border-4 shadow-xl transform -rotate-1 hover:rotate-0 transition-transform duration-500" style={{ borderColor: t.primary }}>
                    <img 
                      className="w-full h-full object-cover brightness-125 saturate-[1.2]" 
                      alt="Glowing charcoal embers" 
                      src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </div>
                <div className="w-full md:w-1/2 text-left">
                  <span 
                    className="inline-block text-white font-extrabold text-xs uppercase tracking-[0.2em] px-4 py-1.5 mb-6 transform skew-x-[-10deg]"
                    style={{ backgroundColor: t.primary }}
                  >
                    El Secreto Bravoz
                  </span>
                  <h3 className="font-extrabold text-3xl md:text-5xl text-white mb-6 leading-none uppercase italic">
                    PODER DEL <span style={{ color: t.primary }}>FUEGO & CARBÓN</span>
                  </h3>
                  <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed font-medium">
                    En {store.name}, creamos una experiencia sensorial extrema. Cada pieza es marinada por <span className="text-white font-extrabold underline decoration-2 underline-offset-4" style={{ textDecorationColor: t.primary }}>24 HORAS</span> en nuestra mezcla secreta de especias, para luego ser asada sobre brasas de carbón de algarrobo puro.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all">
                      <div className="w-12 h-12 rounded-full text-white flex items-center justify-center mb-3 shadow-md" style={{ backgroundColor: t.primary }}>
                        <span className="material-symbols-outlined text-2xl">local_fire_department</span>
                      </div>
                      <h4 className="font-bold text-lg text-white mb-1 uppercase italic">Brasa Natural</h4>
                      <p className="text-white/60 text-xs leading-normal">Carbón de algarrobo seleccionado que inyecta un aroma ahumado legendario.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md hover:border-white/20 transition-all">
                      <div className="w-12 h-12 rounded-full text-white flex items-center justify-center mb-3 shadow-md" style={{ backgroundColor: t.primary }}>
                        <span className="material-symbols-outlined text-2xl">timer</span>
                      </div>
                      <h4 className="font-bold text-lg text-white mb-1 uppercase italic">Asado Lento</h4>
                      <p className="text-white/60 text-xs leading-normal">Fuego constante que asegura una piel ultra-crujiente y carne jugosa en su punto.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Newsletter Section (Fully adaptive responsive layout) */}
            <section className="px-5 py-12 text-center rounded-3xl mx-3 relative overflow-hidden" style={{ backgroundColor: t.primary }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_0%,_transparent_100%)] pointer-events-none" />
              <div className="max-w-[700px] mx-auto relative z-10 text-white w-full flex flex-col items-center">
                <h3 className="font-extrabold text-3xl md:text-5xl mb-4 uppercase italic leading-none text-shadow-strong">
                  ¿TIENES HAMBRE?<br/>ÚNETE AL CLUB
                </h3>
                <p className="font-bold text-sm md:text-base mb-8 opacity-90 max-w-md">
                  Suscríbete para recibir promociones exclusivas, ofertas VIP y descuentos de fin de semana antes que nadie.
                </p>
                {newsletterSubscribed ? (
                  <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-6 text-white font-extrabold text-sm w-full max-w-md mx-auto">
                    🎉 ¡Listo! Ya eres parte de nuestro club VIP. ¡Pronto recibirás tu primer descuento!
                  </div>
                ) : (
                  <form 
                    onSubmit={(e) => { e.preventDefault(); if (newsletterEmail) setNewsletterSubscribed(true); }}
                    className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto p-1.5 bg-white rounded-2xl shadow-xl"
                  >
                    <input 
                      className="flex-1 rounded-full border-none bg-transparent px-5 py-3.5 text-black font-bold placeholder:text-gray-400 focus:ring-0 outline-none text-sm w-full" 
                      placeholder="Tu correo electrónico" 
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                    />
                    <button 
                      type="submit"
                      className="bg-black text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase hover:bg-zinc-800 transition-all shadow-md active:scale-95 shrink-0 w-full sm:w-auto"
                    >
                      Suscribirse
                    </button>
                  </form>
                )}
              </div>
            </section>
            </div>{/* end max-w wrapper */}
          </div>
        )}

        {/* TAB 2: MENU */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in space-y-6">
            {/* Promotional Banner */}
            <section className="px-5">
              <div className="relative w-full h-48 md:h-64 overflow-hidden rounded-2xl shadow-md group">
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
              className="px-5 overflow-x-auto flex gap-3 whitespace-nowrap sticky top-20 py-3 z-40"
              style={{ background: `${t.background}F0`, backdropFilter: 'blur(12px)' }}
            >
              {CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full shrink-0 text-xs font-bold transition-all active:scale-95 shadow-sm border"
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

            {/* Section Title */}
            <div className="px-5">
              <h3 className="text-lg font-black uppercase italic tracking-tighter" style={{ color: t.onSurface }}>Nuestros Favoritos</h3>
            </div>

            {/* Product Grid */}
            <section className="px-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((product) => (
                  <div
                    key={product.id}
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

        {/* TAB 3: PEDIDOS (CART) */}
        {activeTab === 'pedidos' && (
          <div className="animate-fade-in px-5 py-8 max-w-[600px] mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-inner" style={{ backgroundColor: `${t.primary}15` }}>
              <span className="material-symbols-outlined text-4xl" style={{ color: t.primary }}>shopping_cart_checkout</span>
            </div>
            {cartCount > 0 ? (
              <div className="space-y-6 text-left bg-white p-6 rounded-3xl border shadow-sm" style={{ borderColor: `${t.outlineVariant}40` }}>
                <h3 className="font-black text-xl uppercase italic border-b pb-3" style={{ color: t.primary }}>Resumen de tu Pedido</h3>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-bold text-sm">Pollo a la Brasa (Demo Items)</span>
                  <span className="font-black text-sm" style={{ color: t.primary }}>{cartCount}x</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center">
                  <span className="font-bold text-xs text-gray-500 uppercase">Subtotal Estimado</span>
                  <span className="font-black text-lg" style={{ color: t.primary }}>S/. {(cartCount * 22.90).toFixed(2)}</span>
                </div>

                <button 
                  onClick={() => {
                    const message = `¡Hola! Me gustaría hacer un pedido demo de ${cartCount}x Pollos a la Brasa por Boga Market.`;
                    window.open(`https://wa.me/51999999999?text=${encodeURIComponent(message)}`, '_blank');
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
                <p className="text-sm text-gray-500 max-w-xs mx-auto">Explora nuestro delicioso menú y agrega tus combos o pollos favoritos para realizar tu pedido.</p>
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

        {/* TAB 4: CONTACTO */}
        {activeTab === 'contacto' && (
          <div className="animate-fade-in px-5 py-8 max-w-[800px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="space-y-6">
              <h3 className="font-black text-2xl uppercase italic" style={{ color: t.primary }}>¡Visítanos o Escríbenos!</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                Estamos listos para llevarte la mejor experiencia crujiente a tu mesa. Si tienes dudas, eventos especiales o pedidos corporativos, ponte en contacto.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ backgroundColor: t.primary }}>
                    <span className="material-symbols-outlined text-lg">location_on</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Nuestra Sede Central</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Av. Fuego y Brasa 1995, Miraflores, Lima</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ backgroundColor: t.primary }}>
                    <span className="material-symbols-outlined text-lg">call</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Teléfono / WhatsApp</h4>
                    <p className="text-xs text-gray-500 mt-0.5">+51 999 999 999</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ backgroundColor: t.primary }}>
                    <span className="material-symbols-outlined text-lg">schedule</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Horario de Atención</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Lunes a Domingo: 12:00 PM - 11:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4" style={{ borderColor: `${t.outlineVariant}40` }}>
              <h4 className="font-bold text-base uppercase">Déjanos un Mensaje</h4>
              <form onSubmit={(e) => { e.preventDefault(); alert('Mensaje enviado (Simulación)'); }} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre Completo</label>
                  <input type="text" required className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none" onFocus={(e) => e.target.style.outline = `2px solid ${t.primary}`} onBlur={(e) => e.target.style.outline = 'none'} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tu Teléfono</label>
                  <input type="tel" required className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none" onFocus={(e) => e.target.style.outline = `2px solid ${t.primary}`} onBlur={(e) => e.target.style.outline = 'none'} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mensaje o Consulta</label>
                  <textarea rows={3} required className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none" onFocus={(e) => e.target.style.outline = `2px solid ${t.primary}`} onBlur={(e) => e.target.style.outline = 'none'}></textarea>
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

        {/* Bento Promo Section (Generic Promo footer only shown on non-home tabs or kept everywhere) */}
        {activeTab !== 'pedidos' && activeTab !== 'contacto' && (
          <section className="mt-8 px-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl flex items-center gap-6 overflow-hidden relative" style={{ background: `${t.primary}14` }}>
              <div className="flex-1 z-10 text-left">
                <h3 className="text-lg font-bold mb-2" style={{ color: t.primary }}>¡Nueva App!</h3>
                <p className="text-sm" style={{ color: t.onSurfaceVariant }}>Descarga nuestra app y obtén S/. 10 de dscto. en tu primera compra.</p>
              </div>
              <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl rotate-12 shrink-0 animate-pulse" style={{ background: t.primary }}>
                <span className="material-symbols-outlined text-5xl" style={{ color: t.onPrimary }}>smartphone</span>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full blur-2xl" style={{ background: `${t.primary}1A` }} />
            </div>
            <div className="p-6 rounded-2xl flex items-center gap-6 overflow-hidden relative" style={{ background: '#795600' + '14' }}>
              <div className="flex-1 z-10 text-left">
                <h3 className="text-lg font-bold mb-2" style={{ color: '#795600' }}>Delivery Veloz</h3>
                <p className="text-sm" style={{ color: t.onSurfaceVariant }}>Llegamos a tu puerta en menos de 40 minutos o es gratis.</p>
              </div>
              <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl -rotate-12 shrink-0" style={{ background: '#795600' }}>
                <span className="material-symbols-outlined text-5xl text-white">delivery_dining</span>
              </div>
              <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full blur-2xl" style={{ background: '#79560014' }} />
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 h-16 flex justify-around items-center px-4 rounded-t-2xl shadow-lg"
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
    </div>
  );
}
