"use client";

import { useCart } from '@/context/CartContext';

interface AppHeaderProps {
  showSearch?: boolean;
  placeholder?: string;
  cartCount?: number;
  onCartClick?: () => void;
}

export default function AppHeader({ 
  showSearch = true, 
  placeholder = "¿Qué buscas hoy?",
  cartCount: propCartCount,
  onCartClick: propOnCartClick
}: AppHeaderProps) {
  const { cartCount: contextCartCount, setIsCartOpen } = useCart();
  
  // Use props if provided, otherwise use context
  const displayCartCount = propCartCount !== undefined ? propCartCount : contextCartCount;
  const handleCartClick = propOnCartClick || (() => setIsCartOpen(true));

  return (
    <header className="sticky top-0 left-0 w-full z-40 flex flex-col gap-4 px-gutter py-4 bg-background/80 backdrop-blur-xl border-b border-[#3E2723]/5">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold text-[#745853] uppercase tracking-[0.2em] opacity-60">Entregar en</span>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            <span className="text-[15px] font-black text-[#3E2723]">Calle Las Palmeras 123</span>
            <span className="material-symbols-outlined text-[18px] text-[#745853]">expand_more</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center shadow-sm text-[#25D366]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
            </svg>
          </button>
          <button 
            onClick={handleCartClick}
            className="w-10 h-10 rounded-full bg-surface-container-lowest border border-[#3E2723]/10 flex items-center justify-center shadow-sm relative active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-[22px] text-[#3E2723]">shopping_cart</span>
            {displayCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {displayCartCount}
              </span>
            )}
          </button>
          <button className="w-10 h-10 rounded-full bg-surface-container-lowest border border-[#3E2723]/10 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[22px] text-[#3E2723]">notifications</span>
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-[18px] flex items-center pointer-events-none z-10">
            <span className="material-symbols-outlined text-outline text-[22px]">search</span>
          </div>
          <input
            className="w-full bg-[#FFF0E6]/40 border border-[#E2725B]/20 rounded-full py-[13px] pl-[48px] pr-4 text-[15px] text-[#3E2723] focus:ring-2 focus:ring-primary-container focus:outline-none shadow-sm placeholder:text-[#745853]/60"
            placeholder={placeholder}
            type="text"
          />
        </div>
      )}
    </header>
  );
}
