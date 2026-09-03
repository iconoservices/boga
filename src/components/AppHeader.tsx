"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import SectionNav from '@/components/SectionNav';

interface AppHeaderProps {
  showSearch?: boolean;
  placeholder?: string;
  cartCount?: number;
  onCartClick?: () => void;
  /** Bloque "Entregar en <dirección>". Se apaga en pantallas de lectura (Revista). */
  showLocation?: boolean;
  /** Botón de soporte por WhatsApp. */
  showChat?: boolean;
  /** Botón de carrito. */
  showCart?: boolean;
}

export default function AppHeader({
  showSearch = true,
  placeholder = "¿Qué buscas hoy?",
  cartCount: propCartCount,
  onCartClick: propOnCartClick,
  showLocation = true,
  showChat = true,
  showCart = true
}: AppHeaderProps) {
  const { cartCount: contextCartCount, setIsCartOpen } = useCart();
  const pathname = usePathname();

  // Use props if provided, otherwise use context
  const displayCartCount = propCartCount !== undefined ? propCartCount : contextCartCount;
  const handleCartClick = propOnCartClick || (() => setIsCartOpen(true));

  // Se oculta al bajar, reaparece al subir (o cerca del tope).
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 64) setHidden(false);
        else if (y > lastY + 6) setHidden(true);
        else if (y < lastY - 6) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`bg-surface sticky top-0 z-50 w-full shadow-[0px_15px_15px_rgba(0,0,0,0.04)] border-b border-surface-container-high transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Mobile Nav Row */}
      <div className="flex lg:hidden flex-col px-container-margin pt-4 pb-2">
        {/* Location & Icons Row */}
        <div className="flex items-center justify-between">
          {/* Address Selection — o wordmark en pantallas de lectura */}
          {showLocation ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-secondary leading-none mb-0.5">Entregar en</span>
                <div className="flex items-center gap-1 cursor-pointer">
                  <span className="font-label-md text-label-md text-on-surface font-bold truncate">Calle Las Palmeras 123</span>
                  <span className="material-symbols-outlined text-sm text-secondary">expand_more</span>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <img src="/logo-mark.svg" alt="" className="w-8 h-8 shrink-0" />
              <span className="font-headline-sm text-headline-sm text-on-surface">Boga</span>
            </Link>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {/* WhatsApp Support button */}
            {showChat && (
              <button className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-90 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#25D366] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
              </button>
            )}

            {/* Cart button */}
            {showCart && (
              <button
                onClick={handleCartClick}
                className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-90 relative flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-on-surface text-[20px]">shopping_cart</span>
                {displayCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {displayCartCount}
                  </span>
                )}
              </button>
            )}

            {/* Notifications button */}
            <button className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-90 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface text-[20px]">notifications</span>
            </button>
          </div>
        </div>

        {/* Pill-shaped Search Bar */}
        {showSearch && (
          <div className="mt-4 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <span className="material-symbols-outlined text-secondary text-[20px]">search</span>
            </div>
            <input
              className="block w-full pl-11 pr-4 py-3 bg-white border-none rounded-full shadow-[0_15px_15px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-primary/20 text-body-md font-body-md transition-all focus:outline-none placeholder:text-secondary/60"
              placeholder={placeholder}
              type="text"
            />
          </div>
        )}
      </div>

      {/* Desktop Nav Row */}
      <div className="hidden lg:flex items-center justify-between px-container-margin py-2.5 max-w-[1440px] mx-auto gap-4">
        {/* Left: Brand logo & Location */}
        <div className="flex items-center gap-5 shrink-0">
          <Link href="/" className="flex items-center shrink-0" aria-label="Boga — Inicio">
            <img src="/logo.svg" alt="Boga" className="h-8 w-auto" />
          </Link>
          {showLocation && (
            <div className="flex items-center gap-1.5 text-secondary group cursor-pointer">
              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              <span className="font-label-md text-label-md group-hover:text-primary transition-colors">Calle Las Palmeras 123</span>
              <span className="material-symbols-outlined text-sm text-secondary group-hover:text-primary transition-colors">expand_more</span>
            </div>
          )}
        </div>

        {/* Middle Right: Centered Search Bar */}
        {showSearch ? (
          <div className="flex-1 max-w-xl px-2">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors text-[20px]">search</span>
              <input 
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:bg-white focus:outline-none transition-all text-body-md placeholder:text-secondary/60" 
                placeholder={placeholder} 
                type="text"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right: Actions — soporte · notificaciones · pedidos · carrito · perfil */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showChat && (
            <button className="w-9 h-9 hover:bg-surface-container-high transition-colors rounded-full active:scale-95 flex items-center justify-center" title="Soporte por WhatsApp">
              <span className="material-symbols-outlined text-[#25D366] text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            </button>
          )}

          <button className="w-9 h-9 hover:bg-surface-container-high transition-colors rounded-full active:scale-95 flex items-center justify-center" title="Notificaciones">
            <span className="material-symbols-outlined text-secondary text-[21px]">notifications</span>
          </button>

          <Link href="/orders" title="Mis pedidos" className="w-9 h-9 hover:bg-surface-container-high transition-colors rounded-full active:scale-95 flex items-center justify-center">
            <span className={`material-symbols-outlined text-[21px] ${pathname.startsWith('/orders') ? 'text-primary' : 'text-secondary'}`}>receipt_long</span>
          </Link>

          {showCart && (
            <button
              onClick={handleCartClick}
              className="w-9 h-9 hover:bg-surface-container-high transition-colors rounded-full active:scale-95 relative flex items-center justify-center"
              title="Carrito"
            >
              <span className="material-symbols-outlined text-secondary text-[21px]">shopping_cart</span>
              {displayCartCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-surface shadow-sm">
                  {displayCartCount}
                </span>
              )}
            </button>
          )}

          {/* Profile button */}
          <Link
            href="/profile"
            className="flex items-center gap-2 p-1 pl-3 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150"
          >
            <span className="font-label-md text-label-md text-on-surface">Hola, Alex</span>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-surface-container-highest">
              <img 
                className="w-full h-full object-cover" 
                alt="Perfil de usuario" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-IfEzGRk920DvtCpRmfZp9bbKbjxdF27v3TAFmrFvsQkVlD9adL1G9__Y4T63prwK0SpZ_e8eC0ZzjfdXwOmfi3w33M2hw9ALsqO-dEj7G_H8GUHkbE4DRAdO0EevAXO7oYcJ66uwpr1wxs4jobjXK8FnMkmc7l0_-iXvrRC36FyaBjUem3f-02cQhz-mES9QLNpYrclwkPRjdwnZ7lQUhLlJVY_O2mDIM933yELXAuOKN08bMAxdsZlKlqpY45x1nO_U-iiLM9I"
              />
            </div>
          </Link>
        </div>
      </div>

      {/* Barra de secciones — debajo del header, a todo el ancho */}
      <SectionNav />
    </header>
  );
}
