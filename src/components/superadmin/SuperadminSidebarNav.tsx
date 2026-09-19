'use client';

// Logo + navegación del sidebar de /superadmin, compartida entre el
// dashboard (page.tsx, pestañas por query param ?tab=) y las subrutas
// (Choferes, Alquileres, etc. — cada una es su propia página, resaltada por
// pathname). Es independiente del estado interno del dashboard: no rompe
// nada porque ese estado (activeTab, handlers de "Nuevo Paquete"...) se
// queda donde estaba, en page.tsx.

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export const NAV_TABS = [
  { id: 'tiendas',         icon: 'storefront',    label: 'Tiendas' },
  { id: 'paquetes',        icon: 'inventory_2',   label: 'Paquetes' },
  { id: 'usuarios',        icon: 'group',         label: 'Usuarios' },
  { id: 'personalizacion', icon: 'tune',          label: 'Personalización' },
] as const;

export const SUBRUTAS = [
  { href: '/superadmin/plantillas',     icon: 'layers',       label: 'Plantillas' },
  { href: '/superadmin/revista',        icon: 'menu_book',    label: 'Revista' },
  { href: '/superadmin/notas',          icon: 'sticky_note_2',label: 'Notas internas' },
  { href: '/superadmin/choferes',       icon: 'local_taxi',   label: 'Choferes' },
  { href: '/superadmin/alquileres',     icon: 'real_estate_agent', label: 'Inmuebles' },
  { href: '/superadmin/viajes',         icon: 'directions_boat', label: 'Viajes y Transportes' },
  { href: '/superadmin/eventos',        icon: 'celebration',  label: 'Eventos' },
  { href: '/superadmin/organizadores',  icon: 'nightlife',    label: 'Organizadores' },
  { href: '/superadmin/modulos',        icon: 'extension',    label: 'Módulos y Estrategia' },
  { href: '/superadmin/mapa',           icon: 'account_tree', label: 'Mapa de Apps' },
  { href: '/superadmin/facturacion',    icon: 'payments',     label: 'Facturación' },
  { href: '/superadmin/reclamaciones',  icon: 'menu_book',    label: 'Reclamaciones' },
  { href: '/superadmin/legal',          icon: 'gavel',        label: 'Legal' },
];

const itemClass = (isActive: boolean) => `flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-md transition-all ${
  isActive
    ? 'bg-[#2170e4] text-[#fefcff] shadow-[0_4px_12px_-2px_rgba(33,112,228,0.2)] font-bold'
    : 'text-[#424754]/60 hover:bg-[#e6e7f2] hover:text-[#424754]'
}`;

const Logo = () => (
  <Link href="/superadmin" className="mb-6 px-2 py-1 block">
    <h1 className="text-xl font-bold tracking-tight text-[#0058be]">Boga Admin</h1>
    <p className="text-[#424754] text-xs font-semibold opacity-70">Feature Control</p>
  </Link>
);

// useSearchParams suspende en render de servidor (no hay query params en
// build time) — la separamos en su propio componente para que el Suspense
// de acá abajo alcance, y quien use <SuperadminSidebarNav /> no tenga que
// envolverlo él mismo en cada subruta.
function SidebarNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onDashboard = pathname === '/superadmin';
  const dashboardTab = searchParams.get('tab') ?? 'tiendas';

  return (
    <>
      <Logo />
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {NAV_TABS.map((n) => (
          <Link
            key={n.id}
            href={`/superadmin?tab=${n.id}`}
            className={itemClass(onDashboard && dashboardTab === n.id)}
          >
            <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        <div className="my-2 border-t border-[#c2c6d6]" />
        {SUBRUTAS.map((s) => (
          <Link key={s.href} href={s.href} className={itemClass(pathname.startsWith(s.href))}>
            <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            {s.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function SuperadminSidebarNav() {
  return (
    <Suspense
      fallback={
        <>
          <Logo />
          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto" />
        </>
      }
    >
      <SidebarNavInner />
    </Suspense>
  );
}
