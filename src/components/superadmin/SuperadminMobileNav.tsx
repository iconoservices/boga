'use client';

// Navegación del superadmin en el celular. El sidebar (md+) se esconde en
// pantallas chicas, así que acá va una barra inferior con el mismo formato que
// la de la app pública: fila que se desliza + botón "Más" con todas las
// secciones. Usa los colores del propio superadmin (azul #2170e4).

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { NAV_TABS, SUBRUTAS } from './SuperadminSidebarNav';

type Item = { key: string; href: string; icon: string; label: string; activo: boolean };

function Inner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [abierto, setAbierto] = useState(false);
  const activoRef = useRef<HTMLAnchorElement>(null);

  const enDashboard = pathname === '/superadmin';
  const tab = searchParams.get('tab') ?? 'tiendas';

  const items: Item[] = [
    ...NAV_TABS.map((n) => ({ key: `t-${n.id}`, href: `/superadmin?tab=${n.id}`, icon: n.icon, label: n.label, activo: enDashboard && tab === n.id })),
    ...SUBRUTAS.map((s) => ({ key: s.href, href: s.href, icon: s.icon, label: s.label, activo: pathname.startsWith(s.href) })),
  ];

  // Centrar la pestaña activa al cambiar de sección.
  useEffect(() => {
    activoRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [pathname, tab]);

  useEffect(() => {
    if (!abierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex items-stretch bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.06)] rounded-t-xl border-t border-[#c2c6d6] pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="flex-1 flex gap-1 overflow-x-auto px-3 py-2 snap-x scroll-pl-3" style={{ scrollbarWidth: 'none' }}>
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              ref={it.activo ? activoRef : undefined}
              className={`snap-start shrink-0 min-w-[64px] flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 transition-transform duration-150 active:scale-90 ${
                it.activo ? 'bg-[#2170e4] text-white shadow-sm' : 'text-[#424754]/70 hover:bg-[#e6e7f2]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]" style={it.activo ? { fontVariationSettings: "'FILL' 1" } : {}}>{it.icon}</span>
              <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">{it.label}</span>
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Ver todas las secciones"
          className="shrink-0 w-14 flex flex-col items-center justify-center gap-0.5 border-l border-[#c2c6d6] text-[#424754]/70 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-[24px]">apps</span>
          <span className="text-[10px] font-semibold">Más</span>
        </button>
      </nav>

      {/* Hoja con todas las secciones */}
      <div className={`md:hidden fixed inset-0 z-[70] transition-opacity duration-200 ${abierto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/45" onClick={() => setAbierto(false)} aria-hidden="true" />
        <div className={`absolute bottom-0 left-0 right-0 bg-[#f9f9ff] rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-out max-h-[85dvh] overflow-y-auto ${abierto ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="pt-3 pb-1 flex justify-center"><span className="w-10 h-1 rounded-full bg-[#c2c6d6]" /></div>
          <div className="flex items-center justify-between px-5 pb-2">
            <h3 className="font-bold text-[#0058be]">Boga Admin</h3>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full text-[#424754] hover:bg-[#e6e7f2] active:scale-90 transition-all">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 pb-2">
            {items.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                onClick={() => setAbierto(false)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-center transition-transform active:scale-95 ${
                  it.activo ? 'bg-[#2170e4] text-white' : 'bg-white border border-[#c2c6d6] text-[#424754]'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]" style={it.activo ? { fontVariationSettings: "'FILL' 1" } : {}}>{it.icon}</span>
                <span className="text-[11px] font-semibold leading-tight">{it.label}</span>
              </Link>
            ))}
            <Link href="/" onClick={() => setAbierto(false)} className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-center bg-white border border-[#c2c6d6] text-[#424754] active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[24px]">home</span>
              <span className="text-[11px] font-semibold leading-tight">Ir a BogaHub</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SuperadminMobileNav() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
