"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);
  
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [activeSort, setActiveSort] = useState('Populares');

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

  const sections = [
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
  ];

  return (
    <>
      <AppHeader 
        showSearch={true} 
        placeholder="Busca lo que necesites..." 
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="px-gutter pt-2 flex flex-col gap-6 pb-10">
        
        {/* Adaptive Macro-Categories Selector */}
        <section className="flex flex-col gap-3 transition-all duration-500">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-h2 text-[15px] text-[#3E2723] font-bold">Categorías Principales</h2>
            {activeCategory !== 'Todas' && (
              <button 
                onClick={() => setActiveCategory('Todas')}
                className="text-primary text-[11px] font-bold active:scale-90"
              >
                Restablecer
              </button>
            )}
          </div>
          
          <div className={`
            transition-all duration-500 ease-in-out
            ${activeCategory === 'Todas' 
              ? 'grid grid-cols-4 gap-2' 
              : 'flex gap-3 overflow-x-auto hide-scrollbar -mx-gutter px-gutter pb-2'
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
                    ? 'flex-col items-center justify-center gap-1.5 w-full px-2 py-3 rounded-xl border shadow-sm' 
                    : 'flex-row items-center gap-2 px-4 py-2 rounded-full border border-[#3E2723]/10'
                  }
                  ${activeCategory === cat.id 
                    ? 'bg-primary text-white border-primary shadow-md' 
                    : 'bg-surface-container-lowest text-[#3E2723]'
                  }
                `}
              >
                <span className={`material-symbols-outlined shrink-0 transition-all ${
                  activeCategory === 'Todas' ? 'text-[20px]' : 'text-[16px]'
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
            className={`px-1 py-1 ${showAllSubCategories ? 'flex flex-wrap gap-x-6 gap-y-4 justify-start' : '-mx-gutter px-gutter overflow-x-auto hide-scrollbar flex gap-6 items-center'}`} 
            style={{ scrollbarWidth: 'none' }}
          >
            <div 
              onClick={() => setShowAllSubCategories(!showAllSubCategories)}
              className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer active:scale-90 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-[#FFF0E6] shadow-sm flex items-center justify-center border border-[#E2725B]/20 group-hover:border-primary">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  {showAllSubCategories ? 'unfold_less' : 'unfold_more'}
                </span>
              </div>
              <span className="text-[11px] font-bold text-primary text-center w-16 leading-tight">
                {showAllSubCategories ? 'Ver menos' : 'Ver todo'}
              </span>
            </div>

            {currentSubCategories.map((sub, index) => (
              <div key={index} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer active:scale-90 transition-transform">
                <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center border border-[#E2725B]/10 group-hover:border-primary">
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    {sub.icon}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-on-surface text-center w-16 leading-tight">{sub.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Discovery Mode (Todas) or Listing Mode (Specific Category) */}
        {activeCategory === 'Todas' ? (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <section key={section.id}>
                <div className="flex justify-between items-center mb-3 px-1">
                  <h2 className="font-h2 text-[18px] text-[#3E2723] font-black">{section.title}</h2>
                  <button 
                    onClick={() => setActiveCategory(section.id)}
                    className="text-[#9C3F2B] font-bold text-[12px] bg-[#9C3F2B]/10 px-3 py-1 rounded-full active:scale-90 transition-transform"
                  >
                    Ver todo
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-gutter px-gutter pb-4 snap-x" style={{ scrollbarWidth: 'none' }}>
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
            <div className="flex flex-col gap-4 px-1">
              <div>
                <h2 className="font-h2 text-[20px] text-[#3E2723] font-black">
                  {sections.find(s => s.id === activeCategory)?.title || activeCategory}
                </h2>
                <p className="text-[#745853] text-[13px]">Mostrando todos los productos disponibles</p>
              </div>

              <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
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
            
            <div className="grid grid-cols-2 gap-4">
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
