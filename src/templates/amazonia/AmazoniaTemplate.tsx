'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';

interface AmazoniaTemplateProps {
  store: StoreConfig;
}

const MOCK_PRODUCTS = [
  { id: 'ceramica', name: 'Cerámica Shipibo-Conibo', desc: 'Vasija de barro pintada a mano con arcilla blanca y tintes naturales.', price: 'S/ 120.00', category: 'artesania', image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=400&q=80' },
  { id: 'manta-kene', name: 'Manta Kené Bordada', desc: 'Bordado tradicional de diseños geométricos sagrados del bosque.', price: 'S/ 180.00', category: 'artesania', image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&q=80' },
  { id: 'collar-huayruro', name: 'Collar de Huayruro Semillas', desc: 'Amuleto protector elaborado a mano con hilos orgánicos.', price: 'S/ 35.00', category: 'artesania', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80' },
  { id: 'aceite-copaiba', name: 'Aceite de Copaiba Puro', desc: 'Resina medicinal silvestre con propiedades cicatrizantes.', price: 'S/ 45.00', category: 'bienestar', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&q=80' },
  { id: 'cacao-chuncho', name: 'Chocolate Cacao Nativo 85%', desc: 'Elaborado artesanalmente con cacao fino de aroma.', price: 'S/ 18.00', category: 'alimentos', image: 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?w=400&q=80' },
  { id: 'cesta-chambira', name: 'Cesta Teñida en Chambira', desc: 'Tejida de forma tradicional con fibras de palmera.', price: 'S/ 75.00', category: 'artesania', image: 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?w=400&q=80' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'Todo', icon: 'apps' },
  { id: 'artesania', label: 'Artesanía', icon: 'interests' },
  { id: 'bienestar', label: 'Bienestar', icon: 'spa' },
  { id: 'alimentos', label: 'Alimentos', icon: 'restaurant' },
];

export default function AmazoniaTemplate({ store }: AmazoniaTemplateProps) {
  const { isDemoVisible } = useDemo();
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);

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
          price: `S/ ${p.price.toFixed(2)}`,
          category: categoryObj ? categoryObj.href : p.category.toLowerCase(),
          image: p.image || 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=400&q=80',
        };
      }) : [];
      
      setProducts(showDemo ? [...dbProducts, ...MOCK_PRODUCTS] : dbProducts);
    };
    
    fetchProducts();
  }, [store.slug, store.categories, isDemoVisible]);

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
          {store.logoImage ? (
            <img src={store.logoImage} alt={store.name} className="w-7 h-7 rounded-lg object-cover border border-gray-100" />
          ) : (
            <span className="material-symbols-outlined text-[22px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>interests</span>
          )}
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
            <h1 className="text-3xl font-black leading-tight" style={{ color: '#ffffff' }}>Arte y Tradición<br />de la Selva 🏺</h1>
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
                  <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: t.onSurfaceVariant }}>{product.desc}</p>
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
