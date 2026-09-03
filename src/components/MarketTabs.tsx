"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HUBS as TABS, isHubActive } from '@/lib/hubs';

// Riel de secciones pegado al borde izquierdo.
//  - Escritorio: por defecto SOLO íconos (56px, empuja el contenido). Con el
//    botón de arriba se expande a 248px con etiquetas; la preferencia se guarda.
//  - Móvil: riel flotante de íconos + panel que sale por encima al tocar el
//    botón de expandir.
// Las etiquetas descriptivas también están en SectionNav (barra del header).

const LS_KEY = 'boga_sidebar_open';

export default function MarketTabs() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);       // panel móvil
  const [deskOpen, setDeskOpen] = useState(false); // sidebar escritorio (colapsado por defecto)
  const isActive = (href: string) => isHubActive(pathname, href);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === '1') setDeskOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.sidebar = deskOpen ? 'open' : 'rail';
    return () => { delete el.dataset.sidebar; };
  }, [deskOpen]);

  const toggleDesk = () => {
    setDeskOpen((v) => {
      const nv = !v;
      try { localStorage.setItem(LS_KEY, nv ? '1' : '0'); } catch {}
      return nv;
    });
  };

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

  const row = (tab: (typeof TABS)[number], labeled: boolean, onClick?: () => void) => {
    const active = isActive(tab.href);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        onClick={onClick}
        title={tab.label}
        aria-label={tab.label}
        className={`flex items-center rounded-xl transition-colors ${
          labeled ? 'gap-3 mx-2 px-3 py-2.5' : 'justify-center w-9 h-9'
        } ${active ? 'bg-primary-fixed text-primary' : 'text-on-surface hover:bg-surface-container-high'}`}
      >
        <span className="material-symbols-outlined text-[21px] shrink-0" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
          {tab.icon}
        </span>
        {labeled && <span className="font-label-md text-[13px] truncate">{tab.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* ===== ESCRITORIO ===== */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-surface-container-lowest border-r border-surface-container-high transition-[width] duration-200 ${
          deskOpen ? 'w-[248px]' : 'w-[56px] items-center'
        }`}
      >
        <div className={`flex items-center h-16 border-b border-surface-container-high shrink-0 ${deskOpen ? 'px-4 justify-between w-full' : 'justify-center'}`}>
          {deskOpen && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <img src="/logo-mark.svg" alt="" className="w-7 h-7 shrink-0" />
              <span className="font-headline-sm text-on-surface truncate">Explora Boga</span>
            </Link>
          )}
          <button
            onClick={toggleDesk}
            aria-label={deskOpen ? 'Colapsar menú' : 'Expandir menú'}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-secondary hover:bg-surface-container-high active:scale-90 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">{deskOpen ? 'menu_open' : 'menu'}</span>
          </button>
        </div>
        <nav className={`flex-1 overflow-y-auto py-2 ${deskOpen ? '' : 'flex flex-col items-center gap-1'}`}>
          {TABS.map((tab) => row(tab, deskOpen))}
        </nav>
      </aside>

      {/* ===== MÓVIL: riel flotante ===== */}
      <div
        className={`lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-0.5 rounded-r-2xl bg-primary py-1.5 px-1 shadow-[4px_4px_16px_rgba(0,0,0,0.18)] transition-opacity duration-200 ${
          open ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} title={tab.label} aria-label={tab.label}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-white text-primary' : 'text-white/85 hover:bg-white/15'}`}>
              <span className="material-symbols-outlined text-[18px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
            </Link>
          );
        })}
        <span className="w-5 h-px bg-white/25 my-1" />
        <button onClick={() => setOpen(true)} aria-label="Expandir menú"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/15 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* ===== MÓVIL: backdrop + panel ===== */}
      <div onClick={() => setOpen(false)} aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-[55] bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <nav className={`lg:hidden fixed left-0 top-0 bottom-0 z-[60] w-[264px] max-w-[82vw] bg-surface-container-lowest shadow-[8px_0_28px_rgba(0,0,0,0.22)] flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 h-16 border-b border-surface-container-high shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="" className="w-7 h-7 shrink-0" />
            <span className="font-headline-sm text-on-surface">Explora Boga</span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
            className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container-high active:scale-90 transition-all">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {TABS.map((tab) => row(tab, true, () => setOpen(false)))}
        </div>
      </nav>
    </>
  );
}
