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
] as const;

export const SUBRUTAS = [
  { href: '/superadmin/metricas',       icon: 'monitoring',   label: 'Clientes WhatsApp' },
  { href: '/superadmin/choferes',       icon: 'local_taxi',   label: 'Choferes' },
  { href: '/superadmin/cobros',         icon: 'payments',     label: 'Cobros' },
  { href: '/superadmin/banners',        icon: 'view_carousel', label: 'Banners de portada' },
  { href: '/superadmin/plantillas',     icon: 'layers',       label: 'Plantillas' },
  { href: '/superadmin/usuarios',       icon: 'group',        label: 'Usuarios' },
  { href: '/superadmin/paquetes',       icon: 'inventory_2',  label: 'Paquetes' },
  { href: '/superadmin/revista',        icon: 'menu_book',    label: 'Revista' },
  { href: '/superadmin/editorial',      icon: 'campaign',     label: 'Estrategia Editorial' },
  { href: '/superadmin/notas',          icon: 'sticky_note_2',label: 'Notas internas' },
  { href: '/superadmin/alquileres',     icon: 'real_estate_agent', label: 'Inmuebles' },
  { href: '/superadmin/sorteos',        icon: 'casino', label: 'Sorteos' },
  { href: '/superadmin/notificaciones', icon: 'notifications', label: 'Notificaciones' },
  { href: '/superadmin/viajes',         icon: 'directions_boat', label: 'Viajes y Transportes' },
  { href: '/superadmin/chamba',         icon: 'construction', label: 'Trabajos y oficios' },
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
    <span className="text-[10px] text-[#424754]/40 font-mono tracking-widest uppercase">Pucallpa</span>
  </Link>
);

function SidebarNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enDashboard = pathname === '/superadmin';
  const tabActual = enDashboard ? (searchParams.get('tab') || 'tiendas') : null;

  return (
    <aside className="w-64 bg-[#f2f3fd] border-r border-[#c2c6d6]/40 p-4 shrink-0 hidden md:block select-none overflow-y-auto max-h-screen sticky top-0">
      <Logo />
      <nav className="space-y-1">
        {NAV_TABS.map((t) => {
          const isActive = enDashboard && tabActual === t.id;
          return (
            <Link key={t.id} href={`/superadmin?tab=${t.id}`} className={itemClass(isActive)}>
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}

        <div className="pt-3 pb-1 px-4 text-[10px] font-mono uppercase tracking-widest text-[#424754]/40">
          Módulos
        </div>

        {SUBRUTAS.map((r) => {
          const isActive = pathname.startsWith(r.href);
          return (
            <Link key={r.href} href={r.href} className={itemClass(isActive)}>
              <span className="material-symbols-outlined text-[20px]">{r.icon}</span>
              <span>{r.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function SuperadminSidebarNav() {
  return (
    <Suspense fallback={
      <aside className="w-64 bg-[#f2f3fd] border-r border-[#c2c6d6]/40 p-4 shrink-0 hidden md:block">
        <Logo />
      </aside>
    }>
      <SidebarNavContent />
    </Suspense>
  );
}
