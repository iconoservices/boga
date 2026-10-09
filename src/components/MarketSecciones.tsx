'use client';

// Las tres partes del Market, como pestañas arriba de la página:
//  · Explorar  → /explore: categorías principales y tiendas destacadas
//  · Tiendas   → /market: el banner, las categorías y los recomendados (el Market de siempre)
//  · Servicios → /explore?vista=servicios: abogados, salud, gimnasios… (los negocios "serios")
// Cada una sigue siendo su propia página; esta barra solo las une.

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PESTANAS = [
  { id: 'explorar', href: '/explore', label: 'Explorar', icon: 'explore' },
  { id: 'tiendas', href: '/market', label: 'Tiendas', icon: 'storefront' },
  { id: 'servicios', href: '/explore?vista=servicios', label: 'Servicios', icon: 'handyman' },
];

function Barra() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const vista = useSearchParams().get('vista');
  const activa = pathname.startsWith('/explore') ? (vista === 'servicios' ? 'servicios' : 'explorar') : 'tiendas';

  return (
    <nav aria-label="Secciones del Market" className="max-w-[1440px] mx-auto w-full px-container-margin lg:px-6 pt-3">
      <div className="flex w-full sm:inline-flex sm:w-auto items-center gap-1 p-1 rounded-full bg-surface-container border border-surface-container-highest">
        {PESTANAS.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            onClick={(e) => {
              // Explorar y Servicios son la MISMA página (/explore) con distinto ?vista. En producción el router de Next
              // no navegaba de /explore?vista=servicios a /explore (el clic en Explorar no hacía nada), así que dentro
              // de /explore se cambia la URL directamente; Next la sincroniza con useSearchParams.
              if (p.href.startsWith('/explore') && pathname.startsWith('/explore') && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                window.history.pushState(null, '', p.href);
                return;
              }
              // Después de cambiar entre Explorar y Servicios (que cambia la URL a mano), el router de Next a veces no sigue un enlace a OTRA
              // página (Tiendas): el toque no hacía nada. Se navega con el router y, si en un instante la dirección no cambió, se entra normal.
              if (!p.href.startsWith('/explore') && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                router.push(p.href);
                window.setTimeout(() => { if (window.location.pathname !== p.href.split('?')[0]) window.location.assign(p.href); }, 700);
              }
            }}
            aria-current={activa === p.id ? 'page' : undefined}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 rounded-full text-[13px] sm:text-sm font-bold transition-colors whitespace-nowrap ${
              activa === p.id ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-on-background'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">{p.icon}</span>
            {p.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

// useSearchParams exige un Suspense a su alrededor al compilar.
export default function MarketSecciones() {
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  );
}
