'use client';

// Las tres partes del Market, como pestañas arriba de la página + buscador en la misma fila:
//  · Explorar  → /explore: categorías principales y tiendas destacadas
//  · Tiendas   → /market: el banner, las categorías y los recomendados (el Market de siempre)
//  · Servicios → /explore?vista=servicios: abogados, salud, gimnasios… (los negocios "serios")
// Cada una sigue siendo su propia página; esta barra las une y agrega el buscador del Market al costado.

import { Suspense, useState, useEffect } from 'react';
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
  const searchParams = useSearchParams();
  const vista = searchParams.get('vista');
  const qParam = searchParams.get('q') || '';
  const [texto, setTexto] = useState(qParam);

  useEffect(() => {
    setTexto(qParam);
  }, [qParam]);

  const activa = pathname.startsWith('/explore') ? (vista === 'servicios' ? 'servicios' : 'explorar') : 'tiendas';

  const manejarBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    const query = texto.trim();
    if (query) {
      router.push(`/explore?q=${encodeURIComponent(query)}`);
    } else {
      router.push(vista ? `/explore?vista=${vista}` : '/explore');
    }
  };

  const limpiar = () => {
    setTexto('');
    if (qParam) {
      router.push(vista ? `/explore?vista=${vista}` : '/explore');
    }
  };

  return (
    <nav aria-label="Secciones del Market" className="max-w-[1440px] mx-auto w-full px-container-margin lg:px-6 pt-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pestañas: Explorar | Tiendas | Servicios */}
        <div className="flex w-full sm:inline-flex sm:w-auto items-center gap-1 p-1 rounded-full bg-surface-container border border-surface-container-highest shrink-0">
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
              className={`flex flex-1 sm:flex-none items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-full text-[13px] sm:text-sm font-bold transition-colors whitespace-nowrap ${
                activa === p.id ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-on-background'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">{p.icon}</span>
              {p.label}
            </Link>
          ))}
        </div>

        {/* Buscador de Market al costado */}
        <form onSubmit={manejarBuscar} className="relative flex-1 max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-secondary/70 text-[20px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={texto}
              onChange={(e) => {
                const val = e.target.value;
                setTexto(val);
                if (!val && qParam) {
                  router.push(vista ? `/explore?vista=${vista}` : '/explore');
                }
              }}
              placeholder="Buscar productos, tiendas o servicios…"
              className="w-full h-10 pl-10 pr-9 rounded-full bg-surface-container-low border border-surface-container-highest text-sm text-on-surface placeholder:text-secondary/70 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            {texto ? (
              <button
                type="button"
                onClick={limpiar}
                className="absolute right-2.5 p-1 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
                title="Limpiar búsqueda"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            ) : null}
          </div>
        </form>
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
