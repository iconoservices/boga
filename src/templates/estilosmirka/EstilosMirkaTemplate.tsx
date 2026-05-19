'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';

interface EstilosMirkaTemplateProps {
  store: StoreConfig;
}

const MOCK_PRODUCTS = [
  { id: 'blazer-vino', title: 'Blazer Ejecutivo Vino Estructurado', price: 189.00, originalPrice: 240.00, hasOffer: true, category: 'blazers', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', description: 'Blazer de corte ejecutivo en tono vino, perfecto para ocasiones formales y looks de oficina sofisticados.' },
  { id: 'blusa-rosa', title: 'Blusa Satinada Rosa Empolvado', price: 85.00, originalPrice: 85.00, hasOffer: false, category: 'blusas', image: 'https://images.unsplash.com/photo-1551163943-3f7253a97891?w=600&q=80', description: 'Blusa de corte fluido en satín suave, ideal para combinar con pantalones de vestir o faldas midi.' },
  { id: 'pantalon-negro', title: 'Pantalón Palazzo Negro Elegante', price: 120.00, originalPrice: 150.00, hasOffer: true, category: 'pantalones', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80', description: 'Pantalón de pierna ancha en tejido fluido negro, versátil para looks casual o semi-formal.' },
  { id: 'vestido-midi', title: 'Vestido Midi Vino Cruzado', price: 145.00, originalPrice: 145.00, hasOffer: false, category: 'vestidos', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', description: 'Vestido cruzado de longitud midi en tono burgundy, escote en V y cintura ajustable con lazo.' },
  { id: 'chaqueta-cuero', title: 'Chaqueta Cuero Sintético Negra', price: 210.00, originalPrice: 280.00, hasOffer: true, category: 'blazers', image: 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&q=80', description: 'Chaqueta de cuero sintético de alta calidad, corte slim con detalles metálicos dorados.' },
  { id: 'falda-lapiz', title: 'Falda Lápiz Marrón Chocolate', price: 95.00, originalPrice: 95.00, hasOffer: false, category: 'faldas', image: 'https://images.unsplash.com/photo-1583496661160-fb5218d8f91e?w=600&q=80', description: 'Falda lápiz de corte entallado en tono marrón oscuro, con abertura trasera discreta.' },
  { id: 'blusa-estampada', title: 'Blusa Floral Manga Larga Vino', price: 75.00, originalPrice: 95.00, hasOffer: true, category: 'blusas', image: 'https://images.unsplash.com/photo-1603344205538-f29e5e47df84?w=600&q=80', description: 'Blusa de manga larga con estampado floral en tonos vino y beige, perfecta para looks románticos.' },
  { id: 'vestido-noche', title: 'Vestido Noche Negro Clásico', price: 220.00, originalPrice: 220.00, hasOffer: false, category: 'vestidos', image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80', description: 'Vestido de noche en negro, escote asimétrico y corte a la rodilla, para eventos formales y galas.' }
];

export default function EstilosMirkaTemplate({ store }: EstilosMirkaTemplateProps) {
  const { isDemoVisible } = useDemo();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Product Detail Sheet
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [detailQty, setDetailQty] = useState(1);
  
  // Cart State
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Dynamic Products from Supabase
  const [supabaseProducts, setSupabaseProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchSupabaseProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('store', 'estilosmirka');
        
        if (data && !error && data.length > 0) {
          const formatted = data.map((p) => ({
            id: p.id,
            title: p.name,
            price: p.price,
            originalPrice: p.price,
            hasOffer: false,
            category: p.category ? p.category.toLowerCase() : 'vestidos',
            image: p.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80',
            description: p.description || 'Prenda exclusiva de Estilos Mirka.'
          }));
          setSupabaseProducts(formatted);
        }
      } catch (err) {
        console.error('Error fetching Supabase products:', err);
      }
    };

    fetchSupabaseProducts();
  }, []);

  const theme = store.theme;
  const allProducts = isDemoVisible('estilosmirka')
    ? [...supabaseProducts, ...MOCK_PRODUCTS]
    : supabaseProducts;

  const filteredProducts = allProducts.filter((prod) => {
    const matchCat = activeCategory === 'all' || prod.category === activeCategory;
    const matchSearch = prod.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  // Cart Handlers
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, amount: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            return { ...item, quantity: item.quantity + amount };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const sendCartToWhatsApp = () => {
    const header = `*Pedido de Estilos Mirka*\n-------------------------\n`;
    const itemsText = cart.map(item => `- ${item.product.title} (x${item.quantity}): S/ ${(item.product.price * item.quantity).toFixed(2)}`).join('\n');
    const footer = `\n-------------------------\n*Total:* S/ ${cartTotal.toFixed(2)}`;
    const text = encodeURIComponent(header + itemsText + footer);
    window.open(`https://wa.me/51999999999?text=${text}`, '_blank');
  };

  return (
    <div style={{ background: theme.background, minHeight: '100vh', fontFamily: theme.fontBody, color: theme.onBackground, paddingBottom: '90px' }}>
      {/* External CSS imports */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-black/8 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-6">
          {/* Logo */}
          <span className="text-xl font-bold tracking-tight shrink-0" style={{ fontFamily: theme.fontHeadline, color: theme.primaryContainer }}>
            {store.name}
          </span>

          {/* Nav links — desktop only */}
          <nav className="hidden md:flex items-center gap-6">
            {['Nuevos', 'Colección', 'Vestidos', 'Blusas', 'Blazers'].map((item) => (
              <button
                key={item}
                onClick={() => setActiveCategory(item === 'Nuevos' || item === 'Colección' ? 'all' : item.toLowerCase())}
                className="text-xs font-semibold uppercase tracking-wider hover:opacity-60 transition-opacity cursor-pointer"
                style={{ color: theme.onBackground }}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            {/* Wishlist */}
            <button className="p-1.5 cursor-pointer hover:opacity-60 transition-opacity hidden md:block">
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primaryContainer }}>favorite_border</span>
            </button>
            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 cursor-pointer hover:opacity-60 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primaryContainer }}>shopping_bag</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: theme.primary }}>
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ──────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: '52vw', maxHeight: '380px', minHeight: '220px' }}>
        <div className="absolute inset-0 z-0">
          <img 
            src={store.heroImage} 
            alt={store.heroAlt} 
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(61,13,24,0.88) 0%, rgba(61,13,24,0.55) 55%, rgba(61,13,24,0.10) 100%)' }} />
        </div>

        <div className="max-w-6xl mx-auto px-5 relative z-10 h-full flex flex-col justify-center">
          <div className="text-white space-y-3 max-w-[260px] sm:max-w-md md:max-w-xl lg:max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-white/70">Colección Exclusiva</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight" style={{ fontFamily: theme.fontHeadline }}>
              Sofisticante
            </h1>
            <p className="text-sm text-white/75 font-light leading-relaxed">
              {store.tagline}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button 
                onClick={() => {
                  const element = document.getElementById('catalog');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                style={{ background: theme.primary }}
              >
                Ver Colección
              </button>
            </div>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {[0,1,2,3].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? 'white' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>
      </section>

      {/* ── MAIN CATALOG ────────────────────────────── */}
      <section id="catalog" className="max-w-6xl mx-auto px-4 py-8">
        {/* Search + title */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: theme.fontHeadline, color: theme.primaryContainer }}>
            Nuestra Colección
          </h2>
        </div>

        {/* Category Ribbon */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: 'Todo' },
            { id: 'vestidos', label: 'Vestidos' },
            { id: 'blusas', label: 'Blusas' },
            { id: 'blazers', label: 'Blazers' },
            { id: 'pantalones', label: 'Pantalones' },
            { id: 'faldas', label: 'Faldas' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer"
              style={{
                backgroundColor: activeCategory === cat.id ? theme.primary : 'white',
                color: activeCategory === cat.id ? 'white' : '#555',
                borderColor: activeCategory === cat.id ? theme.primary : 'rgba(0,0,0,0.12)',
                borderRadius: '2px',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product Grid — 4 columns on desktop, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => { setSelectedProduct(prod); setDetailQty(1); setSelectedSize('M'); }}
                    className="bg-white border border-black/5 overflow-hidden flex flex-col group relative cursor-pointer"
                    style={{ borderRadius: '4px' }}
                  >
                    {/* Badge Offer */}
                    {prod.hasOffer && (
                      <span className="absolute top-2 left-2 text-white text-[9px] font-black px-2 py-0.5 z-10 shadow uppercase tracking-wide" style={{ background: theme.primary, borderRadius: '2px' }}>
                        OFERTA
                      </span>
                    )}

                    {/* Portrait image — 3:4 ratio like fashion stores */}
                    <div className="overflow-hidden relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
                      <img src={prod.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={prod.title} />
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-medium text-xs text-gray-900 leading-snug line-clamp-2 mb-2" style={{ fontFamily: theme.fontBody }}>
                        {prod.title}
                      </h4>
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          {prod.hasOffer && prod.originalPrice && prod.originalPrice !== prod.price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              S/ {prod.originalPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="font-bold text-sm" style={{ color: theme.primary }}>
                            S/ {prod.price.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 border" style={{ color: theme.primary, borderColor: theme.primary, borderRadius: '2px' }}>
                          Ver
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
        </div>
      </section>

      {/* ── PRODUCT DETAIL SHEET ───────────────────────── */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 flex flex-col w-full h-full bg-white overflow-hidden animate-fade-in"
          style={{ background: theme.background }}
        >
          {/* Header/Top Bar */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-black/5 shrink-0 bg-white" style={{ background: theme.surface }}>
            <button
              onClick={() => setSelectedProduct(null)}
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>arrow_back</span>
            </button>
            <span className="font-bold text-xs uppercase tracking-widest" style={{ fontFamily: theme.fontHeadline, color: theme.primaryContainer }}>
              Detalle del Producto
            </span>
            <button
              onClick={() => { setSelectedProduct(null); setIsCartOpen(true); }}
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity relative"
            >
              <span className="material-symbols-outlined text-xl" style={{ color: theme.primary }}>shopping_bag</span>
              {cartItemsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: theme.primary }}>
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-28">
            {/* Image (3:4 ratio for clothes) */}
            <div className="w-full relative bg-gray-100 aspect-[3/4] max-w-md mx-auto">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                className="w-full h-full object-cover object-top"
              />
              {selectedProduct.hasOffer && (
                <span className="absolute top-4 left-4 text-white text-[10px] font-black px-3 py-1 shadow uppercase tracking-wide" style={{ background: theme.primary, borderRadius: '2px' }}>OFERTA</span>
              )}
            </div>

            {/* Product Info */}
            <div className="max-w-md mx-auto px-5 py-6">
              {/* Title + Price */}
              <div className="flex flex-col gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.primary }}>
                  {selectedProduct.category}
                </span>
                <h1 className="text-xl font-bold leading-tight" style={{ fontFamily: theme.fontHeadline, color: theme.primaryContainer }}>
                  {selectedProduct.title}
                </h1>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black" style={{ color: theme.primary }}>S/ {selectedProduct.price.toFixed(2)}</span>
                  {selectedProduct.hasOffer && selectedProduct.originalPrice && selectedProduct.originalPrice !== selectedProduct.price && (
                    <span className="text-xs text-gray-400 line-through">S/ {selectedProduct.originalPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div className="border-t border-black/5 pt-4 mb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {/* Size selector */}
              <div className="border-t border-black/5 pt-4 mb-5">
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.primaryContainer }}>Talla</p>
                <div className="flex gap-2 flex-wrap">
                  {['XS','S','M','L','XL','XXL'].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className="w-10 h-10 text-xs font-bold border transition-all cursor-pointer"
                      style={{
                        borderRadius: '2px',
                        background: selectedSize === sz ? theme.primary : 'white',
                        color: selectedSize === sz ? 'white' : '#555',
                        borderColor: selectedSize === sz ? theme.primary : 'rgba(0,0,0,0.15)',
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed bottom bar */}
          <div className="border-t border-black/5 px-5 py-4 flex gap-3 items-center bg-white shrink-0 mt-auto" style={{ background: theme.surface }}>
            {/* Qty */}
            <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1.5 shrink-0">
              <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-base" style={{ color: theme.primaryContainer }}>remove</span>
              </button>
              <span className="font-black text-sm w-4 text-center" style={{ color: theme.primaryContainer }}>{detailQty}</span>
              <button onClick={() => setDetailQty(detailQty + 1)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity">
                <span className="material-symbols-outlined text-base" style={{ color: theme.primaryContainer }}>add</span>
              </button>
            </div>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/51999999999?text=Hola,%20quiero%20comprar%20${detailQty}%20${encodeURIComponent(selectedProduct.title)}%20Talla%20${selectedSize}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center shadow-lg shrink-0 hover:opacity-90 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
              </svg>
            </a>

            {/* Add to cart */}
            <button
              onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
              className="flex-1 h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              style={{ background: theme.primary }}
            >
              <span className="material-symbols-outlined text-lg">shopping_bag</span>
              Añadir · S/ {(selectedProduct.price * detailQty).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* ── SHOPPING CART DRAWER ─────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-slide-in">
            {/* Cart Header */}
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-700">shopping_bag</span>
                <h3 className="font-bold text-gray-900">Tu Bolsa de Compras</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-16">
                  <span className="material-symbols-outlined text-5xl mb-2 text-gray-400">shopping_bag</span>
                  <p className="font-bold text-gray-500">Tu bolsa está vacía.</p>
                  <p className="text-xs text-gray-400 mt-1">Explora productos premium y añádelos aquí.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-black/5 relative">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border">
                      <img src={item.product.image} className="w-full h-full object-cover" alt={item.product.title} />
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 truncate leading-snug">
                          {item.product.title}
                        </h4>
                        <span className="font-black text-xs block mt-1" style={{ color: theme.primary }}>
                          S/ {item.product.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity adjust */}
                        <div className="flex items-center bg-white border rounded-lg p-0.5">
                          <button 
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-xs text-gray-500 hover:text-black cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-[11px] font-black text-gray-800">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-5 h-5 flex items-center justify-center font-bold text-xs text-gray-500 hover:text-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Remove */}
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-black/5 bg-gray-50 space-y-4">
                <div className="flex items-center justify-between font-black text-gray-900 text-sm">
                  <span>Subtotal:</span>
                  <span className="text-lg" style={{ color: theme.primary }}>S/ {cartTotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={sendCartToWhatsApp}
                    className="w-full py-3 rounded-full text-xs font-black uppercase text-white shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 transition-all cursor-pointer bg-[#25D366]"
                  >
                    💬 Enviar Pedido vía WhatsApp
                  </button>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-3 rounded-full text-xs font-black uppercase bg-gray-900 hover:bg-black text-white text-center block transition-all cursor-pointer"
                  >
                    Seguir Comprando
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="bg-gray-900 text-white/50 text-xs py-10 border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: theme.fontHeadline, color: 'white' }}>
              {store.name}
            </span>
            <p className="text-[11px] leading-relaxed">
              Tu boutique de moda de confianza. Ofrecemos prendas exclusivas, calidad premium y las últimas tendencias para que deslumbres con cada look.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Horario de Atención</h4>
            <ul className="space-y-1 text-[11px]">
              <li>Lunes a Sábado: 09:00 AM - 08:00 PM</li>
              <li>Domingos: Cerrado</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Ubicación & Contacto</h4>
            <ul className="space-y-1 text-[11px]">
              <li>📍 Av. Benavides 1240, Miraflores, Lima, Perú</li>
              <li>📞 +51 999 999 999</li>
              <li>✉️ contacto@estilosmirka.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 border-t border-white/5 mt-8 pt-6 text-center text-[10px]">
          © {new Date().getFullYear()} Estilos Mirka. Todos los derechos reservados. Powered by Boga Market.
        </div>
      </footer>
    </div>
  );
}
