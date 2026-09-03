"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Barra de secciones horizontal — va debajo del header, a todo el ancho.
// Etiquetas más descriptivas que el sidebar/riel (que usan nombres cortos).
const LINKS = [
  { href: '/',            label: 'Inicio' },
  { href: '/market',      label: 'Market' },
  { href: '/servicios',   label: 'Servicios & Chamba' },
  { href: '/taxi-seguro', label: 'Taxi Seguro' },
  { href: '/alquileres',  label: 'Alquileres' },
  { href: '/eventos',     label: 'Eventos & Agenda' },
  { href: '/sorteos',     label: 'Sorteos' },
  { href: '/revista',     label: 'Yo Soy de la Selva' },
  { href: '/negocios',    label: 'Para Negocios', apart: true },
];

export default function SectionNav() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="border-t border-surface-container-high bg-surface">
      <div className="max-w-[1440px] mx-auto flex items-stretch gap-0.5 overflow-x-auto hide-scrollbar px-container-margin lg:px-6" style={{ scrollbarWidth: 'none' }}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 px-3 py-2.5 font-headline-sm font-bold text-sm lg:text-[15px] tracking-tight whitespace-nowrap relative transition-colors ${
              l.apart ? 'ml-auto' : ''
            } ${active(l.href) ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
          >
            {l.label}
            {active(l.href) && (
              <span className="absolute left-3 right-3 -bottom-px h-[3px] bg-primary rounded-full" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
