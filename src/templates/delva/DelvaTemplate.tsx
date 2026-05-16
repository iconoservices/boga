'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';

interface DelvaTemplateProps {
  store: StoreConfig;
}

const MOCK_PRODUCTS = [
  { id: 'camu-camu', title: 'Camu Camu Amazónico', storeName: 'Selección Selva', price: 12, hasOffer: false, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80', categoryId: 'frutas' },
  { id: 'aguaje', title: 'Aguaje de la Selva', storeName: 'Frutas Nativas', price: 8, hasOffer: false, image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80', categoryId: 'frutas' },
  { id: 'copoazu', title: 'Copoazú Premium', storeName: 'Selección Selva', price: 15, hasOffer: true, originalPrice: 20, image: 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400&q=80', categoryId: 'frutas' },
  { id: 'yuca', title: 'Yuca Fresca del Campo', storeName: 'Chacra Amazónica', price: 5, hasOffer: false, image: 'https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?w=400&q=80', categoryId: 'verduras' },
  { id: 'paiche', title: 'Paiche del Amazonas', storeName: 'Río Vivo', price: 45, hasOffer: false, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80', categoryId: 'carnes' },
  { id: 'ceramica', title: 'Cerámica Shipibo-Conibo', storeName: 'Arte Nativo', price: 80, hasOffer: false, image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80', categoryId: 'artesania' },
  { id: 'chirimoya', title: 'Chirimoya Selecta', storeName: 'Frutas Nativas', price: 18, hasOffer: false, image: 'https://images.unsplash.com/photo-1552825897-bb78b3661a27?w=400&q=80', categoryId: 'frutas' },
  { id: 'bijao', title: 'Hojas de Bijao x50', storeName: 'Chacra Amazónica', price: 10, hasOffer: true, originalPrice: 14, image: 'https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?w=400&q=80', categoryId: 'verduras' },
];

const BANNERS = [
  { bg: '#1B4332', title: 'Lo mejor de la Amazonía', sub: 'Productos frescos directo del productor', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80' },
  { bg: '#2D6A4F', title: 'Frutas Nativas', sub: 'Camu camu, aguaje, copoazú y más', img: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80' },
  { bg: '#00a651', title: 'Arte Shipibo', sub: 'Artesanía ancestral hecha a mano', img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80' },
];

const CATEGORIES = [
  { id: 'all', name: 'Todo', icon: '🌿' },
  { id: 'frutas', name: 'Frutas', icon: '🍊' },
  { id: 'verduras', name: 'Verduras', icon: '🥬' },
  { id: 'carnes', name: 'Carnes', icon: '🐟' },
  { id: 'artesania', name: 'Artesanía', icon: '🏺' },
];

const GLOBAL_FILTERS = [
  { id: 'all', label: '✨ Todos' },
  { id: 'offers', label: '🔥 Ofertas' },
  { id: 'new', label: '🆕 Nuevos' },
];

export default function DelvaTemplate({ store }: DelvaTemplateProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bannerIdx, setBannerIdx] = useState(0);
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
            title: p.name,
            storeName: p.store,
            price: p.price,
            hasOffer: false,
            image: p.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80',
            categoryId: categoryObj ? categoryObj.href : p.category.toLowerCase(),
          };
        });
        
        setProducts([...dbProducts, ...MOCK_PRODUCTS]);
      }
    };
    
    fetchProducts();
  }, [store.slug, store.categories]);

  const t = store.theme;

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'all' || p.categoryId === activeCategory;
    const matchFilter = activeFilter === 'all' || (activeFilter === 'offers' && p.hasOffer);
    const matchSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchFilter && matchSearch;
  });

  const banner = BANNERS[bannerIdx];

  return (
    <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", paddingBottom: '100px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '58px', zIndex: 1000,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
      }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1B4332', fontFamily: "'Montserrat', sans-serif", letterSpacing: '-1px' }}>
          {store.name}
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', position: 'relative', cursor: 'pointer' }}>
            🛒
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#1B4332', color: 'white', fontSize: '0.6rem', fontWeight: 900, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>
                {cartCount}
              </span>
            )}
          </button>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1B4332', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
            👤
          </div>
        </div>
      </nav>

      {/* ── HERO CAROUSEL ──────────────────────────── */}
      <section style={{ marginTop: '58px' }}>
        <div style={{
          position: 'relative', height: '220px', background: banner.bg,
          overflow: 'hidden', cursor: 'pointer'
        }}>
          <img
            src={banner.img}
            alt={banner.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.45)', transition: 'opacity 0.5s' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${banner.bg}EE 30%, transparent)` }} />
          <div style={{ position: 'absolute', bottom: '28px', left: '20px', zIndex: 10 }}>
            <p style={{ color: '#00a651', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
              🌿 {store.tagline}
            </p>
            <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1.2, fontFamily: "'Montserrat', sans-serif", maxWidth: '260px' }}>
              {banner.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginTop: '4px' }}>
              {banner.sub}
            </p>
          </div>
          {/* Dot indicators */}
          <div style={{ position: 'absolute', bottom: '12px', right: '20px', display: 'flex', gap: '6px' }}>
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIdx(i)}
                style={{
                  width: i === bannerIdx ? '20px' : '6px', height: '6px',
                  borderRadius: '3px', border: 'none', cursor: 'pointer',
                  background: i === bannerIdx ? '#00a651' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── SEARCH BAR ─────────────────────────────── */}
      <div style={{ padding: '0 16px', marginTop: '-20px', position: 'relative', zIndex: 50 }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔍</span>
          <input
            type="text"
            placeholder={`Buscar en ${store.name}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a',
              background: 'transparent', fontFamily: 'inherit'
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900 }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── SHORTCUT RIBBON (global filters) ───────── */}
      <div style={{ padding: '14px 16px 4px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {GLOBAL_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              background: activeFilter === f.id ? '#1B4332' : 'white',
              color: activeFilter === f.id ? 'white' : '#444',
              fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── CATEGORY PILLS ─────────────────────────── */}
      <div style={{ padding: '4px 16px 8px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1.5px solid',
              borderColor: activeCategory === cat.id ? '#1B4332' : 'rgba(0,0,0,0.08)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeCategory === cat.id ? '#1B433210' : 'white',
              color: activeCategory === cat.id ? '#1B4332' : '#555',
              fontWeight: activeCategory === cat.id ? 800 : 600,
              fontSize: '0.75rem', transition: 'all 0.2s', fontFamily: 'inherit'
            }}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* ── PRODUCT GRID ───────────────────────────── */}
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#1a1a1a', margin: 0 }}>
            {searchTerm ? 'Resultados' : 'Explorar Productos'}
          </h3>
          <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>
            {filtered.length} productos
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.4 }}>
            <p style={{ fontSize: '2rem' }}>🌿</p>
            <p style={{ fontWeight: 700 }}>No hay productos aquí.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {filtered.map((product) => {
              const seed = product.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
              const approval = 94 + (seed % 6);
              return (
                <div
                  key={product.id}
                  style={{
                    background: 'white', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    transition: 'transform 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', aspectRatio: '1/1', background: '#f5f5f5' }}>
                    <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {product.hasOffer && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#ff4d4f10', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px', borderBottom: '1px solid #ff4d4f15' }}>
                        <span style={{ fontSize: '0.7rem' }}>🔥</span>
                        <span style={{ color: '#ff4d4f', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.5px' }}>OFERTA</span>
                      </div>
                    )}
                    <button
                      onClick={() => setCartCount(c => c + 1)}
                      style={{
                        position: 'absolute', bottom: '8px', right: '8px',
                        background: 'white', width: '32px', height: '32px',
                        borderRadius: '50%', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.12)', fontSize: '1rem',
                        transition: 'transform 0.15s'
                      }}
                    >
                      🛒
                    </button>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '8px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1a1a1a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {product.title}
                    </h4>
                    <p style={{ fontSize: '0.62rem', color: '#888', margin: '2px 0 0', fontWeight: 600 }}>
                      {product.storeName}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '6px' }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 750, color: '#52c41a' }}>📈 {approval}% intrc.</div>
                        <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: 650 }}>⭐ {approval + 40} guardados</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {product.hasOffer && (product as any).originalPrice && (
                          <div style={{ fontSize: '0.62rem', textDecoration: 'line-through', color: '#aaa', fontWeight: 600 }}>
                            S/ {(product as any).originalPrice.toFixed(2)}
                          </div>
                        )}
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: product.hasOffer ? '#ff4d4f' : '#1B4332' }}>
                          S/ {product.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ─────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '62px', zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 16px'
      }}>
        {[
          { icon: '🏠', label: 'Inicio' },
          { icon: '🔍', label: 'Explorar' },
          { icon: '❤️', label: 'Guardados' },
          { icon: '👤', label: 'Perfil' },
        ].map((item) => (
          <button key={item.label} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#888' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
