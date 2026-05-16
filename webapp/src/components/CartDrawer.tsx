"use client";

import React from 'react';

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  img: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (name: string, delta: number) => void;
  onRemove: (name: string) => void;
}

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity,
  onRemove 
}: CartDrawerProps) {
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-[70] shadow-2xl transition-transform duration-500 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#3E2723]/5 flex justify-between items-center bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">shopping_basket</span>
            <h2 className="text-[20px] font-black text-[#3E2723]">Mi Carrito</h2>
            <span className="bg-primary/10 text-primary text-[12px] font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#3E2723]/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[#3E2723]">close</span>
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 bg-background/50">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
              <span className="material-symbols-outlined text-[64px]">shopping_cart_off</span>
              <p className="text-[15px] font-bold">Tu carrito está vacío</p>
              <button 
                onClick={onClose}
                className="bg-primary text-white px-6 py-2 rounded-full text-[13px] font-bold"
              >
                Seguir Comprando
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div 
                key={item.name} 
                className="bg-white rounded-2xl p-3 border border-[#3E2723]/5 shadow-sm flex gap-4 items-center"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#3E2723]/5">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-[14px] font-bold text-[#3E2723] line-clamp-1">{item.name}</h3>
                    <button 
                      onClick={() => onRemove(item.name)}
                      className="text-[#745853] hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-primary font-black text-[15px]">S/ {(item.price * item.quantity).toFixed(2)}</span>
                    <div className="flex items-center gap-3 bg-[#3E2723]/5 px-2 py-1 rounded-lg">
                      <button 
                        onClick={() => onUpdateQuantity(item.name, -1)}
                        className="w-6 h-6 flex items-center justify-center text-[#3E2723] active:scale-90"
                      >
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="text-[13px] font-bold text-[#3E2723] w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.name, 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#3E2723] active:scale-90"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {items.length > 0 && (
          <div className="p-6 bg-surface-container-lowest border-t border-[#3E2723]/10 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-[#745853]">Subtotal</span>
                <span className="font-bold text-[#3E2723]">S/ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-[#745853]">Delivery</span>
                <span className="font-bold text-primary">S/ 5.00</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-4 border-t border-[#3E2723]/5">
                <span className="text-[16px] font-black text-[#3E2723]">Total</span>
                <span className="text-[20px] font-black text-primary">S/ {(total + 5).toFixed(2)}</span>
              </div>
            </div>
            
            <button className="w-full bg-[#3E2723] text-white py-4 rounded-2xl font-black text-[16px] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform">
              Proceder al Pago
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
