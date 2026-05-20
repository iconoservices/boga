"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { stores } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';

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
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);
  
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [activeSort, setActiveSort] = useState('Populares');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);

  const [storeData, setStoreData] = useState(() => 
    Object.values(stores).map(s => ({
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

  useEffect(() => {
    const fetchRealData = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (data && !error && data.length > 0) {
        const formattedProducts = data.map((p: any) => {
          const storeDef = stores[p.store as keyof typeof stores];
          return {
            title: p.name,
            price: `S/ ${p.price.toFixed(2)}`,
            slug: p.store,
            image: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
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
          const storeDef = stores[p.store as keyof typeof stores];
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

  const goTo = useCallback((i: number, animate = true) => {
    indexRef.current = i;
    setAnimated(animate);
    setIndex(i);
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

      <main className="flex flex-col gap-4 mt-2 pb-8">
        {/* Banners Section */}
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
        
        {/* Adaptive Macro-Categories Selector */}
        <section className="flex flex-col gap-2 transition-all duration-500">
          
          <div className={`
            transition-all duration-500 ease-in-out
            ${activeCategory === 'Todas' 
              ? 'grid grid-cols-4 gap-2 px-gutter' 
              : 'flex gap-3 overflow-x-auto hide-scrollbar px-gutter pb-2'
            }`}
            style={{ scrollbarWidth: 'none' }}
          >
            {macroCategories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setShowAllSubCategories(false);
                }}
                className={`
                  flex transition-all duration-300 active:scale-95 shrink-0
                  ${activeCategory === 'Todas' 
                    ? 'flex-col items-center justify-center gap-1 w-full px-1 py-2 rounded-[14px] border shadow-sm' 
                    : 'flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#3E2723]/10'
                  }
                  ${activeCategory === cat.id 
                    ? 'bg-primary text-white border-primary shadow-md' 
                    : 'bg-surface-container-lowest text-[#3E2723]'
                  }
                `}
              >
                <span className={`material-symbols-outlined shrink-0 transition-all ${
                  activeCategory === 'Todas' ? 'text-[18px]' : 'text-[16px]'
                } ${activeCategory === cat.id ? 'text-white' : 'text-primary'}`}>
                  {cat.icon}
                </span>
                <span className={`font-bold transition-all ${
                  activeCategory === 'Todas' ? 'text-[9px] text-center leading-tight' : 'text-[11px] whitespace-nowrap'
                } ${activeCategory === cat.id ? 'text-white' : 'text-[#3E2723]'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Specific Sub-Categories (Filtered) */}
        <section className="flex flex-col gap-2">
          <div 
            className={`px-gutter py-1 ${showAllSubCategories ? 'flex flex-wrap gap-x-4 gap-y-3 justify-start' : 'px-gutter overflow-x-auto hide-scrollbar flex gap-4 items-center'}`} 
            style={{ scrollbarWidth: 'none' }}
          >
            <div 
              onClick={() => setShowAllSubCategories(!showAllSubCategories)}
              className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF0E6] shadow-sm flex items-center justify-center border border-[#E2725B]/20 group-hover:border-primary">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {showAllSubCategories ? 'unfold_less' : 'unfold_more'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-primary text-center w-14 leading-tight">
                {showAllSubCategories ? 'Ver menos' : 'Ver todo'}
              </span>
            </div>

            {currentSubCategories.map((sub, index) => (
              <div key={index} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer active:scale-90 transition-transform">
                <div className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center border border-[#E2725B]/10 group-hover:border-primary">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {sub.icon}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-on-surface text-center w-14 leading-tight">{sub.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Discovery Mode (Todas) or Listing Mode (Specific Category) */}
        {activeCategory === 'Todas' ? (
          <div className="flex flex-col gap-6">
            

            {sections.map((section) => (
              <section key={section.id}>
                <div className="flex justify-between items-center mb-3 px-gutter">
                  <h2 className="font-h2 text-[18px] text-[#3E2723] font-black">{section.title}</h2>
                  <button 
                    onClick={() => setActiveCategory(section.id)}
                    className="text-[#9C3F2B] font-bold text-[12px] bg-[#9C3F2B]/10 px-3 py-1 rounded-full active:scale-90 transition-transform"
                  >
                    Ver todo
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar px-gutter pb-4 snap-x" style={{ scrollbarWidth: 'none' }}>
                  {section.products.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="min-w-[160px] w-[160px] bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col border border-[#3E2723]/5 snap-start">
                      <div className="relative h-28">
                        <img className="w-full h-full object-cover" src={p.img} alt={p.name} />
                        <div className="absolute top-2 left-2 bg-[#E2725B] text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{p.badge}</div>
                      </div>
                      <div className="p-3">
                        <h3 className="text-[13px] font-bold text-[#3E2723] line-clamp-1">{p.name}</h3>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-primary font-black text-[14px]">{p.price}</span>
                          <button 
                            onClick={() => handleAddToCartWithAnim(p)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                              addedItems[p.name] ? 'bg-[#25D366] text-white scale-110' : 'bg-primary text-white active:scale-90'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {addedItems[p.name] ? 'check' : 'add'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 px-gutter">
              <div>
                <h2 className="font-h2 text-[20px] text-[#3E2723] font-black">
                  {sections.find(s => s.id === activeCategory)?.title || activeCategory}
                </h2>
                <p className="text-[#745853] text-[13px]">Mostrando todos los productos disponibles</p>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar px-gutter" style={{ scrollbarWidth: 'none' }}>
                <button className="flex items-center justify-center w-8 h-8 rounded-full border border-[#3E2723]/10 bg-white shrink-0 text-[#3E2723]">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </button>
                {['Populares', 'Menor Precio', 'Nuevos', 'A-Z'].map(sort => (
                  <button 
                    key={sort}
                    onClick={() => setActiveSort(sort)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all ${
                      activeSort === sort 
                        ? 'bg-[#3E2723] text-white shadow-md' 
                        : 'bg-surface-container-lowest border border-[#3E2723]/10 text-[#3E2723]'
                    }`}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 px-gutter">
              {(sections.find(s => s.id === activeCategory)?.products || []).map((p, idx) => (
                <div key={idx} className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col border border-[#3E2723]/5">
                  <div className="relative h-32">
                    <img className="w-full h-full object-cover" src={p.img} alt={p.name} />
                    <div className="absolute top-2 left-2 bg-[#E2725B] text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{p.badge}</div>
                  </div>
                  <div className="p-3 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="text-[13px] font-bold text-[#3E2723] line-clamp-2 leading-tight mb-1">{p.name}</h3>
                      {(p as any).original && <span className="text-[#745853] text-[11px] line-through">{(p as any).original}</span>}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-primary font-black text-[15px]">{p.price}</span>
                      <button 
                        onClick={() => handleAddToCartWithAnim(p)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
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
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
