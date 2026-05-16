'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';

interface NaturaTemplateProps {
  store: StoreConfig;
}

const MOCK_PRODUCTS = [
  { id: 'camu-camu', name: 'Camu Camu Amazónico', desc: 'Fruta silvestre con mayor vitamina C del mundo.', price: 'S/ 12.00', category: 'frutas', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80' },
  { id: 'aguaje', name: 'Aguaje de la Selva', desc: 'Fruto amazónico rico en betacarotenos.', price: 'S/ 8.00', category: 'frutas', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80' },
  { id: 'copoazu', name: 'Copoazú Premium', desc: 'Pariente del cacao, pulpa cremosa tropical.', price: 'S/ 15.00', category: 'frutas', image: 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400&q=80' },
  { id: 'yuca', name: 'Yuca Fresca', desc: 'Cosechada en chacras locales.', price: 'S/ 5.00', category: 'verduras', image: 'https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?w=400&q=80' },
  { id: 'paiche', name: 'Paiche Amazónico', desc: 'El gigante del río Amazonas.', price: 'S/ 45.00', category: 'carnes', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80' },
  { id: 'ceramica', name: 'Cerámica Shipibo-Conibo', desc: 'Arte ancestral hecho a mano.', price: 'S/ 80.00', category: 'artesania', image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'Todo', icon: 'apps' },
  { id: 'frutas', label: 'Frutas', icon: 'nutrition' },
  { id: 'verduras', label: 'Verduras', icon: 'eco' },
  { id: 'carnes', label: 'Carnes', icon: 'set_meal' },
  { id: 'artesania', label: 'Artesanía', icon: 'diamond' },
];

export default function NaturaTemplate({ store }: NaturaTemplateProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState<any[]>(MOCK_PRODUCTS);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);
      
      if (data && !error && data.length > 0) {
        const dbProducts = data.map((p) => {
          const categoryObj = store.categories.find(c => c.name === p.category);
          return {
            id: p.id,
            name: p.name,
            desc: '',
            price: `S/ ${p.price.toFixed(2)}`,
            category: categoryObj ? categoryObj.href : p.category.toLowerCase(),
            image: p.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80',
          };
        });
        
        setProducts([...dbProducts, ...MOCK_PRODUCTS]);
      }
    };
    
    fetchProducts();
  }, [store.slug, store.categories]);

  const t = store.theme;

  const filtered = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
        style={{ background: `${t.surface}F0`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>forest</span>
          <span className="text-xl font-black tracking-tight uppercase" style={{ color: t.secondary }}>{store.name}</span>
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-full" style={{ background: `${t.primary}14` }}>
          <span className="material-symbols-outlined text-[20px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>shopping_basket</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>{cartCount}</span>
          )}
        </button>
      </header>

      <main className="pt-14 pb-24">
        {/* Hero banner */}
        <div className="relative h-52 overflow-hidden">
          <img className="w-full h-full object-cover" style={{ filter: 'brightness(0.6)' }} alt={store.heroAlt} src={store.heroImage} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, ${t.background})` }} />
          <div className="absolute bottom-0 left-0 px-4 pb-4">
            <p className="text-[10px] uppercase font-bold tracking-[0.25em] mb-1" style={{ color: t.primary }}>{store.tagline}</p>
            <h1 className="text-3xl font-black leading-tight" style={{ color: '#ffffff' }}>Lo mejor de la<br />Amazonía 🌿</h1>
          </div>
        </div>

        {/* Category chips with Material Icons */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 text-[11px] font-bold uppercase tracking-wide transition-all"
                style={{ background: isActive ? t.primary : t.surfaceContainerHigh, color: isActive ? t.onPrimary : t.onSurfaceVariant, border: `1px solid ${isActive ? t.primary : t.outlineVariant}` }}>
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-3 px-4 mt-2">
          {filtered.map((product, idx) => {
            const isFeatured = idx === 0 && activeCategory === 'all';
            return (
              <div key={product.id}
                className={`rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-transform ${isFeatured ? 'col-span-2' : 'col-span-1'}`}
                style={{ background: t.surface, border: `1px solid ${t.outlineVariant}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className={isFeatured ? 'aspect-[2/1]' : 'aspect-square'}>
                  <img className="w-full h-full object-cover" alt={product.name} src={product.image} />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-[13px] leading-tight line-clamp-1" style={{ color: t.onSurface }}>{product.name}</h3>
                  <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: t.onSurfaceVariant }}>{product.desc}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-black text-[15px]" style={{ color: t.primary }}>{product.price}</span>
                    <button onClick={() => setCartCount((c) => c + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90"
                      style={{ background: t.primary, color: t.onPrimary }}>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16"
        style={{ background: `${t.surface}F5`, backdropFilter: 'blur(20px)', borderTop: `1px solid ${t.outlineVariant}` }}>
        <div className="flex justify-around items-center h-full px-4">
          {[{ icon: 'home', label: 'Inicio' }, { icon: 'search', label: 'Buscar' }, { icon: 'favorite', label: 'Guardados' }, { icon: 'person', label: 'Perfil' }].map((item) => (
            <button key={item.label} className="flex flex-col items-center gap-0.5 transition-colors" style={{ color: t.onSurfaceVariant, fontFamily: t.fontLabel }}>
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
