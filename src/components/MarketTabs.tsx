"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Conmutador entre todos los "hubs" del lado consumidor. Riel de íconos pegado
// al borde izquierdo (queda fuera del flujo, no empuja el contenido); el botón
// de abajo lo expande al panel con etiquetas.
const TABS = [
  { href: '/inicio',      label: 'Inicio',       icon: 'home' },
  { href: '/market',      label: 'Market',       icon: 'storefront' },
  { href: '/yapu',        label: 'Yapu',         icon: 'handshake' },
  { href: '/taxi-seguro', label: 'Taxi Seguro',  icon: 'local_taxi' },
  { href: '/alquileres',  label: 'Alquileres',   icon: 'bed' },
  { href: '/eventos',     label: 'Eventos',      icon: 'celebration' },
  { href: '/sorteos',     label: 'Sorteos',      icon: 'confirmation_number' },
  { href: '/revista',     label: 'Revista',      icon: 'menu_book' },
];

export default function MarketTabs() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  // Cerrar con Escape y bloquear scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Riel de íconos flotante en el borde izquierdo (estado cerrado) */}
      <div
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center rounded-r-2xl bg-primary py-1.5 px-1 shadow-[4px_4px_16px_rgba(0,0,0,0.18)] transition-opacity duration-200 ${
          open ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              aria-label={tab.label}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                active ? 'bg-white text-primary' : 'text-white/85 hover:bg-white/15'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {tab.icon}
              </span>
            </Link>
          );
        })}
        <span className="w-5 h-px bg-white/25 my-1" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú de secciones"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/15 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[55] bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Panel deslizante */}
      <nav
        className={`fixed left-0 top-0 bottom-0 z-[60] w-[264px] max-w-[82vw] bg-surface-container-lowest shadow-[8px_0_28px_rgba(0,0,0,0.22)] flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-surface-container-high shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs">B</span>
            </div>
            <span className="font-headline-sm text-on-surface">Explora Boga</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container-high active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 mx-2 px-3 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-primary-fixed text-primary'
                    : 'text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
                <span className="font-label-md text-[13px]">{tab.label}</span>
                {active && (
                  <span className="material-symbols-outlined text-[18px] ml-auto">chevron_right</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
