"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

import { supabase } from '@/lib/supabase';

const BANNERS_RAW = [
  { id: 'deliv',  img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200", tag: null,            title1: 'DELIVERY', title2: 'GRATIS',        sub: 'En tu primera orden' },
  { id: 'burger', img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200", tag: 'Promo Exclusiva', title1: '2x1 EN',    title2: 'HAMBURGUESAS',  sub: 'Solo por hoy en locales seleccionados' },
  { id: 'salad',  img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200", tag: 'Saludable',      title1: '30% OFF',   title2: 'EN ENSALADAS',  sub: 'Empieza la semana con energía natural' },
];


export default function Home() {
  // Banner slider
  const sliderRef = useRef<HTMLDivElement>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerIdxRef = useRef(0);
  const bannerCount = BANNERS_RAW.length;

  const [activeCategory, setActiveCategory] = useState('Todas');
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [activeSort, setActiveSort] = useState('Populares');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);

  const [storeData, setStoreData] = useState<{ name: string; slug: string; category: string; time: string; delivery: string; logo: string; products: { name: string; price: string; img: string }[] }[]>([]);

  useEffect(() => {
    const fetchRealData = async () => {
      // 1. Fetch dynamic stores
      const { data: dbStoresData } = await supabase.from('stores').select('*');
      
      const allStores: Record<string, any> = {};
      if (dbStoresData) {
        dbStoresData.forEach((s: any) => {
          allStores[s.slug] = {
            slug: s.slug,
            name: s.name,
            tagline: s.tagline || '',
            marketplaceCategory: s.marketplace_category || 'General',
            template: s.template || 'default',
            heroImage: s.hero_image || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
            heroAlt: s.hero_alt || 'store image',
            theme: s.theme || {},
            categories: s.categories || []
          };
        });
      }

      // Re-initialize storeData using allStores
      setStoreData(
        Object.values(allStores).map((s: any) => ({
          name: s.name,
          slug: s.slug,
          category: s.tagline || 'TIENDA OFICIAL',
          time: '20-40 min',
          delivery: 'S/ 5.00',
          logo: s.heroImage,
          products: [
            { name: 'Producto Destacado', price: 'S/ 25.00', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
            { name: 'Oferta Especial', price: 'S/ 15.00', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
          ]
        }))
      );

      // 2. Fetch products
      const { data, error } = await supabase.from('products').select('*');
      if (data && !error && data.length > 0) {
        const formattedProducts = data.map((p: any) => {
          const storeDef = allStores[p.store];
          return {
            id: p.id || p.name,
            name: p.name,
            title: p.name,
            price: `S/ ${p.price.toFixed(2)}`,
            slug: p.store,
            image: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
            store: storeDef?.name || p.store,
            logo: storeDef?.heroImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100',
            rating: (4 + Math.random()).toFixed(1),
            reviews: `(${Math.floor(Math.random() * 200) + 10}+)`
          }
        });

        setStoreData(prev => prev.map(s => {
          const sProducts = formattedProducts.filter(p => p.slug === s.slug).slice(0, 5);
          return {
            ...s,
            products: sProducts.length > 0 
              ? sProducts.map(p => ({ name: p.title, price: p.price, img: p.image })) 
              : s.products
          };
        }));

        const newSectionsProducts: Record<string, any[]> = {
          'Combos & Promos': [],
          'Comida': [],
          'Bebidas': [],
          'Mercado': [],
          'Salud': [],
          'Moda': [],
          'Servicios': []
        };

        data.forEach((p: any) => {
          const storeDef = allStores[p.store];
          let macroCat = 'Mercado';

          const storeCategory = storeDef?.marketplaceCategory?.toLowerCase() || '';
          const productCategory = p.category?.toLowerCase() || '';

          if (storeCategory.includes('moda') || productCategory.includes('ropa') || productCategory.includes('vestido') || storeCategory.includes('boutique')) {
            macroCat = 'Moda';
          } else if (storeCategory.includes('salud') || productCategory.includes('salud') || storeCategory.includes('belleza')) {
            macroCat = 'Salud';
          } else if (storeCategory.includes('restaurante') || productCategory.includes('comida') || productCategory.includes('cocina')) {
            macroCat = 'Comida';
          } else if (productCategory.includes('bebida') || productCategory.includes('bar') || productCategory.includes('café')) {
            macroCat = 'Bebidas';
          } else if (storeCategory.includes('mercado') || productCategory.includes('fruta') || productCategory.includes('carne')) {
            macroCat = 'Mercado';
          } else if (storeCategory.includes('servicio')) {
            macroCat = 'Servicios';
          }

          if (newSectionsProducts[macroCat]) {
            newSectionsProducts[macroCat].push({
              name: p.name,
              price: `S/ ${p.price.toFixed(2)}`,
              badge: 'Nuevo',
              img: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80'
            });
          }
        });

        setSections(prev => {
          const updated = [...prev];
          Object.keys(newSectionsProducts).forEach(catId => {
            const products = newSectionsProducts[catId];
            if (products.length > 0) {
              const existingIdx = updated.findIndex(s => s.id === catId);
              if (existingIdx >= 0) {
                updated[existingIdx].products = products;
              } else {
                let title = catId;
                if (catId === 'Moda') title = 'Moda y Estilo 👗';
                if (catId === 'Salud') title = 'Salud y Bienestar 💊';
                if (catId === 'Servicios') title = 'Servicios 🛠️';
                
                updated.push({
                  id: catId,
                  title: title,
                  products: products
                });
              }
            }
          });
          return updated;
        });
      }
    };
    fetchRealData();
  }, []);

  // Scroll-based banner navigation
  const scrollToBanner = useCallback((idx: number, smooth = true) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const w = slider.clientWidth;
    slider.scrollTo({ left: idx * w, behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior });
    bannerIdxRef.current = idx;
    setBannerIdx(idx);
  }, []);

  // Auto-advance every 4s
  useEffect(() => {
    const id = setInterval(() => {
      const next = (bannerIdxRef.current + 1) % bannerCount;
      scrollToBanner(next);
    }, 4000);
    return () => clearInterval(id);
  }, [scrollToBanner, bannerCount]);

  // Swipe support
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd   = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        const next = Math.max(0, Math.min(bannerCount - 1, bannerIdxRef.current + (diff > 0 ? 1 : -1)));
        scrollToBanner(next);
      }
    };
    slider.addEventListener('touchstart', onTouchStart, { passive: true });
    slider.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      slider.removeEventListener('touchstart', onTouchStart);
      slider.removeEventListener('touchend',   onTouchEnd);
    };
  }, [scrollToBanner, bannerCount]);

  // Track scroll position to update active dot
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const w = slider.clientWidth;
        if (w === 0) { ticking = false; return; }
        const idx = Math.round(slider.scrollLeft / w);
        if (idx !== bannerIdxRef.current) {
          bannerIdxRef.current = idx;
          setBannerIdx(idx);
        }
        ticking = false;
      });
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    return () => slider.removeEventListener('scroll', onScroll);
  }, []);




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

  useEffect(() => {
    const fetchRealData = async () => {
      // 1. Fetch dynamic stores
      const { data: dbStoresData } = await supabase.from('stores').select('*');
      const allStores: Record<string, any> = {};
      if (dbStoresData) {
        dbStoresData.forEach((s: any) => {
          allStores[s.slug] = {
            slug: s.slug,
            name: s.name,
            tagline: s.tagline || '',
            marketplaceCategory: s.marketplace_category || 'General',
            template: s.template || 'default',
            heroImage: s.hero_image || 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
            heroAlt: s.hero_alt || 'store image',
            theme: s.theme || {},
            categories: s.categories || []
          };
        });
      }

      // 2. Fetch products
      const { data, error } = await supabase.from('products').select('*');
      if (data && !error && data.length > 0) {
        
        // Build real products array using allStores
        const formattedProducts = data.map((p: any) => {
          const storeDef = allStores[p.store];
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


  const handleAddToCartWithAnim = (product: any) => {
    addToCart(product);
    
    // Trigger micro-animation
    setAddedItems(prev => ({ ...prev, [product.name]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product.name]: false }));
    }, 1000);
  };

  const macroCategories = [
    { id: 'Todas',           name: 'Todas',           icon: 'grid_view'        },
    { id: 'Combos & Promos', name: 'Promos',          icon: 'loyalty'          },
    { id: 'Comida',          name: 'Comida',          icon: 'restaurant'       },
    { id: 'Bebidas',         name: 'Bebidas',         icon: 'local_bar'        },
    { id: 'Mercado',         name: 'Mercado',         icon: 'storefront'       },
    { id: 'Salud',           name: 'Salud',           icon: 'medical_services' },
    { id: 'Moda',            name: 'Moda',            icon: 'apparel'          },
    { id: 'Servicios',       name: 'Servicios',       icon: 'handyman'         },
  ];

  const subCategories: Record<string, {name: string, icon: string}[]> = {
    'Combos & Promos': [
      { name: 'Combos Comida',  icon: 'lunch_dining'    },
      { name: 'Packs Bebidas',  icon: 'celebration'     },
      { name: 'Menú Semanal',   icon: 'calendar_month'  },
      { name: 'Ofertas Flash',  icon: 'bolt'            },
    ],
    'Comida': [
      { name: 'Menú del Día',   icon: 'set_meal'        },
      { name: 'Criollo',        icon: 'soup_kitchen'    },
      { name: 'Hamburguesas',   icon: 'lunch_dining'    },
      { name: 'Pizzas',         icon: 'local_pizza'     },
      { name: 'Sándwiches',     icon: 'bakery_dining'   },
      { name: 'Desayunos',      icon: 'breakfast_dining'},
      { name: 'Ensaladas',      icon: 'eco'             },
      { name: 'Postres',        icon: 'cake'            },
    ],
    'Bebidas': [
      { name: 'Piqueos & Snacks', icon: 'tapas'            },
      { name: 'Cervezas',          icon: 'sports_bar'      },
      { name: 'Licores',           icon: 'liquor'          },
      { name: 'Jugos & Smoothies', icon: 'blender'         },
      { name: 'Café & Té',         icon: 'coffee'          },
      { name: 'Gaseosas',          icon: 'water_full'      },
      { name: 'Cócteles',          icon: 'local_bar'       },
    ],
    'Mercado': [
      { name: 'Carnes',         icon: 'kebab_dining'    },
      { name: 'Frutas',         icon: 'nutrition'       },
      { name: 'Verduras',       icon: 'eco'             },
      { name: 'Lácteos',        icon: 'egg'             },
      { name: 'Panadería',      icon: 'bakery_dining'   },
    ],
    'Salud': [
      { name: 'Medicamentos',       icon: 'medication'      },
      { name: 'Cuidado Personal',   icon: 'face_6'          },
      { name: 'Suplementos',        icon: 'pill'            },
    ],
    'Moda': [
      { name: 'Relojes',        icon: 'watch'           },
      { name: 'Calzado',        icon: 'steps'           },
      { name: 'Camisas',        icon: 'checkroom'       },
      { name: 'Accesorios',     icon: 'shopping_bag'    },
    ],
    'Servicios': [
      { name: 'Limpieza',       icon: 'cleaning_services'},
      { name: 'Reparación',     icon: 'build'           },
      { name: 'Delivery',       icon: 'delivery_dining' },
    ],
  };

  const currentSubCategories = activeCategory === 'Todas' 
    ? Object.values(subCategories).flat() 
    : subCategories[activeCategory] || [];

  const [sections, setSections] = useState([
    {
      id: 'Combos & Promos',
      title: 'Promos & Combos 🏷️',
      link: '/promotions',
      products: [
        { name: 'Classic Burger', price: 'S/ 18.50', original: 'S/ 30.00', badge: '-40%', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { name: 'Pizza Pepperoni', price: 'S/ 24.00', original: 'S/ 32.00', badge: '-25%', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
        { name: 'Green Salad',    price: 'S/ 12.00', original: 'S/ 24.00', badge: '-50%', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
        { name: 'Combo Familiar', price: 'S/ 55.00', original: 'S/ 80.00', badge: 'Popular', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
      ]
    },
    {
      id: 'Comida',
      title: 'Comida Destacada 🍱',
      products: [
        { name: 'Ají de Gallina', price: 'S/ 22.00', badge: 'Popular', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
        { name: 'Lomo Saltado',  price: 'S/ 28.50', badge: 'Top 1',  img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { name: 'Menú Criollo',  price: 'S/ 15.00', badge: 'Económico', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
        { name: 'Arroz con Pollo',price: 'S/ 18.00', badge: 'Clásico', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
        { name: 'Tallarines Verdes',price: 'S/ 20.00', badge: 'Nuevo', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { name: 'Ceviche Mixto',  price: 'S/ 35.00', badge: 'Fresco', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
      ]
    },
    {
      id: 'Bebidas',
      title: 'Bebidas & Piqueos 🥤',
      products: [
        { name: 'Cerveza Pilsen', price: 'S/ 7.50', badge: 'Helada', img: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400' },
        { name: 'Piqueo Snack',  price: 'S/ 5.00', badge: 'Nuevo',  img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400' },
        { name: 'Jugos Surtido', price: 'S/ 10.00', badge: 'Natural', img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400' },
        { name: 'Vino Tinto',    price: 'S/ 45.00', badge: 'Premium', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400' },
        { name: 'Whisky Black',  price: 'S/ 120.00', badge: 'Oferta', img: 'https://images.unsplash.com/photo-1527281473222-793895bf44b9?w=400' },
        { name: 'Agua Mineral',  price: 'S/ 2.50',  badge: 'Fresco', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
      ]
    },
    {
      id: 'Mercado',
      title: 'Mercado Fresco 🥬',
      products: [
        { name: 'Pack de Carnes', price: 'S/ 45.00', badge: 'Parrilla', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
        { name: 'Frutas Mix',     price: 'S/ 12.00', badge: 'Fresco',   img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400' },
        { name: 'Pan de Masa',    price: 'S/ 3.50',  badge: 'Caliente', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
        { name: 'Leche Pack 6',  price: 'S/ 22.00', badge: 'Ahorro',  img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { name: 'Huevos x 30',   price: 'S/ 18.00', badge: 'Fresco',  img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
        { name: 'Arroz 5kg',     price: 'S/ 16.50', badge: 'Esencial', img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
      ]
    }
  ]);

  return (
    <>
      <AppHeader 
        showSearch={true} 
        placeholder="Busca lo que necesites..." 
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="max-w-[1440px] mx-auto w-full flex flex-col gap-4 lg:gap-6 mt-4 lg:mt-5 pb-12">
        {/* Banners Section */}
        <section className="px-container-margin lg:px-6">
          {/* Scroll-snap slider — clientWidth based, no clone tricks */}
          <div
            ref={sliderRef}
            className="flex overflow-x-auto hide-scrollbar rounded-2xl"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {BANNERS_RAW.map((b, idx) => (
              <div
                key={b.id}
                className="relative aspect-[21/9] lg:aspect-[21/5.5] overflow-hidden shadow-lg shrink-0 group"
                style={{ scrollSnapAlign: 'start', minWidth: '85vw', flex: isDesktop ? '0 0 100%' : '0 0 85vw' }}
              >
                <img alt="" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src={b.img} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-6 lg:px-16 z-10">
                  {b.tag && (
                    <span className="inline-block px-3 py-1 bg-primary text-white font-label-md text-[10px] rounded-lg mb-1.5 uppercase tracking-wider w-fit">
                      {b.tag}
                    </span>
                  )}
                  <h2 className="font-headline-lg lg:text-[40px] lg:leading-none lg:font-extrabold text-white leading-tight">
                    {b.title1}<br />{b.title2}
                  </h2>
                  <p className="text-white/80 font-body-md lg:text-base mt-1 lg:mt-3 lg:mb-3 max-w-md">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-1.5 mt-1.5">
            {BANNERS_RAW.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToBanner(i)}
                className={`rounded-full transition-all duration-300 ${
                  bannerIdx === i ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-surface-container-highest'
                }`}
              />
            ))}
          </div>
        </section>
        
        {/* Categories Section Group */}
        <div className="flex flex-col gap-4 lg:gap-5 px-container-margin lg:px-6">
          {/* Adaptive Macro-Categories Selector */}
          <section className="flex flex-col gap-2 lg:gap-3 transition-all duration-500">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-headline-lg text-on-surface">Explorar Categorías</h2>
            </div>
            <div className={`
              transition-all duration-500 ease-in-out
              ${activeCategory === 'Todas' 
                ? 'grid grid-cols-4 lg:grid-cols-8 gap-2 lg:gap-gutter' 
                : 'flex gap-3 overflow-x-auto hide-scrollbar pb-1.5'
              }`}
              style={{ scrollbarWidth: 'none' }}
            >
              {macroCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button 
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowAllSubCategories(false);
                    }}
                    className={`
                      flex transition-all duration-300 active:scale-95 shrink-0 group
                      ${activeCategory === 'Todas' 
                        ? 'flex-col items-center justify-center gap-0.5 py-1.5 px-1 lg:py-2 lg:px-1.5 rounded-xl shadow-[0px_8px_12px_rgba(0,0,0,0.04)] hover:bg-primary-container' 
                        : 'flex-row items-center gap-1.5 px-4 py-1.5 rounded-full shadow-sm'
                      }
                      ${isActive 
                        ? 'bg-primary text-white border-primary shadow-md' 
                        : 'bg-white border border-surface-container-highest text-secondary'
                      }
                    `}
                  >
                    <div className={`
                      transition-colors rounded-full flex items-center justify-center
                      ${activeCategory === 'Todas' 
                        ? 'w-8 h-8 lg:w-9 lg:h-9' 
                        : 'w-auto h-auto'
                      }
                      ${activeCategory === 'Todas'
                        ? isActive ? 'bg-white/20' : 'bg-surface-container group-hover:bg-white'
                        : ''
                      }
                    `}>
                      <span className={`material-symbols-outlined shrink-0 transition-all ${
                        activeCategory === 'Todas' ? 'text-lg lg:text-xl' : 'text-[18px]'
                      } ${isActive ? 'text-white' : 'text-primary'}`}>
                        {cat.icon}
                      </span>
                    </div>
                    <span className={`font-label-md transition-all ${
                      activeCategory === 'Todas' ? 'text-[9px] lg:text-[10px] text-center leading-tight mt-0.5' : 'text-[11px] whitespace-nowrap'
                    } ${isActive ? 'text-white' : 'text-secondary group-hover:text-on-primary-container'}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Specific Sub-Categories (Filtered) */}
          <section className="hide-scrollbar overflow-x-auto flex gap-4 items-start w-full">
            <div 
              className={`py-1 ${showAllSubCategories ? 'flex flex-wrap gap-x-3 gap-y-2.5 justify-start w-full' : 'flex gap-3.5 items-center'}`} 
              style={{ scrollbarWidth: 'none' }}
            >
              <div 
                onClick={() => setShowAllSubCategories(!showAllSubCategories)}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer active:scale-90 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {showAllSubCategories ? 'unfold_less' : 'unfold_more'}
                  </span>
                </div>
                <span className="text-primary font-label-md text-[10px] text-center leading-tight mt-0.5">
                  {showAllSubCategories ? 'Ver menos' : 'Ver todo'}
                </span>
              </div>

              {currentSubCategories.map((sub, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer active:scale-90 transition-transform">
                  <div className="w-14 h-14 rounded-full bg-white border border-surface-container-highest flex items-center justify-center text-on-surface shadow-sm group-hover:border-primary group-hover:shadow-md transition-all">
                    <span className="material-symbols-outlined text-[22px]">
                      {sub.icon}
                    </span>
                  </div>
                  <span className="text-secondary font-label-md text-[10px] text-center leading-tight mt-0.5">{sub.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Discovery Mode (Todas) or Listing Mode (Specific Category) */}
        {activeCategory === 'Todas' ? (
          <div className="flex flex-col gap-6 lg:gap-8 px-container-margin lg:px-6">
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-end mb-1">
                <h3 className="font-headline-lg text-on-surface">Recomendados para ti</h3>
                <Link href="/promotions" className="text-primary font-label-md text-sm">Ver todo</Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-stack-lg">
                {marketplaceProducts.map((prod, idx) => {
                  const isFeaturedStore = (idx + 1) % 10 === 5;
                  const isFeaturedProduct = (idx + 1) % 10 === 0;

                  if (isFeaturedStore) {
                    const storeIdx = Math.floor(idx / 10) % storeData.length;
                    const featuredStore = storeData[storeIdx];
                    if (featuredStore) {
                      return (
                        <Link href={`/${featuredStore.slug}`} key={`store-${idx}`} className="col-span-2 bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col gap-3 group">
                          <div className="flex gap-3">
                            {featuredStore.products?.slice(0, 3).map((sp, i) => (
                              <div key={i} className="flex-1 flex flex-col gap-1">
                                <div className="aspect-square rounded-xl overflow-hidden relative bg-surface-container-low">
                                  <img src={sp.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={sp.name} />
                                </div>
                                <h4 className="text-[10px] font-label-md text-secondary uppercase leading-tight line-clamp-1 mt-1">{sp.name}</h4>
                                <span className="font-price-lg text-primary text-xs">{sp.price}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3 items-center border-t border-surface-container pt-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-container-highest">
                              <img src={featuredStore.logo} className="w-full h-full object-cover" alt={featuredStore.name} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-headline-sm text-sm text-on-surface leading-tight">{featuredStore.name}</span>
                              <span className="text-[9px] text-secondary font-label-md uppercase tracking-wider truncate mt-0.5">{featuredStore.category}</span>
                              <div className="flex gap-1.5 mt-1.5">
                                <span className="bg-primary-fixed text-primary text-[9px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-primary/10">
                                  <span className="material-symbols-outlined text-[10px]">schedule</span>{featuredStore.time}
                                </span>
                                <span className="bg-surface-container-low text-secondary text-[9px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-surface-container-highest">
                                  <span className="material-symbols-outlined text-[10px]">two_wheeler</span>{featuredStore.delivery}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    }
                  }

                  if (isFeaturedProduct) {
                    const isFav = favorites.some(f => String(f.id) === String(prod.id));
                    return (
                      <Link key={prod.id} href={`/${prod.slug}`} className="col-span-2 relative bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] overflow-hidden flex group min-h-[150px] border border-surface-container-highest">
                        <div className="w-[42%] relative overflow-hidden shrink-0 bg-surface-container-low">
                          <img alt={prod.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={prod.image} />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/80" />
                        </div>
                        <div className="w-[58%] p-4 flex flex-col justify-between relative z-10">
                          <div className="absolute top-3 right-3 bg-[#864f00] text-white text-[9px] font-bold px-2 py-[3px] rounded-lg flex items-center gap-0.5 uppercase shadow-sm">
                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> Destacado
                          </div>
                          <div className="flex gap-2 items-center mt-1">
                            <img alt={prod.store} className="w-5 h-5 rounded-full object-cover border border-surface-container-highest" src={prod.logo} />
                            <span className="text-[11px] font-label-md text-secondary">{prod.store}</span>
                          </div>
                          <div>
                            <h4 className="font-headline-sm text-sm text-on-surface mt-2 line-clamp-1">{prod.title}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              <span className="text-[11px] font-label-md text-secondary">{prod.rating} <span className="opacity-60">{prod.reviews}</span></span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-price-lg text-primary text-base">{prod.price}</span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleFavorite(prod);
                                }}
                                className="w-8 h-8 bg-white border border-surface-container-highest rounded-full flex items-center justify-center text-secondary shadow-sm active:scale-90 transition-transform"
                              >
                                <span className="material-symbols-outlined text-[18px]" style={isFav ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleAddToCartWithAnim(prod);
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform ${
                                  addedItems[prod.name] ? 'bg-[#25D366] text-white scale-110' : 'bg-primary text-white active:scale-90'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">{addedItems[prod.name] ? 'check' : 'add'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  }

                  const isFav = favorites.some(f => String(f.id) === String(prod.id));
                  return (
                    <Link key={prod.id} href={`/${prod.slug}`} className="col-span-1 bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest overflow-hidden group flex flex-col">
                      <div className="relative aspect-square overflow-hidden bg-surface-container-low p-4">
                        <img alt={prod.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" src={prod.image} />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFavorite(prod);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-secondary shadow-sm active:scale-90 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[18px] text-secondary" style={isFav ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                        </button>
                        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm shadow-sm rounded-lg px-2 py-1 flex items-center gap-1 border border-surface-container-highest">
                          <img alt={prod.store} className="w-3.5 h-3.5 rounded-full object-cover" src={prod.logo} />
                          <span className="text-[9px] font-label-md text-on-surface uppercase truncate max-w-[65px]">{prod.store}</span>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col flex-1 justify-between">
                        <div>
                          <span className="text-[10px] font-label-md text-secondary uppercase tracking-tighter mb-1 block">{prod.store}</span>
                          <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{prod.title}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-tertiary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="font-label-md text-[11px] text-on-surface">{prod.rating} <span className="opacity-60">{prod.reviews}</span></span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-auto">
                          <span className="font-price-lg text-primary text-base">{prod.price}</span>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddToCartWithAnim(prod);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform ${
                              addedItems[prod.name] ? 'bg-[#25D366] text-white scale-110' : 'bg-primary text-white active:scale-90'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">{addedItems[prod.name] ? 'check' : 'add'}</span>
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
                <span className="text-[11px] font-label-md text-secondary">Cargando más recomendados...</span>
              </div>
            </section>
          </div>
        ) : (
          <section className="flex flex-col gap-6 px-container-margin lg:px-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-headline-md text-on-surface">
                  {sections.find(s => s.id === activeCategory)?.title || activeCategory}
                </h2>
                <p className="text-secondary font-body-md text-xs">Mostrando todos los productos disponibles</p>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
                <button className="flex items-center justify-center w-8 h-8 rounded-full border border-surface-container-highest bg-white shrink-0 text-on-surface shadow-sm hover:shadow-md transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </button>
                {['Populares', 'Menor Precio', 'Nuevos', 'A-Z'].map(sort => (
                  <button 
                    key={sort}
                    onClick={() => setActiveSort(sort)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm ${
                      activeSort === sort 
                        ? 'bg-primary text-white border border-primary shadow-md' 
                        : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
                    }`}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-stack-lg">
              {(sections.find(s => s.id === activeCategory)?.products || []).map((p, idx) => {
                const isFav = favorites.some(f => String(f.id) === String((p as any).id || p.name));
                return (
                  <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-surface-container-low p-4">
                      <img className="w-full h-full object-contain" src={p.img} alt={p.name} />
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite({ id: (p as any).id || p.name, name: p.name, price: p.price, image: p.img });
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-secondary shadow-sm active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px] text-secondary" style={isFav ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span>
                      </button>
                      <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{p.badge}</div>
                    </div>
                    <div className="p-3 flex flex-col flex-1 justify-between">
                      <div>
                        <h4 className="font-headline-sm text-sm text-on-surface line-clamp-1">{p.name}</h4>
                        {(p as any).original && <span className="text-secondary text-[11px] line-through">{(p as any).original}</span>}
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-auto">
                        <span className="font-price-lg text-primary text-base">{p.price}</span>
                        <button 
                          onClick={() => handleAddToCartWithAnim(p)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform ${
                            addedItems[p.name] ? 'bg-[#25D366] text-white scale-110' : 'bg-primary text-white active:scale-90'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {addedItems[p.name] ? 'check' : 'add'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
