"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { HUBS, ACCOUNT_LINKS, isHubActive } from '@/lib/hubs';

// Barra inferior móvil. Lleva TODAS las secciones (hubs + cuenta), en el mismo
// orden que el riel y el SectionNav (fuente única: lib/hubs). La fila se
// desliza en horizontal y el botón "Más" (fijo a la derecha) abre una hoja con
// la grilla completa.
const ALL = [...HUBS, ...ACCOUNT_LINKS];
const EXTRA_ROUTES = ['/explore', '/promotions', '/login'];

export default function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const onNavRoute =
    ALL.some((i) => isHubActive(pathname, i.href)) ||
    EXTRA_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  if (!onNavRoute) return null;

  return (
    <>
      {/* Spacer para que el contenido no quede tapado por la barra fija */}
      <div className="h-[72px] w-full shrink-0 lg:hidden" aria-hidden="true" />

      <nav className="fixed bottom-0 left-0 w-full z-50 flex items-stretch bg-surface-container-lowest dark:bg-inverse-surface shadow-[0_-4px_15px_rgba(0,0,0,0.04)] rounded-t-xl border-t border-surface-container-high lg:hidden pb-safe">
        <div
          className="flex-1 flex gap-1 overflow-x-auto hide-scrollbar px-2 py-2 snap-x"
          style={{ scrollbarWidth: 'none' }}
        >
          {ALL.map((item) => {
            const isActive = isHubActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`snap-start shrink-0 min-w-[62px] flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 transition-transform duration-150 active:scale-90 ${
                  isActive
                    ? 'bg-primary-fixed text-primary dark:bg-primary-container dark:text-on-primary-container'
                    : 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container-high'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[23px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-label-md text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Ver todas las secciones"
          className="shrink-0 w-14 flex flex-col items-center justify-center gap-0.5 border-l border-surface-container-high text-secondary dark:text-secondary-fixed-dim active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-[24px]">apps</span>
          <span className="font-label-md text-[10px]">Más</span>
        </button>
      </nav>

      {/* Hoja "Todo Boga" */}
      <div
        className={`lg:hidden fixed inset-0 z-[70] transition-opacity duration-200 ${
          sheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/45" onClick={() => setSheetOpen(false)} aria-hidden="true" />
        <div
          className={`absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl pb-safe shadow-[0_-8px_28px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-out ${
            sheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="pt-3 pb-1 flex justify-center">
            <span className="w-10 h-1 rounded-full bg-surface-container-high" />
          </div>
          <div className="flex items-center justify-between px-5 pb-2">
            <h3 className="font-headline-sm font-bold text-on-surface">Todo Boga</h3>
            <button
              onClick={() => setSheetOpen(false)}
              aria-label="Cerrar"
              className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container-high active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="px-4 pb-5 grid grid-cols-3 gap-2">
            {ALL.map((item) => {
              const isActive = isHubActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors ${
                    isActive
                      ? 'bg-primary-fixed text-primary'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-[11px] leading-tight">{item.long ?? item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
