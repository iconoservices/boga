"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HUBS, isHubActive } from '@/lib/hubs';

// Barra de secciones horizontal — va debajo del header, a todo el ancho.
// Mismo orden que el riel y la barra inferior (fuente única: lib/hubs). Usa las
// etiquetas largas cuando existen ("Servicios & Chamba", "Para Negocios"…).

export default function SectionNav() {
  const pathname = usePathname();
  const active = (href: string) => isHubActive(pathname, href);

  return (
    <nav data-section-nav className="border-t border-surface-container-high bg-surface">
      <div className="max-w-[1440px] mx-auto flex items-stretch gap-0.5 overflow-x-auto hide-scrollbar px-container-margin lg:px-6" style={{ scrollbarWidth: 'none' }}>
        {HUBS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 px-3 py-2.5 font-headline-sm font-bold text-sm lg:text-[15px] tracking-tight whitespace-nowrap relative transition-colors ${
              l.apart ? 'ml-auto' : ''
            } ${active(l.href) ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
          >
            {l.long ?? l.label}
            {active(l.href) && (
              <span className="absolute left-3 right-3 -bottom-px h-[3px] bg-primary rounded-full" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
