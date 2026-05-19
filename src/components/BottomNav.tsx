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
    { path: '/orders', icon: 'receipt_long', label: 'Pedidos' },
    { path: '/login', icon: 'person', label: 'Perfil' },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed nav */}
      <div className="h-[90px] w-full shrink-0" aria-hidden="true" />
      
      <nav className="bg-surface-container-lowest dark:bg-[#1A1A1A] fixed bottom-0 left-0 w-full rounded-t-[32px] border-t border-[#3E2723]/5 shadow-[0_-8px_30px_rgba(62,39,35,0.12)] z-50 flex justify-around items-center px-2 pt-3 pb-6">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center justify-center transition-all duration-150 active:scale-90 ${
                isActive 
                  ? 'text-[#E2725B] bg-[#E2725B]/10 rounded-2xl px-5 py-[6px]' 
                  : 'text-[#3E2723] opacity-40 hover:opacity-100 py-[6px]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className={`font-['Plus_Jakarta_Sans'] text-[12px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
