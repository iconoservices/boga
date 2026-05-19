"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { stores } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';

const MOCK_PRODUCTS = [
  { id: 1, title: "Pizza Margherita Gourmet", price: "S/ 35.00", rating: "4.8", reviews: "(120)", store: "Luigi's", slug: "sunset", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80", logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80" },
  { id: 2, title: "Reloj Cronógrafo Elegance", price: "S/ 450.00", rating: "4.9", reviews: "(45)", store: "Timepiece", slug: "sunset", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80", logo: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=200&q=80" },
  { id: 3, title: "Hamburguesa Smash Clásica", price: "S/ 22.00", rating: "4.7", reviews: "(210)", store: "Burger Bros", slug: "sunset", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80", logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80" },
  { id: 4, title: "Zapatillas Urban Runner Pro", price: "S/ 280.00", rating: "4.9", reviews: "(88)", store: "Kicks Hub", slug: "sunset", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", logo: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=200&q=80" },
  { id: 5, title: "Combo Familiar Super Pollo + Papas XXL", price: "S/ 65.00", rating: "4.9", reviews: "(512)", store: "El Avícola", slug: "sunset", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80", logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80" },
];

const BANNERS_RAW = [
  { id: 'deliv', bg: '#E9826D', img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800", textColor: '#3A1409', darkText: true, tag: null, title1: 'DELIVERY', title2: 'GRATIS', sub: 'En tu primera orden' },
  { id: 'burger', bg: '#4A1D13', img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", textColor: 'white', darkText: false, tag: 'Promo Exclusiva', title1: '2x1 EN', title2: 'HAMBURGUESAS', sub: 'Solo por hoy en locales seleccionados' },
  { id: 'salad', bg: '#2E7D32', img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800", textColor: 'white', darkText: false, tag: 'Saludable', title1: '30% OFF', title2: 'EN ENSALADAS', sub: 'Empieza la semana con energía natural' },
];

const BANNERS = [BANNERS_RAW[BANNERS_RAW.length - 1], ...BANNERS_RAW, BANNERS_RAW[0]];
const REAL_COUNT = BANNERS_RAW.length;

export default function Home() {
  const [index, setIndex] = useState(1);
  const [animated, setAnimated] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(1);

  const { addToCart, cartCount, setIsCartOpen } = useCart();
  
  const [marketplaceProducts, setMarketplaceProducts] = useState(MOCK_PRODUCTS);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('boga_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleFavorite = (product: any) => {
    const isFav = favorites.some(f => String(f.id) === String(product.id));
    let updated;
    if (isFav) {
      updated = favorites.filter(f => String(f.id) !== String(product.id));
    } else {
      updated = [...favorites, product];
    }
    setFavorites(updated);
    localStorage.setItem('boga_favorites', JSON.stringify(updated));
  };

  const goTo = useCallback((i: number, animate = true) => {
    indexRef.current = i;
    setAnimated(animate);
    setIndex(i);
  }, []);

  useEffect(() => {
    const fetchRealData = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (data && !error && data.length > 0) {
        
        // Build real products array
        const formattedProducts = data.map((p: any) => {
          const storeDef = stores[p.store as keyof typeof stores];
          return {
            id: p.id,
            title: p.name,
            price: `S/ ${p.price.toFixed(2)}`,
            rating: "4.9",
            reviews: "(+50)",
            store: storeDef?.name || p.store,
            slug: p.store,
            image: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
            logo: storeDef?.heroImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
          }
        });

        // Mezclar aleatoriamente los productos para que salgan variados en el home
        const shuffledProducts = [...formattedProducts].sort(() => Math.random() - 0.5);
        setMarketplaceProducts(shuffledProducts);
      }
    };
    fetchRealData();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const next = indexRef.current + 1;
      indexRef.current = next;
      setAnimated(true);
      setIndex(next);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (index === 0) {
      const t = setTimeout(() => goTo(REAL_COUNT, false), 460);
      return () => clearTimeout(t);
    }
    if (index === REAL_COUNT + 1) {
      const t = setTimeout(() => goTo(1, false), 460);
      return () => clearTimeout(t);
    }
  }, [index, goTo]);

  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = animated ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
    trackRef.current.style.transform = `translateX(calc(7.5vw - ${index} * (85vw + 12px)))`;
  }, [index, animated]);

  return (
    <>
      <AppHeader 
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="flex flex-col gap-6 mt-sm pb-8">
        <section className="overflow-hidden">
          <div ref={trackRef} className="flex gap-3 will-change-transform">
            {BANNERS.map((b, idx) => (
              <div
                key={`${b.id}-${idx}`}
                className="relative h-[160px] rounded-[32px] overflow-hidden shadow-lg shrink-0"
                style={{ backgroundColor: b.bg, width: '85vw', minWidth: '85vw' }}
              >
                {b.tag && (
                  <span className="absolute top-5 left-7 z-20 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-bold text-white/90 uppercase tracking-widest">
                    {b.tag}
                  </span>
                )}
                <div className="absolute inset-0 p-7 flex flex-col justify-center z-20" style={{ paddingTop: b.tag ? '44px' : '28px' }}>
                  <h2 className="text-[26px] font-extrabold leading-tight tracking-tight" style={{ color: b.textColor }}>
                    {b.title1}<br />{b.title2}
                  </h2>
                  <p className="text-[11px] font-medium mt-1 opacity-75" style={{ color: b.textColor }}>{b.sub}</p>
                </div>
                <div className="absolute right-0 top-0 h-full w-[55%] z-0">
                  <div className="absolute inset-y-0 left-0 w-14 z-10" style={{ background: `linear-gradient(to right, ${b.bg}, transparent)` }} />
                  <img alt="" className="w-full h-full object-cover" src={b.img} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-1.5 mt-3">
            {BANNERS_RAW.map((_, i) => {
              const realIndex = ((index - 1) % REAL_COUNT + REAL_COUNT) % REAL_COUNT;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i + 1)}
                  className={`rounded-full transition-all duration-300 ${realIndex === i ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-primary/25'}`}
                />
              );
            })}
          </div>
        </section>

        <section className="px-gutter">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'prm', name: 'Promos',    icon: 'loyalty',          fill: true,  primary: true  },
              { id: 'com', name: 'Comida',    icon: 'restaurant',       fill: true,  primary: false },
              { id: 'beb', name: 'Bebidas',   icon: 'local_bar',        fill: true,  primary: false },
              { id: 'mer', name: 'Mercado',   icon: 'storefront',       fill: true,  primary: false },
              { id: 'sal', name: 'Salud',     icon: 'medical_services', fill: true,  primary: false },
              { id: 'mod', name: 'Moda',      icon: 'apparel',          fill: true,  primary: false },
              { id: 'ser', name: 'Servicios', icon: 'handyman',         fill: true,  primary: false },
              { id: 'mas', name: 'Mascotas',  icon: 'pets',             fill: true,  primary: false },
            ].map((cat) => (
              <Link
                key={cat.id}
                href="/explore"
                className={`flex flex-col items-center justify-center gap-1.5 px-1 py-3 rounded-xl border transition-transform active:scale-90 ${cat.primary ? 'bg-primary-container/10 border-primary-container/30' : 'bg-surface-container-highest border-[#3E2723]/10'}`}
              >
                <span className="material-symbols-outlined text-[22px] text-primary" style={{ fontVariationSettings: cat.fill ? "'FILL' 1" : "" }}>{cat.icon}</span>
                <span className="font-bold text-[10px] text-[#3E2723] text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>



        <section className="flex flex-col gap-3 px-gutter">
          <div className="flex justify-between items-center">
            <h3 className="font-h3 text-[20px] font-black text-[#3E2723]">Recomendados</h3>
            <Link href="/promotions" className="text-[12px] font-bold text-primary-container">Ver todo</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {marketplaceProducts.map((prod, idx) => {
              const isFeatured = (idx + 1) % 5 === 0;
              const isFav = favorites.some(f => String(f.id) === String(prod.id));
              if (isFeatured) {
                return (
                  <Link key={prod.id} href={`/${prod.slug}`} className="col-span-2 relative bg-white rounded-2xl shadow-md overflow-hidden flex group min-h-[150px] border border-black/5">
                    <div className="w-[42%] relative overflow-hidden shrink-0">
                      <img alt={prod.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={prod.image} />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/80" />
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(prod);
                        }}
                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform z-10"
                      >
                        <span 
                          className={`material-symbols-outlined text-[15px] ${isFav ? 'text-red-500 font-bold' : 'text-[#3E2723]'}`}
                          style={isFav ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                          favorite
                        </span>
                      </button>
                    </div>
                    <div className="w-[58%] p-4 flex flex-col justify-between relative z-10">
                      <div className="absolute top-3 right-3 bg-[#2E7D32] text-white text-[9px] font-black px-2 py-[3px] rounded-lg flex items-center gap-0.5 uppercase shadow">
                        <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Destacado
                      </div>
                      <div className="flex gap-2 items-center mt-1">
                        <img alt={prod.store} className="w-5 h-5 rounded-full object-cover border border-[#3E2723]/10" src={prod.logo} />
                        <span className="text-[11px] font-bold text-[#745853]">{prod.store}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[16px] leading-tight text-[#3E2723] mt-2 line-clamp-2">{prod.title}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[13px] text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-[11px] text-[#745853]">{prod.rating} <span className="opacity-60">{prod.reviews}</span></span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-black text-[18px] text-[#2E7D32]">{prod.price}</span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            addToCart(prod);
                          }}
                          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 shadow transition-transform"
                        >
                          <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              }
              return (
                <Link key={prod.id} href={`/${prod.slug}`} className="col-span-1 bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden group">
                  <div className="relative aspect-square overflow-hidden">
                    <img alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={prod.image} />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(prod);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform z-10"
                    >
                      <span 
                        className={`material-symbols-outlined text-[15px] ${isFav ? 'text-red-500' : 'text-[#3E2723]'}`}
                        style={isFav ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        favorite
                      </span>
                    </button>
                    <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm shadow-sm rounded-lg px-1.5 py-1 flex items-center gap-1 border border-black/5">
                      <img alt={prod.store} className="w-3.5 h-3.5 rounded-full object-cover" src={prod.logo} />
                      <span className="text-[9px] font-bold text-[#3E2723] uppercase truncate max-w-[70px]">{prod.store}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-[13px] leading-tight text-[#3E2723] line-clamp-2">{prod.title}</h4>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[12px] text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-[11px] text-[#745853]">{prod.rating} <span className="opacity-60">{prod.reviews}</span></span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-black text-[14px] text-[#2E7D32]">{prod.price}</span>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          addToCart(prod);
                        }}
                        className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="w-full py-4 flex flex-col justify-center items-center gap-2 opacity-50">
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-[11px] font-bold text-[#3E2723]">Cargando más recomendados...</span>
          </div>
        </section>
      </main>
    </>
  );
}
