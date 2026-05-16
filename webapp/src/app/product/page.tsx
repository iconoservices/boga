"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import ProductHeader from '@/components/product/ProductHeader';
import ProductNotice from '@/components/product/ProductNotice';
import VariantSelector from '@/components/product/VariantSelector';
import ExtrasSelector from '@/components/product/ExtrasSelector';
import RelatedProducts from '@/components/product/RelatedProducts';
import { useCart } from '@/context/CartContext';

export default function ProductDetail() {
  const [selectedDrink, setSelectedDrink] = useState('Cocona');
  const [quantity, setQuantity] = useState(1);
  const { addToCart, setIsCartOpen } = useCart();

  const currentProduct = {
    title: "Pensión del Día",
    price: "S/ 18.50",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=80"
  };

  const extras = [
    { id: '1', name: 'Extra bacon', price: 'S/ 2.50' },
    { id: '2', name: 'Huevo frito', price: 'S/ 1.50' },
    { id: '3', name: 'Jalapeños', price: 'S/ 1.00' },
  ];

  const suggestedProducts = [
    { id: '1', name: 'Saludable Bowl', price: 'S/ 22.00', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', store: 'Green Bowl' },
    { id: '2', name: 'Burger Doble', price: 'S/ 24.50', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', store: 'Urban Burger' },
    { id: '3', name: 'Pizza Personal', price: 'S/ 19.00', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80', store: 'La Pizza' }
  ];

  return (
    <>
      <nav className="bg-surface-container-lowest/90 backdrop-blur-md sticky top-0 left-0 w-full z-50 flex justify-between items-center px-4 h-16 border-b border-[#3E2723]/5 shadow-sm">
        <Link href="/" className="text-[#3E2723]/60 hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-10 h-10">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <span className="font-bold text-xl text-[#3E2723]">Boga Market</span>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="text-[#3E2723]/60 hover:opacity-80 transition-opacity active:scale-95 flex items-center justify-center w-10 h-10"
        >
          <span className="material-symbols-outlined">shopping_bag</span>
        </button>
      </nav>

      <div className="w-full h-72 relative overflow-hidden bg-surface-container-low shadow-inner">
        <img 
          className="w-full h-full object-cover object-center" 
          src={currentProduct.image} 
          alt="Amazonian Dish"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      <main className="px-gutter pt-6 max-w-container-max mx-auto -mt-6 relative z-10 pb-32 focus:outline-none">
        <ProductNotice 
          icon="schedule"
          message="Entrega programada entre 12:30 PM - 1:30 PM. Calidad amazónica garantizada."
          type="info"
        />

        <ProductHeader 
          tag="Lunes"
          title={currentProduct.title}
          price={currentProduct.price}
          description="Sabor Amazónico Tradicional. Un viaje culinario a la selva con ingredientes frescos y recetas auténticas de nuestra región."
          rating="4.9"
          reviews="84"
        />

        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">restaurant_menu</span>
            <h2 className="font-h2 text-[20px] font-bold text-[#3E2723]">Menú Incluido</h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm flex flex-row items-center gap-4 border border-[#3E2723]/5">
              <div className="w-20 h-20 rounded-xl bg-surface-container-high overflow-hidden shrink-0 shadow-sm">
                <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80" alt="Main Dish" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1 block">Fondo</span>
                <h3 className="text-[16px] font-bold text-[#3E2723] mb-1">Cecina con Tacacho</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm flex flex-col gap-3 border border-[#3E2723]/5">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high overflow-hidden shrink-0 shadow-sm">
                  <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80" alt="Soup" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-[#745853] font-bold uppercase tracking-widest mb-1 block">Entrada</span>
                  <h4 className="text-[14px] font-bold text-[#3E2723] leading-tight">Sopa Inchicapi</h4>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm flex flex-col gap-3 border border-[#3E2723]/5">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[24px]">local_drink</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-[#745853] font-bold uppercase tracking-widest mb-1 block">Bebida</span>
                  <h4 className="text-[14px] font-bold text-[#3E2723] leading-tight">{selectedDrink}</h4>
                </div>
              </div>
            </div>
          </div>
        </section>

        <VariantSelector 
          title="Personaliza tu orden"
          options={['Cocona', 'Camu Camu', 'Chicha', 'Maracuyá', 'Limonada']}
          selectedOption={selectedDrink}
          onSelect={setSelectedDrink}
        />

        <ExtrasSelector 
          title="Agrega algo extra"
          options={extras}
        />

        <RelatedProducts 
          title="También podría gustarte"
          products={suggestedProducts}
        />
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md px-5 py-4 pb-6 shadow-[0_-15px_40px_rgba(62,39,35,0.08)] z-50 rounded-t-[32px] border-t border-[#3E2723]/5">
        <div className="max-w-container-max mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-4 bg-[#3E2723]/5 rounded-full p-1 border border-[#3E2723]/10">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#3E2723] hover:bg-primary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <span className="font-bold text-[15px] text-[#3E2723] w-4 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)} 
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#3E2723] hover:bg-primary hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-[2px] opacity-60">Total a Pagar</span>
              <span className="text-[20px] font-black text-[#2E7D32]">S/ {(18.50 * quantity).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3 h-[52px]">
            <a 
              href={`https://wa.me/51999999999?text=Hola,%20deseo%20pedir%20${quantity}%20Pensión(es)%20del%20Día.`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-[52px] h-[52px] rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20 shrink-0 hover:opacity-90 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
              </svg>
            </a>
            <button 
              onClick={() => addToCart(currentProduct, quantity)}
              className="flex-1 bg-primary text-white font-bold text-[15px] h-full rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              Añadir al Carrito
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
