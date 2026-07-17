"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

const ALL_PROMOTIONS = [
  { id: 1, title: 'Classic Burger', price: 'S/ 18.50', originalPrice: 'S/ 30.80', discount: '-40%', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  { id: 2, title: 'Pizza Pepperoni', price: 'S/ 24.00', originalPrice: 'S/ 32.00', discount: '-25%', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
  { id: 3, title: 'Ensalada Verde', price: 'S/ 12.00', originalPrice: 'S/ 24.00', discount: '-50%', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
  { id: 4, title: 'Zapatillas Rojas', price: 'S/ 145.00', originalPrice: 'S/ 207.00', discount: '-30%', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { id: 5, title: 'Tacos al Pastor', price: 'S/ 15.00', originalPrice: 'S/ 20.00', discount: '-25%', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
  { id: 6, title: 'Café Frío', price: 'S/ 8.00', originalPrice: 'S/ 10.00', discount: '-20%', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400' },
  { id: 7, title: 'Combo Sushi Roll', price: 'S/ 35.00', originalPrice: 'S/ 50.00', discount: '-30%', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
  { id: 8, title: 'Audífonos Inalámbricos', price: 'S/ 120.00', originalPrice: 'S/ 240.00', discount: '-50%', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
];

const FILTER_TABS = ['Todos', 'Comida', 'Bebidas', 'Ropa', 'Tech'];

export default function Promotions() {
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const [addedItems, setAddedItems] = useState<Record<number, boolean>>({});
  const [activeFilter, setActiveFilter] = useState('Todos');

  const handleAddToCart = (promo: typeof ALL_PROMOTIONS[0]) => {
    addToCart(promo);
    setAddedItems(prev => ({ ...prev, [promo.id]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [promo.id]: false })), 1500);
  };

  return (
    <>
      <AppHeader 
        showSearch={false} 
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="max-w-[1440px] mx-auto px-container-margin w-full pt-6 flex flex-col gap-6 lg:gap-12 pb-12">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Todas las Promociones</h1>
          <p className="text-secondary font-body-md text-sm">Aprovecha nuestros mejores descuentos del día</p>
        </div>

        {/* Banner destacado */}
        <div className="bg-gradient-to-r from-primary to-primary-container rounded-2xl p-5 flex items-center gap-4 shadow-md overflow-hidden relative">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/5 rounded-full" />
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-white/5 rounded-full" />
          <div className="flex-1 z-10">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Oferta del día</p>
            <h2 className="font-headline-md text-white text-xl font-extrabold leading-tight">¡Hasta 50% OFF!</h2>
            <p className="text-white/60 text-xs mt-1 font-body-md">En productos seleccionados. Solo por hoy.</p>
          </div>
          <div className="z-10 bg-white/15 backdrop-blur-sm rounded-xl p-3 shrink-0">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_offer</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                activeFilter === tab
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grilla de productos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-stack-lg">
          {ALL_PROMOTIONS.map((promo) => (
            <div 
              key={promo.id} 
              className="bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col border border-surface-container-highest"
            >
              {/* Imagen */}
              <div className="relative aspect-square overflow-hidden bg-surface-container-low">
                <img 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                  src={promo.image} 
                  alt={promo.title} 
                />
                {/* Badge descuento */}
                <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                  {promo.discount}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-headline-sm text-sm text-on-surface line-clamp-1 leading-tight">{promo.title}</h3>
                  <span className="text-secondary font-body-md text-[11px] line-through mt-0.5 block">{promo.originalPrice}</span>
                </div>
                <div className="flex justify-between items-center mt-2.5">
                  <span className="font-price-lg text-primary text-base">{promo.price}</span>
                  <button 
                    onClick={() => handleAddToCart(promo)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-300 active:scale-90 ${
                      addedItems[promo.id] 
                        ? 'bg-[#25D366] text-white scale-110' 
                        : 'bg-primary text-white hover:bg-primary-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {addedItems[promo.id] ? 'check' : 'add'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer de sección */}
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="material-symbols-outlined text-secondary/35 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_offer</span>
          <p className="text-secondary font-body-md text-xs">Más ofertas disponibles cada día. ¡Vuelve pronto!</p>
        </div>

      </main>
    </>
  );
}
