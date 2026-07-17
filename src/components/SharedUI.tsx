"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartDrawer from '@/components/CartDrawer';
// PWAInstallPrompt oculto por ahora — se reemplazará por un ícono fijo minimalista
// import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function SharedUI() {
  const pathname = usePathname();
  const {
    cartItems,
    cartCount,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem
  } = useCart();

  // El carrito del marketplace no aplica en los paneles de gestión ni en el registro de negocios
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/vende-con-boga')
  ) {
    return null;
  }

  return (
    <>
      {/* Floating Checkout Bar */}
      <div 
        className={`fixed left-0 w-full px-gutter z-50 transition-all duration-500 ease-out ${
          cartCount > 0 ? 'bottom-24 opacity-100 translate-y-0' : '-bottom-32 opacity-0 translate-y-10'
        }`}
      >
        <div className="bg-[#3E2723] text-white rounded-[24px] p-4 flex justify-between items-center shadow-[0_10px_40px_rgba(62,39,35,0.3)] border border-white/10">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium opacity-80">{cartCount} {cartCount === 1 ? 'producto' : 'productos'}</span>
            <span className="text-[18px] font-black tracking-tight">S/ {cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-[14px] active:scale-95 transition-transform flex items-center gap-2 shadow-md"
          >
            Ver Carrito
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
          </button>
        </div>
      </div>

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
      />
    </>
  );
}
