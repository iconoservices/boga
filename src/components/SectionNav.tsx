"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HUBS, isHubActive, type Hub } from '@/lib/hubs';

// Barra de secciones horizontal — va debajo del header, a todo el ancho.
// Mismo orden que el riel y la barra inferior (fuente única: lib/hubs). Usa las
// etiquetas largas cuando existen ("Servicios & Chamba", "Para Negocios"…).
//
// Los hubs con `apart` (hoy solo "Para Negocios") van pegados al lado derecho:
// en escritorio quedan FIJOS ahí (fuera del scroll), en móvil scrollean al
// final como los demás.

const apartHubs = HUBS.filter((h) => h.apart);

export default function SectionNav() {
  const pathname = usePathname();
  const active = (href: string) => isHubActive(pathname, href);

  const item = (l: Hub, extra = '') => (
    <Link
      key={l.href}
      href={l.href}
      className={`shrink-0 px-3 py-2.5 font-headline-sm font-bold text-sm lg:text-[15px] tracking-tight whitespace-nowrap relative transition-colors ${extra} ${
        active(l.href) ? 'text-primary' : 'text-on-surface hover:text-primary'
      }`}
    >
      {l.long ?? l.label}
      {active(l.href) && (
        <span className="absolute left-3 right-3 -bottom-px h-[3px] bg-primary rounded-full" />
      )}
    </Link>
  );

  return (
    <nav data-section-nav className="border-t border-surface-container-high bg-surface">
      <div className="max-w-[1440px] mx-auto flex items-stretch px-container-margin lg:px-6">
        {/* Lista scrolleable */}
        <div
          className="flex items-stretch gap-0.5 overflow-x-auto hide-scrollbar flex-1 min-w-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {HUBS.map((l) => item(l, l.apart ? 'lg:hidden' : ''))}
        </div>

        {/* Hubs "apart" fijados a la derecha (solo escritorio) */}
        {apartHubs.length > 0 && (
          <div className="hidden lg:flex items-stretch shrink-0 pl-1 ml-1 border-l border-surface-container-high bg-surface">
            {apartHubs.map((l) => item(l))}
          </div>
        )}
      </div>
    </nav>
  );
}
