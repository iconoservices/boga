// Única fuente de verdad de los "hubs" del lado consumidor. La usan el menú
// del AppHeader (escritorio), el riel lateral (MarketTabs, móvil) y el panel
// expandido. Si agregas una sección nueva, va acá y aparece en los tres.
export type Hub = { href: string; label: string; icon: string };

export const HUBS: Hub[] = [
  { href: '/',            label: 'Inicio',      icon: 'home' },
  { href: '/market',      label: 'Market',      icon: 'storefront' },
  { href: '/servicios',   label: 'Servicios',   icon: 'construction' },
  { href: '/taxi-seguro', label: 'Taxi Seguro', icon: 'local_taxi' },
  { href: '/alquileres',  label: 'Alquileres',  icon: 'bed' },
  { href: '/eventos',     label: 'Eventos',     icon: 'celebration' },
  { href: '/sorteos',     label: 'Sorteos',     icon: 'confirmation_number' },
  { href: '/revista',     label: 'Revista',     icon: 'menu_book' },
];

export function isHubActive(pathname: string, href: string) {
  if (href === '/' || href === '/market') return pathname === href;
  return pathname.startsWith(href);
}
