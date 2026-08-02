'use client';

import React, { useState, useEffect } from 'react';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { debeMostrarDemo } from '@/lib/demo';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import StoreFloatingActions from '@/components/StoreFloatingActions';

interface FloresTemplateProps {
  store: StoreConfig;
}

interface Product {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: string;
  image: string;
}

const MOCK_PRODUCTS: Product[] = [
  { id: 'rosas-rojas', name: 'Ramo de Rosas Rojas', desc: '12 rosas rojas frescas con follaje y papel kraft.', price: 65.00, category: 'ramos', image: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&q=80' },
  { id: 'arreglo-primaveral', name: 'Arreglo Primaveral', desc: 'Mix de flores de temporada en base de cerámica.', price: 85.00, category: 'arreglos', image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&q=80' },
  { id: 'orquidea', name: 'Orquídea en Maceta', desc: 'Orquídea Phalaenopsis lista para regalar.', price: 55.00, category: 'plantas', image: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80' },
  { id: 'girasoles', name: 'Caja de Girasoles', desc: 'Girasoles frescos en caja sorpresa.', price: 70.00, category: 'ramos', image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&q=80' },
  { id: 'peluche-flores', name: 'Peluche + Flores', desc: 'Combo de ramo pequeño con peluche y chocolates.', price: 95.00, category: 'detalles', image: 'https://images.unsplash.com/photo-1462530260150-162092dbf011?w=600&q=80' },
  { id: 'tulipanes', name: 'Ramo de Tulipanes', desc: 'Tulipanes importados de colores variados.', price: 60.00, category: 'ramos', image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=600&q=80' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'Todo', icon: 'apps' },
  { id: 'ramos', label: 'Ramos', icon: 'local_florist' },
  { id: 'arreglos', label: 'Arreglos', icon: 'yard' },
  { id: 'plantas', label: 'Plantas', icon: 'potted_plant' },
  { id: 'detalles', label: 'Detalles', icon: 'redeem' },
];

export default function FloresTemplate({ store }: FloresTemplateProps) {
  const demoPermitido = store.showDemoProducts !== false;
  const t = store.theme;

  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);

  // Detalle de producto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  // Carrito
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);

      const dbProducts: Product[] = data && !error ? data.map((p) => {
        const categoryObj = store.categories.find(c => c.name === p.category);
        return {
          id: p.id,
          name: p.name,
          desc: p.description || '',
          price: p.price,
          category: categoryObj ? categoryObj.href : p.category.toLowerCase(),
          image: p.image || 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600&q=80',
        };
      }) : [];

      // Los demo solo entran si la tienda esta vacia (ver lib/demo.ts).
      const conDemo = debeMostrarDemo({ showDemoProducts: demoPermitido }, dbProducts.length);
      setProducts(conDemo ? [...dbProducts, ...MOCK_PRODUCTS] : dbProducts);
    };

    fetchProducts();
  }, [store.slug, store.categories, demoPermitido]);

  const filtered = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);

  const addToCart = (product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, amount: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.product.id === productId ? { ...item, quantity: item.quantity + amount } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const sendCartToWhatsApp = () => {
    const header = `*Pedido de ${store.name}*\n-------------------------\n`;
    const itemsText = cart.map((item) => `- ${item.product.name} (x${item.quantity}): S/ ${(item.product.price * item.quantity).toFixed(2)}`).join('\n');
    const footer = `\n-------------------------\n*Total:* S/ ${cartTotal.toFixed(2)}`;
    enviarPedidoPorWhatsApp(store, header + itemsText + footer);
  };

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setDetailQty(1);
  };

  return (
    <div style={{ background: t.background, minHeight: '100vh', fontFamily: t.fontBody, color: t.onBackground, paddingBottom: '72px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── HEADER — sticky, con nav de escritorio ──────────────────── */}
      <header className="sticky top-0 z-40" style={{ background: `${t.surface}F5`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 shrink-0">
            {store.logoImage ? (
              <img src={store.logoImage} alt={store.name} className="w-8 h-8 rounded-full object-cover border border-black/10" />
            ) : (
              <span className="material-symbols-outlined text-[22px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>local_florist</span>
            )}
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: t.fontHeadline, color: t.secondary }}>{store.name}</span>
          </div>

          {/* Nav — solo escritorio */}
          <nav className="hidden md:flex items-center gap-6">
            {CATEGORY_TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                className="text-xs font-semibold uppercase tracking-wider transition-opacity hover:opacity-60 cursor-pointer"
                style={{ color: activeCategory === tab.id ? t.primary : t.onBackground }}>
                {tab.label}
              </button>
            ))}
          </nav>

          <button onClick={() => setIsCartOpen(true)} className="relative w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-transform active:scale-90" style={{ background: `${t.primary}14` }}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}>shopping_basket</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>{cartItemsCount}</span>
            )}
          </button>
        </div>
      </header>

      <main>
        {/* ── HERO — altura adaptable, mas grande en escritorio ────── */}
        <section className="relative overflow-hidden" style={{ height: '52vw', maxHeight: '380px', minHeight: '220px' }}>
          <img className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.7)' }} alt={store.heroAlt} src={store.heroImage} />
          <StoreFloatingActions store={store} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)` }} />
          <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-end px-4 md:px-6 pb-6">
            <p className="text-[10px] uppercase font-bold tracking-[0.25em] mb-1" style={{ color: t.primaryContainer }}>{store.tagline}</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-xl" style={{ fontFamily: t.fontHeadline, color: '#ffffff' }}>Flores frescas para cada ocasión 🌸</h1>
            <button onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-4 self-start px-6 py-2.5 rounded-full text-xs font-bold shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
              style={{ background: t.primary, color: t.onPrimary }}>
              Ver Catálogo
            </button>
          </div>
        </section>

        {/* ── CATÁLOGO ──────────────────────────────────────────────── */}
        <section id="catalogo" className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Chips de categoría — visibles tambien en escritorio como filtro rapido */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer"
                  style={{ background: isActive ? t.primary : t.surfaceContainerHigh, color: isActive ? t.onPrimary : t.onSurfaceVariant, border: `1px solid ${isActive ? t.primary : t.outlineVariant}` }}>
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Grid — 2 columnas en movil, 4 en escritorio */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
            {filtered.map((product) => (
              <div key={product.id}
                onClick={() => openDetail(product)}
                className="rounded-2xl overflow-hidden cursor-pointer active:scale-95 md:hover:-translate-y-0.5 transition-transform"
                style={{ background: t.surface, border: `1px solid ${t.outlineVariant}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="aspect-square overflow-hidden">
                  <img className="w-full h-full object-cover" alt={product.name} src={product.image} />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-[13px] leading-tight line-clamp-1" style={{ color: t.onSurface }}>{product.name}</h3>
                  <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: t.onSurfaceVariant }}>{product.desc}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-black text-[15px]" style={{ color: t.primary }}>S/ {product.price.toFixed(2)}</span>
                    <button onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                      style={{ background: t.primary, color: t.onPrimary }}>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: t.onSurfaceVariant }}>
              <span className="material-symbols-outlined text-4xl mb-2 block">local_florist</span>
              <p className="text-sm">Todavía no hay productos en esta categoría.</p>
            </div>
          )}
        </section>
      </main>

      {/* ── DETALLE DE PRODUCTO ──────────────────────────────────────── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedProduct(null)}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ background: t.surface }}>
            <div className="relative">
              <button onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <div className="aspect-square">
                <img className="w-full h-full object-cover" alt={selectedProduct.name} src={selectedProduct.image} />
              </div>
            </div>
            <div className="p-5">
              <h2 className="font-bold text-lg" style={{ fontFamily: t.fontHeadline, color: t.onSurface }}>{selectedProduct.name}</h2>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: t.onSurfaceVariant }}>{selectedProduct.desc}</p>

              <div className="flex items-center gap-3 mt-4">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: t.onSurfaceVariant }}>Cantidad</span>
                <div className="flex items-center gap-3 rounded-full px-2 py-1" style={{ background: t.surfaceContainerHigh }}>
                  <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer">
                    <span className="material-symbols-outlined text-sm" style={{ color: t.primary }}>remove</span>
                  </button>
                  <span className="font-black text-sm w-4 text-center" style={{ color: t.onSurface }}>{detailQty}</span>
                  <button onClick={() => setDetailQty(detailQty + 1)} className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer">
                    <span className="material-symbols-outlined text-sm" style={{ color: t.primary }}>add</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => enviarPedidoPorWhatsApp(store, `Hola, quiero consultar por ${detailQty} ${selectedProduct.name}`)}
                  aria-label="Consultar por WhatsApp"
                  className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center shadow-lg shrink-0 hover:opacity-90 active:scale-95 transition-all cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                  </svg>
                </button>
                <button onClick={() => { addToCart(selectedProduct, detailQty); setSelectedProduct(null); }}
                  className="flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  style={{ background: t.primary, color: t.onPrimary }}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Agregar · S/ {(selectedProduct.price * detailQty).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARRITO — panel lateral en escritorio, hoja completa en movil ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div onClick={() => setIsCartOpen(false)} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
          <div className="relative w-full max-w-md h-full flex flex-col z-10" style={{ background: t.surface }}>
            <div className="p-4 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${t.outlineVariant}`, background: t.surfaceContainerLow }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: t.onSurface }}>shopping_basket</span>
                <h3 className="font-bold" style={{ fontFamily: t.fontHeadline, color: t.onSurface }}>Tu Pedido</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer" style={{ background: t.surfaceContainerHigh, color: t.onSurface }}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16" style={{ color: t.onSurfaceVariant }}>
                  <span className="material-symbols-outlined text-5xl mb-2">local_florist</span>
                  <p className="font-bold">Tu pedido está vacío.</p>
                  <p className="text-xs mt-1">Elige tus flores favoritas y añádelas aquí.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 p-3 rounded-2xl" style={{ background: t.surfaceContainerLow, border: `1px solid ${t.outlineVariant}` }}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={item.product.image} className="w-full h-full object-cover" alt={item.product.name} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-bold text-xs truncate leading-snug" style={{ color: t.onSurface }}>{item.product.name}</h4>
                        <span className="font-black text-xs block mt-1" style={{ color: t.primary }}>S/ {item.product.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center rounded-lg p-0.5" style={{ background: t.surface, border: `1px solid ${t.outlineVariant}` }}>
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center font-bold text-xs cursor-pointer" style={{ color: t.onSurfaceVariant }}>-</button>
                          <span className="px-2 text-[11px] font-black" style={{ color: t.onSurface }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center font-bold text-xs cursor-pointer" style={{ color: t.onSurfaceVariant }}>+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-[10px] font-bold hover:underline cursor-pointer" style={{ color: '#c0392b' }}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 space-y-3 shrink-0" style={{ borderTop: `1px solid ${t.outlineVariant}`, background: t.surfaceContainerLow }}>
                <div className="flex items-center justify-between font-black text-sm" style={{ color: t.onSurface }}>
                  <span>Subtotal:</span>
                  <span className="text-lg" style={{ color: t.primary }}>S/ {cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={sendCartToWhatsApp} className="w-full py-3 rounded-full text-xs font-black uppercase text-white shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-95 transition-all cursor-pointer bg-[#25D366]">
                  💬 Enviar Pedido por WhatsApp
                </button>
                <button onClick={() => setIsCartOpen(false)} className="w-full py-3 rounded-full text-xs font-black uppercase cursor-pointer transition-all active:scale-95" style={{ background: t.onSurface, color: t.surface }}>
                  Seguir Comprando
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER — info del local, visible en todos los tamaños ────── */}
      <footer className="hidden md:block" style={{ background: t.secondary, color: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: t.fontHeadline }}>{store.name}</span>
            <p className="text-[11px] leading-relaxed opacity-80">{store.tagline || 'Flores frescas y arreglos hechos a mano para cada ocasión especial.'}</p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-[11px]">Horario</h4>
            <p className="text-[11px] opacity-80">{store.horario || 'Consulta disponibilidad'}</p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-[11px]">Ubicación</h4>
            <p className="text-[11px] opacity-80">{store.direccion || store.zona || 'Delivery a coordinar por WhatsApp'}</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-white/10 py-4 text-center text-[10px] opacity-60">
          © {new Date().getFullYear()} {store.name}. Powered by Boga Market.
        </div>
      </footer>

      {/* ── NAV INFERIOR — solo movil ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16" style={{ background: `${t.surface}F5`, backdropFilter: 'blur(20px)', borderTop: `1px solid ${t.outlineVariant}` }}>
        <div className="flex justify-around items-center h-full px-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 cursor-pointer" style={{ color: t.onSurfaceVariant, fontFamily: t.fontLabel }}>
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[10px] font-semibold">Inicio</span>
          </button>
          <button onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center gap-0.5 cursor-pointer" style={{ color: t.onSurfaceVariant, fontFamily: t.fontLabel }}>
            <span className="material-symbols-outlined text-[22px]">search</span>
            <span className="text-[10px] font-semibold">Catálogo</span>
          </button>
          <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-0.5 relative cursor-pointer" style={{ color: t.onSurfaceVariant, fontFamily: t.fontLabel }}>
            <span className="material-symbols-outlined text-[22px]">shopping_basket</span>
            <span className="text-[10px] font-semibold">Pedido</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-0.5 right-1 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center" style={{ background: t.primary, color: t.onPrimary }}>{cartItemsCount}</span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
