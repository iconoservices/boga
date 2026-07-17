"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isMarketplaceRoute = 
    pathname === '/' ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/promotions') ||
    pathname.startsWith('/login');

  if (!isMarketplaceRoute) return null;

  const navItems = [
    { path: '/', icon: 'home', label: 'Inicio' },
    { path: '/explore', icon: 'search', label: 'Explorar' },
    { path: '/orders', icon: 'receipt_long', label: 'Pedidos' },
    { path: '/profile', icon: 'person', label: 'Perfil' },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed nav */}
      <div className="h-[90px] w-full shrink-0 lg:hidden" aria-hidden="true" />
      
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-surface-container-lowest dark:bg-inverse-surface shadow-[0_-4px_15px_rgba(0,0,0,0.04)] rounded-t-xl border-t border-surface-container-high lg:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center justify-center rounded-xl px-6 py-2 transition-transform duration-150 active:scale-90 ${
                isActive 
                  ? 'bg-primary-fixed text-primary dark:bg-primary-container dark:text-on-primary-container scale-95' 
                  : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="font-label-md text-label-md mt-1">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
