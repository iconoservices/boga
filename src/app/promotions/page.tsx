"use client";

import React from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

const ALL_PROMOTIONS = [
  { id: 1, title: 'Classic Burger', price: 'S/ 18.50', originalPrice: 'S/ 30.80', discount: '-40%', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
  { id: 2, title: 'Pizza Pepperoni', price: 'S/ 24.00', originalPrice: 'S/ 32.00', discount: '-25%', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
  { id: 3, title: 'Green Salad', price: 'S/ 12.00', originalPrice: 'S/ 24.00', discount: '-50%', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
  { id: 4, title: 'Red Sneakers', price: 'S/ 145.00', originalPrice: 'S/ 207.00', discount: '-30%', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { id: 5, title: 'Tacos al Pastor', price: 'S/ 15.00', originalPrice: 'S/ 20.00', discount: '-25%', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400' },
  { id: 6, title: 'Iced Coffee', price: 'S/ 8.00', originalPrice: 'S/ 10.00', discount: '-20%', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400' },
  { id: 7, title: 'Sushi Roll Combo', price: 'S/ 35.00', originalPrice: 'S/ 50.00', discount: '-30%', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
  { id: 8, title: 'Wireless Headphones', price: 'S/ 120.00', originalPrice: 'S/ 240.00', discount: '-50%', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
];

export default function Promotions() {
  const { addToCart, cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader 
        showSearch={false} 
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="px-gutter pt-6 flex flex-col gap-6 pb-10">
        <div className="flex flex-col gap-1">
          <h1 className="font-h2 text-[22px] font-black text-[#3E2723] tracking-tight">Todas las Promociones</h1>
          <p className="text-[#745853] text-[14px]">Aprovecha nuestros mejores descuentos</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ALL_PROMOTIONS.map((promo) => (
            <div key={promo.id} className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col border border-[#3E2723]/5">
              <div className="relative h-32">
                <img className="w-full h-full object-cover" src={promo.image} alt={promo.title} />
                <div className="absolute top-2 left-2 bg-[#E2725B] text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
                  {promo.discount}
                </div>
              </div>
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#3E2723] line-clamp-2 leading-tight mb-1">{promo.title}</h3>
                  <span className="text-[#745853] text-[11px] line-through">{promo.originalPrice}</span>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-primary font-black text-[15px]">{promo.price}</span>
                  <button 
                    onClick={() => addToCart(promo)}
                    className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center active:scale-90 shadow-sm transition-transform"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
