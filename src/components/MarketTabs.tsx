"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Conmutador entre los tres "hubs" del lado consumidor: el Marketplace de
// compras, el tablero local de chamba/servicios (Yapu) y el directorio de
// movilidad verificada (Taxi Seguro). Se muestra arriba de cada uno para que
// se sienta una sola app con pestañas y no tres cosas sueltas.
const TABS = [
  { href: '/market',      label: 'Market',       icon: 'storefront' },
  { href: '/yapu',        label: 'Yapu',         icon: 'handshake' },
  { href: '/taxi-seguro', label: 'Taxi Seguro',  icon: 'local_taxi' },
];

export default function MarketTabs() {
  const pathname = usePathname();

  return (
    <div className="max-w-[1440px] mx-auto w-full px-container-margin lg:px-6 pt-3">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((tab) => {
          const isActive = tab.href === '/market'
            ? pathname === '/market'
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                isActive
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
