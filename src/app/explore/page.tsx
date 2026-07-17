"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

import { supabase } from '@/lib/supabase';

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState<'products' | 'stores'>('products');
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);
  
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [activeSort, setActiveSort] = useState('Populares');

  type StoreDataType = { name: string, slug: string, category: string, macroCat: string, time: string, delivery: string, logo: string, products: { name: string, price: string, img: string, status?: string }[] };
  const [storeData, setStoreData] = useState<StoreDataType[]>([]);

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
        Object.values(allStores).map((s: any) => {
          let macroCat = 'Mercado';
          const storeCategory = s.marketplaceCategory?.toLowerCase() || '';
          if (storeCategory.includes('moda') || storeCategory.includes('boutique')) macroCat = 'Moda';
          else if (storeCategory.includes('salud') || storeCategory.includes('belleza')) macroCat = 'Salud';
          else if (storeCategory.includes('restaurante') || storeCategory.includes('comida')) macroCat = 'Comida';
          else if (storeCategory.includes('servicio')) macroCat = 'Servicios';
          
          return {
            name: s.name,
            slug: s.slug,
            category: s.tagline || 'TIENDA OFICIAL',
            macroCat,
            time: '20-40 min',
            delivery: 'S/ 5.00',
            logo: s.heroImage,
            products: [
              { name: 'Producto Destacado', price: 'S/ 25.00', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
              { name: 'Oferta Especial', price: 'S/ 15.00', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
            ]
          };
        })
      );

      // 2. Fetch products
      const { data, error } = await supabase.from('products').select('*');
      if (data && !error && data.length > 0) {
        const formattedProducts = data.map((p: any) => {
          const storeDef = allStores[p.store];
          return {
            title: p.name,
            price: `S/ ${p.price.toFixed(2)}`,
            slug: p.store,
            image: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
            status: p.status || 'Activo',
          }
        });

        setStoreData(prev => prev.map(s => {
          const sProducts = formattedProducts.filter(p => p.slug === s.slug).slice(0, 5);
          return {
            ...s,
            products: sProducts.length > 0 
              ? sProducts.map(p => ({ name: p.title, price: p.price, img: p.image, status: p.status })) 
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
              img: p.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
              status: p.status || 'Activo'
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

  type SectionType = { id: string, title: string, link?: string, products: { name: string, price: string, original?: string, badge?: string, img: string, status?: string }[] };
  const [sections, setSections] = useState<SectionType[]>([
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

      <main className="max-w-[1440px] mx-auto px-container-margin w-full pt-6 flex flex-col gap-6 lg:gap-12 pb-12">
        
        {/* Adaptive Macro-Categories Selector */}
        <section className="flex flex-col gap-2 transition-all duration-500">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-headline-sm text-sm text-on-surface">Categorías Principales</h2>
            {viewMode === 'stores' ? (
              <button 
                onClick={() => { setViewMode('products'); setActiveCategory('Todas'); }}
                className="text-primary text-[11px] font-label-md font-bold active:scale-90"
              >
                Volver a Productos
              </button>
            ) : activeCategory !== 'Todas' ? (
              <button 
                onClick={() => setActiveCategory('Todas')}
                className="text-primary text-[11px] font-label-md font-bold active:scale-90"
              >
                Restablecer
              </button>
            ) : null}
          </div>
          
          <div className={`
            transition-all duration-500 ease-in-out
            ${activeCategory === 'Todas' 
              ? 'grid grid-cols-4 gap-2' 
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
                    flex transition-all duration-300 active:scale-95 shrink-0
                    ${activeCategory === 'Todas' 
                      ? 'flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl shadow-sm hover:shadow-md' 
                      : 'flex-row items-center gap-1.5 px-4 py-1.5 rounded-full shadow-sm'
                    }
                    ${isActive 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-white border border-surface-container-highest text-secondary'
                    }
                  `}
                >
                  <div className={isActive ? 'text-white' : 'text-primary'}>
                    <span className={`material-symbols-outlined shrink-0 transition-all ${
                      activeCategory === 'Todas' ? 'text-xl' : 'text-[18px]'
                    }`}>
                      {cat.icon}
                    </span>
                  </div>
                  <span className={`font-label-md transition-all ${
                    activeCategory === 'Todas' ? 'text-[10px] text-center leading-tight' : 'text-[11px] whitespace-nowrap'
                  } ${isActive ? 'text-white' : 'text-secondary'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Specific Sub-Categories (Filtered) */}
        {viewMode === 'products' && (
          <section className="hide-scrollbar overflow-x-auto flex gap-4 items-start">
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

              {currentSubCategories.map((sub, index) => (
                <div key={index} className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer active:scale-90 transition-transform">
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
        )}

        {/* Discovery Mode (Todas) or Listing Mode (Specific Category) */}
        {activeCategory === 'Todas' && viewMode === 'products' ? (
          <div className="flex flex-col gap-6">
            
            {/* Tiendas Destacadas */}
            <section className="flex flex-col gap-3">
              <div className="flex justify-between items-end mb-1">
                <h3 className="font-headline-md text-on-surface">Tiendas Destacadas</h3>
                <button onClick={() => { setViewMode('stores'); setActiveCategory('Todas'); }} className="text-primary font-label-md text-sm">Ver todo</button>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin pb-3 snap-x" style={{ scrollbarWidth: 'none' }}>
                {storeData.map((store) => (
                  <Link href={`/${store.slug}`} key={store.slug} className="min-w-[280px] w-[80vw] max-w-[310px] bg-white rounded-2xl p-4 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest snap-start flex flex-col gap-3 group">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x" style={{ scrollbarWidth: 'none' }}>
                      {store.products.map((p, i) => (
                        <div key={`${p.name}-${i}`} className="min-w-[85px] w-[85px] snap-start flex flex-col gap-1">
                          <div className="aspect-square rounded-xl overflow-hidden bg-surface-container-low">
                            <img src={p.img} className="w-full h-full object-cover" alt={p.name} />
                          </div>
                          <span className="font-label-md text-[9px] text-secondary uppercase leading-tight line-clamp-1 mt-0.5">{p.name}</span>
                          <span className="font-price-lg text-primary text-xs">{p.price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 items-center border-t border-surface-container pt-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-surface-container-highest">
                        <img src={store.logo} className="w-full h-full object-cover" alt={store.name} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-headline-sm text-sm text-on-surface leading-tight">{store.name}</span>
                        <span className="text-[9px] text-secondary font-label-md uppercase tracking-wider truncate mt-0.5">{store.category}</span>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="bg-primary-fixed text-primary text-[9px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-primary/10">
                            <span className="material-symbols-outlined text-[10px]">schedule</span>{store.time}
                          </span>
                          <span className="bg-surface-container-low text-secondary text-[9px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-surface-container-highest">
                            <span className="material-symbols-outlined text-[10px]">two_wheeler</span>{store.delivery}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {sections.map((section) => (
              <section key={section.id} className="flex flex-col gap-3">
                <div className="flex justify-between items-end mb-1">
                  <h3 className="font-headline-md text-on-surface">{section.title}</h3>
                  <button 
                    onClick={() => setActiveCategory(section.id)}
                    className="text-primary font-label-md text-sm bg-primary-fixed px-3 py-1 rounded-full active:scale-95 transition-all"
                  >
                    Ver todo
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin pb-3 snap-x" style={{ scrollbarWidth: 'none' }}>
                  {section.products.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="min-w-[160px] w-[160px] bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col border border-surface-container-highest snap-start">
                      <div className="relative h-28 bg-surface-container-low">
                        <img className={`w-full h-full object-cover ${p.status === 'Agotado' ? 'grayscale opacity-60' : ''}`} src={p.img} alt={p.name} />
                        <div className="absolute top-2 left-2 bg-[#dc3225] text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{p.badge}</div>
                        {p.status === 'Agotado' && (
                          <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="bg-black/85 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase shadow-md">Agotado</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1 justify-between">
                        <div>
                          <h4 className={`font-headline-sm text-sm line-clamp-1 ${p.status === 'Agotado' ? 'text-secondary/50' : 'text-on-surface'}`}>{p.name}</h4>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`font-price-lg text-primary text-sm ${p.status === 'Agotado' ? 'text-secondary/50' : ''}`}>{p.price}</span>
                          <button 
                            disabled={p.status === 'Agotado'}
                            onClick={() => handleAddToCartWithAnim(p)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform ${
                              p.status === 'Agotado' ? 'bg-surface-container-high text-secondary cursor-not-allowed' :
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
        ) : viewMode === 'stores' ? (
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-on-surface">Nuestras Tiendas</h2>
              <p className="text-secondary font-body-md text-xs">Descubre los mejores locales</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {storeData.filter(s => activeCategory === 'Todas' || s.macroCat === activeCategory).map((store, idx) => (
                <Link href={`/${store.slug}`} key={store.slug} className="bg-white rounded-2xl p-3 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col gap-3 group hover:border-primary/20 transition-all">
                  <div className="flex gap-2">
                    {store.products.slice(0, 2).map((p, i) => (
                      <div key={i} className="flex-1 aspect-square rounded-xl overflow-hidden bg-surface-container-low">
                        <img src={p.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={p.name} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center border-t border-surface-container pt-2.5 mt-0.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-surface-container-highest">
                      <img src={store.logo} className="w-full h-full object-cover" alt={store.name} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-headline-sm text-xs text-on-surface leading-tight truncate">{store.name}</span>
                      <span className="text-[8px] text-secondary font-label-md uppercase tracking-wider truncate mt-0.5">{store.category}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
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
              {(sections.find(s => s.id === activeCategory)?.products || []).map((p, idx) => (
                <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
                  <div className="relative aspect-square overflow-hidden bg-surface-container-low p-4">
                    <img className={`w-full h-full object-contain ${p.status === 'Agotado' ? 'grayscale opacity-60' : ''}`} src={p.img} alt={p.name} />
                    <div className="absolute top-2 left-2 bg-[#dc3225] text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{p.badge}</div>
                    {p.status === 'Agotado' && (
                      <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="bg-black/85 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase shadow-md">Agotado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1 justify-between">
                    <div>
                      <h4 className={`font-headline-sm text-sm line-clamp-1 ${p.status === 'Agotado' ? 'text-secondary/50' : 'text-on-surface'}`}>{p.name}</h4>
                      {(p as any).original && <span className="text-secondary text-[11px] line-through">{(p as any).original}</span>}
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-auto">
                      <span className={`font-price-lg text-primary text-base ${p.status === 'Agotado' ? 'text-secondary/50' : ''}`}>{p.price}</span>
                      <button 
                        disabled={p.status === 'Agotado'}
                        onClick={() => handleAddToCartWithAnim(p)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform ${
                          p.status === 'Agotado' ? 'bg-surface-container-high text-secondary cursor-not-allowed' :
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
