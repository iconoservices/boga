"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import SectionNav from '@/components/SectionNav';
import { CitySwitcher } from '@/components/CityWaitlist';
import BogaPushBell from '@/components/BogaPushBell';

interface AppHeaderProps {
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
  cartCount: propCartCount,
  onCartClick: propOnCartClick,
  showLocation = true,
  showChat = false,
  showCart = true
}: AppHeaderProps) {
  const { cartCount: contextCartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const pathname = usePathname();

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || null;

  // Use props if provided, otherwise use context
  const displayCartCount = propCartCount !== undefined ? propCartCount : contextCartCount;
  const handleCartClick = propOnCartClick || (() => setIsCartOpen(true));

  return (
    <header className="bg-surface sticky top-0 z-50 w-full shadow-[0px_15px_15px_rgba(0,0,0,0.04)] border-b border-surface-container-high">
      {/* Mobile Nav Row */}
      <div className="flex lg:hidden flex-col px-container-margin pt-4 pb-2">
        {/* Location & Icons Row */}
        <div className="flex items-center justify-between">
          {/* Address Selection — o wordmark en pantallas de lectura */}
          {showLocation ? (
            <CitySwitcher variant="mobile" />
          ) : (
            <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <img src="/logo-mark.svg" alt="" className="w-8 h-8 shrink-0" />
              <span className="font-headline-sm text-headline-sm text-on-surface">BogaHub</span>
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
            <BogaPushBell
              className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-90 flex items-center justify-center"
              iconClass="text-on-surface text-[20px]"
            />

            {/* Perfil / iniciar sesión — dentro del perfil se vuelve "Inicio" */}
            {(() => {
              const enPerfil = pathname.startsWith('/profile');
              return (
                <Link
                  href={enPerfil ? '/' : user ? '/profile' : '/login'}
                  aria-label={enPerfil ? 'Ir al inicio' : firstName ? `Perfil de ${firstName}` : 'Iniciar sesión'}
                  className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all active:scale-90 flex items-center justify-center"
                >
                  <span
                    className="material-symbols-outlined text-[20px] text-on-surface"
                    style={user ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {enPerfil ? 'home' : 'person'}
                  </span>
                </Link>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Desktop Nav Row */}
      <div className="hidden lg:flex items-center justify-between px-container-margin py-2.5 max-w-[1440px] mx-auto gap-4">
        {/* Left: Brand logo & Location */}
        <div className="flex items-center gap-5 shrink-0">
          <Link href="/" className="flex items-center shrink-0" aria-label="BogaHub — Inicio">
            <img src="/logo.svg" alt="BogaHub" className="h-8 w-auto" />
          </Link>
          {showLocation && <CitySwitcher variant="desktop" />}
        </div>

        <div className="flex-1" />

        {/* Right: Actions — soporte · notificaciones · pedidos · carrito · perfil */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showChat && (
            <button className="w-9 h-9 hover:bg-surface-container-high transition-colors rounded-full active:scale-95 flex items-center justify-center" title="Soporte por WhatsApp">
              <span className="material-symbols-outlined text-[#25D366] text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            </button>
          )}

          <BogaPushBell
            className="w-9 h-9 hover:bg-surface-container-high transition-colors rounded-full active:scale-95 flex items-center justify-center"
            iconClass="text-secondary text-[21px]"
          />

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
            href={user ? '/profile' : '/login'}
            className="flex items-center gap-2 p-1 pl-3 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-150"
          >
            <span className="font-label-md text-label-md text-on-surface">{firstName ? `Hola, ${firstName}` : 'Iniciar sesión'}</span>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-surface-container-highest bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">person</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Barra de secciones — debajo del header, a todo el ancho. Solo en
          desktop: en mobile ya está el BottomNav con las mismas secciones. */}
      <div className="hidden lg:block">
        <SectionNav />
      </div>
    </header>
  );
}
