"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HUBS as TABS, isHubActive } from '@/lib/hubs';

// Riel de secciones pegado al borde izquierdo (solo escritorio). Por defecto
// SOLO íconos (56px, empuja el contenido); con el botón de arriba se expande
// a 248px con etiquetas, y la preferencia se guarda. En móvil la navegación
// vive en BottomNav.
// Las etiquetas descriptivas también están en SectionNav (barra del header).
//
// Vive una sola vez en el layout raíz (como BottomNav) y se auto-oculta según
// la ruta — antes cada página lo declaraba por su cuenta, así que al navegar
// entre ellas se desmontaba y volvía a montar, y el efecto que fija el ancho
// del body (abajo) se apagaba y prendía de golpe: se veía como si la barra
// "se cerrara y volviera a abrir" en cada cambio de pestaña.
const LS_KEY = 'boga_sidebar_open';
const SIDEBAR_ROUTES = ['/market', '/servicios', '/taxi-seguro', '/alquileres', '/eventos', '/sorteos', '/revista', '/guia'];

export default function MarketTabs() {
  const pathname = usePathname();
  // Arranca colapsado (56px), igual que lo que renderiza el servidor — la
  // preferencia guardada (si el usuario lo dejó expandido) recién se aplica
  // en el efecto de abajo. Iniciarlo ya expandido en el cliente rompe la
  // hidratación: el <aside> tendría hijos distintos (el link "Explora Boga",
  // las etiquetas de texto) a los del HTML que mandó el servidor.
  const [deskOpen, setDeskOpen] = useState(false);
  const isActive = (href: string) => isHubActive(pathname, href);
  const showSidebar = pathname === '/' || SIDEBAR_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === '1') setDeskOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (!showSidebar) {
      delete el.dataset.sidebar;
      return;
    }
    el.dataset.sidebar = deskOpen ? 'open' : 'rail';
    return () => { delete el.dataset.sidebar; };
  }, [deskOpen, showSidebar]);

  const toggleDesk = () => {
    setDeskOpen((v) => {
      const nv = !v;
      try { localStorage.setItem(LS_KEY, nv ? '1' : '0'); } catch {}
      return nv;
    });
  };

  if (!showSidebar) return null;

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
  );
}
