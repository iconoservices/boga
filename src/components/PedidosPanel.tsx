"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

// Panel de Favoritos (Me gusta). Se muestra en la pestaña "Favoritos" del perfil
// y en /orders. Los favoritos viven en localStorage ('boga_favorites').
export default function PedidosPanel() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const saved = localStorage.getItem('boga_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const removeFavorite = (id: string | number) => {
    const updated = favorites.filter(f => String(f.id) !== String(id));
    setFavorites(updated);
    localStorage.setItem('boga_favorites', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Título de la sección */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-headline-lg text-on-surface text-xl sm:text-2xl font-extrabold">
            Mis Favoritos
          </h1>
          {favorites.length > 0 && (
            <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {favorites.length}
            </span>
          )}
        </div>
        <p className="text-secondary font-body-md text-xs sm:text-sm">
          Los productos que marcaste con ❤️ para comprar más tarde.
        </p>
      </div>

      {/* Contenido de favoritos */}
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest">
          <div className="w-16 h-16 bg-primary-fixed/60 text-primary rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1">
            Aún no tienes favoritos
          </h3>
          <p className="text-secondary text-xs sm:text-sm max-w-xs leading-relaxed">
            Explora las tiendas y dale &quot;me gusta&quot; a los productos para encontrarlos rápido aquí.
          </p>
          <Link 
            href="/market" 
            className="mt-6 px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary-container transition-all text-sm shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((prod) => (
            <div 
              key={prod.id} 
              className="bg-white rounded-2xl shadow-[0_10px_15px_rgba(0,0,0,0.03)] p-4 flex items-center justify-between border border-surface-container-highest relative gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-low flex-shrink-0 shadow-sm border border-surface-container-highest">
                  <img 
                    alt={prod.title} 
                    className="w-full h-full object-cover" 
                    src={prod.image || '/logo-mark.svg'} 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {prod.store && (
                    <div className="flex items-center gap-1">
                      {prod.logo && (
                        <img 
                          alt={prod.store} 
                          className="w-3.5 h-3.5 rounded-full object-cover border border-surface-container-highest" 
                          src={prod.logo} 
                        />
                      )}
                      <span className="text-[10px] font-label-md text-secondary uppercase truncate">
                        {prod.store}
                      </span>
                    </div>
                  )}
                  <h4 className="font-headline-sm text-sm text-on-surface font-bold mt-0.5 line-clamp-1">
                    {prod.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-primary font-price-lg font-bold mt-0.5">
                    {prod.price}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0 z-10">
                <button 
                  onClick={() => removeFavorite(prod.id)}
                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center active:scale-90 transition-transform border border-red-100 shrink-0"
                  title="Quitar de favoritos"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
                <button 
                  onClick={() => addToCart(prod)}
                  className="bg-primary text-white hover:bg-primary-container transition-all font-bold text-[11px] px-3.5 py-2 rounded-full whitespace-nowrap active:scale-95 flex items-center gap-1 shadow-md shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
