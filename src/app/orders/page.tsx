"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

export default function Orders() {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'favoritos'>('pedidos');
  const [favorites, setFavorites] = useState<any[]>([]);
  const { addToCart, cartCount, setIsCartOpen } = useCart();

  // Cargar favoritos al montar la página
  useEffect(() => {
    const saved = localStorage.getItem('boga_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const removeFavorite = (id: string | number) => {
    const updated = favorites.filter(f => String(f.id) !== String(id));
    setFavorites(updated);
    localStorage.setItem('boga_favorites', JSON.stringify(updated));
  };

  return (
    <>
      <AppHeader 
        showSearch={false} 
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="px-gutter pt-6 flex flex-col gap-lg pb-10">
        
        {/* Título de la sección */}
        <div className="flex flex-col gap-1">
          <h1 className="font-h2 text-[24px] font-black text-[#3E2723] tracking-tight">
            {activeTab === 'pedidos' ? 'Mis Pedidos' : 'Mis Favoritos'}
          </h1>
          <p className="text-[#745853] text-[13px]">
            {activeTab === 'pedidos' 
              ? 'Revisa el estado de tus compras activas e historial.' 
              : 'Los productos que marcaste con ❤️ para comprar más tarde.'}
          </p>
        </div>

        {/* Pill-style Tab Selector */}
        <div className="flex bg-[#F5EBE6] p-1 rounded-2xl w-full sm:max-w-md sm:self-center shadow-inner border border-black/[0.03]">
          <button 
            onClick={() => setActiveTab('pedidos')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'pedidos' 
                ? 'bg-white text-[#3E2723] shadow-md' 
                : 'text-[#745853] opacity-60 hover:opacity-100'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('favoritos')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'favoritos' 
                ? 'bg-white text-[#E2725B] shadow-md' 
                : 'text-[#745853] opacity-60 hover:opacity-100'
            }`}
          >
            <span 
              className="material-symbols-outlined text-[18px]" 
              style={activeTab === 'favoritos' ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              favorite
            </span>
            Me Gusta
            {favorites.length > 0 && (
              <span className="bg-[#E2725B] text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {favorites.length}
              </span>
            )}
          </button>
        </div>

        {/* Contenido según la pestaña activa */}
        {activeTab === 'pedidos' ? (
          <div className="flex flex-col gap-6">
            {/* Active Order Section */}
            <section>
              <h2 className="font-h2 text-[18px] font-black text-[#3E2723] mb-4">Pedido Activo</h2>
              <div className="bg-surface-container-lowest rounded-[24px] shadow-[0_8px_30px_rgba(62,39,35,0.08)] p-5 border border-[#E2725B]/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-h3 text-[17px] text-[#3E2723] font-bold">Artisan Bakery Delivery</h3>
                    <p className="font-body-md text-[13px] text-[#745853] flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">schedule</span> Llega en ~15 mins
                    </p>
                  </div>
                  <div className="bg-[#E2725B]/10 text-[#E2725B] p-3 rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_boat</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative w-full h-[6px] bg-[#3E2723]/10 rounded-full overflow-hidden mb-3">
                  <div className="absolute top-0 left-0 h-full bg-[#E2725B] rounded-full w-2/3"></div>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#745853]/60">
                  <span>Preparando</span>
                  <span className="text-[#E2725B]">En camino</span>
                  <span>Entregado</span>
                </div>
              </div>
            </section>

            {/* History Section */}
            <section className="flex flex-col gap-4">
              <h2 className="font-h2 text-[18px] font-black text-[#3E2723]">Historial</h2>
              <div className="flex flex-col gap-3">
                {/* History Item 1 */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 shadow-sm border border-black/5">
                      <img alt="Coffee" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDx-eVxGRbe-exffTF_Bc6_IRvKavCYXD2eBjoC3780fqjQW_-E0IHbVHDunues2kF4bOjEDRKKrda0ZCo9axM9f3z6mvZbWDVFYAi4qgtNLtly-dRHthzKDRGeMnO2fH1iFI--4Q_A0Ikm9b5uGbcBqUVmgB_wfKJHA97vigyu3AJ3i1cmS3t30XTPSbiUjlu9Tkb9IC6AEbwUTGlaSiOBMtWMpnGOrsNJWPESFQrtLGNNM6FWOHAiS9feWmmJfYwvoGLOzSMnL7md" />
                    </div>
                    <div>
                      <h4 className="font-label-md text-[15px] text-[#3E2723] font-bold">The Local Roaster</h4>
                      <p className="text-[12px] text-[#745853]">24 Oct • S/ 12.50</p>
                    </div>
                  </div>
                  <button className="bg-[#E2725B]/5 text-[#E2725B] hover:bg-[#E2725B] hover:text-white transition-all font-label-md text-[12px] px-4 py-2 rounded-full font-bold whitespace-nowrap active:scale-95">
                    Repetir
                  </button>
                </div>

                {/* History Item 2 */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 shadow-sm border border-black/5">
                      <img alt="Salad" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDt_yu0O5CfjJvExHU9FKB8I-LHwhwZtJlg67YLUf4R_KSzyj2uY1ty5c0KjX-sJeGbfKnVhqZ9vCmT8b1_VYppeuzmNshVV-rnz29hLJMngPXkdeEU_PsWlmtT0-RGnBETTNm51ifxaVaJ_ylIgZQkFGKS2Gv2I_Xey7GoudDFR4a8NmYpGzbm3ez1F8iNYXZToss4kjLbXBErEKeWcA1Z_RdCM2FzCDLNY-V-29u4RPMK4pKNmJSevdvLmdWIucHjvXHpnLMb26oB" />
                    </div>
                    <div>
                      <h4 className="font-label-md text-[15px] text-[#3E2723] font-bold">Green Bowl Co.</h4>
                      <p className="text-[12px] text-[#745853]">22 Oct • S/ 18.00</p>
                    </div>
                  </div>
                  <button className="bg-[#E2725B]/5 text-[#E2725B] hover:bg-[#E2725B] hover:text-white transition-all font-label-md text-[12px] px-4 py-2 rounded-full font-bold whitespace-nowrap active:scale-95">
                    Repetir
                  </button>
                </div>

                {/* History Item 3 */}
                <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 shadow-sm border border-black/5">
                      <img alt="Burger" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5l1M3MuUMfOb_espbzzNUJ_Zoqgiz7wvEUmqeTiDYq0Wc-YRImFrrm1KuvI5zrf-HFKUfJ5B-2DGUQAadnhxJAcUTpvFXi7035XZyesEcHi3o6ci7nVmr4fnW7pzBe-2_3RMNtelAyMUtgvpDb0t_d0cXLhXgnMTg45SNax-pLJ3sxO71zgkD5a0-TR4Hr-Twcm-o_IYAn30L3VnQa4KjQ-90TDqnupLJD8CSFp-Dqs-2cSxHHJhiyy8SCb6_wD9RCxLTRGM-NYY7" />
                    </div>
                    <div>
                      <h4 className="font-label-md text-[15px] text-[#3E2723] font-bold">Urban Burger</h4>
                      <p className="text-[12px] text-[#745853]">18 Oct • S/ 24.50</p>
                    </div>
                  </div>
                  <button className="bg-[#E2725B]/5 text-[#E2725B] hover:bg-[#E2725B] hover:text-white transition-all font-label-md text-[12px] px-4 py-2 rounded-full font-bold whitespace-nowrap active:scale-95">
                    Repetir
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div>
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-[24px] shadow-sm border border-black/5 mt-4">
                <div className="w-16 h-16 bg-[#FFF0E6] rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-[#E2725B]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
                <h3 className="text-lg font-bold text-[#3E2723] mb-1">Aún no tienes favoritos</h3>
                <p className="text-[#745853]/70 text-sm max-w-xs leading-relaxed">
                  Explora las tiendas y dale "me gusta" a los productos para verlos listados aquí.
                </p>
                <Link 
                  href="/" 
                  className="mt-6 px-6 py-2.5 bg-[#3E2723] text-white font-bold rounded-full hover:bg-black transition-all text-sm shadow-md active:scale-95"
                >
                  Explorar productos
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {favorites.map((prod) => (
                  <div key={prod.id} className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(62,39,35,0.04)] p-4 flex items-center justify-between border border-primary-container/5 relative gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm border border-black/5">
                        <img alt={prod.title} className="w-full h-full object-cover" src={prod.image} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {prod.logo && (
                            <img alt={prod.store} className="w-3.5 h-3.5 rounded-full object-cover border border-[#3E2723]/10" src={prod.logo} />
                          )}
                          <span className="text-[10px] font-bold text-[#745853]/80 uppercase tracking-wider truncate">{prod.store}</span>
                        </div>
                        <h4 className="font-label-md text-[14px] text-[#3E2723] font-bold mt-0.5 line-clamp-1">{prod.title}</h4>
                        <p className="text-[13px] text-[#2E7D32] font-black mt-0.5">{prod.price}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0 z-10">
                      <button 
                        onClick={() => removeFavorite(prod.id)}
                        className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center active:scale-90 transition-transform border border-red-100 shrink-0"
                        title="Quitar favorito"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                      <button 
                        onClick={() => addToCart(prod)}
                        className="bg-[#E2725B] text-white hover:bg-[#c95b45] transition-all font-bold text-[11px] px-3 py-2 rounded-full whitespace-nowrap active:scale-95 flex items-center gap-0.5 shadow-md shadow-[#E2725B]/10 shrink-0"
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
        )}
      </main>
    </>
  );
}
