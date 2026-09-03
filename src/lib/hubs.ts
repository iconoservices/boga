// Única fuente de verdad de los "hubs" del lado consumidor. La usan el menú
// del AppHeader / SectionNav (escritorio), el riel lateral (MarketTabs, móvil)
// y la barra inferior móvil (BottomNav). Si agregas una sección nueva, va acá
// y aparece en todas — y en el mismo orden.
export type Hub = { href: string; label: string; long?: string; icon: string; apart?: boolean };

export const HUBS: Hub[] = [
  { href: '/',            label: 'Inicio',      icon: 'home' },
  { href: '/market',      label: 'Market',      icon: 'storefront' },
  { href: '/servicios',   label: 'Servicios',   long: 'Servicios & Chamba', icon: 'construction' },
  { href: '/taxi-seguro', label: 'Taxi Seguro', icon: 'local_taxi' },
  { href: '/alquileres',  label: 'Alquileres',  icon: 'bed' },
  { href: '/eventos',     label: 'Eventos',     long: 'Eventos & Agenda', icon: 'celebration' },
  { href: '/sorteos',     label: 'Sorteos',     icon: 'confirmation_number' },
  { href: '/revista',     label: 'Revista',     long: 'Yo Soy de la Selva', icon: 'menu_book' },
  { href: '/negocios',    label: 'Negocios',    long: 'Para Negocios', icon: 'work', apart: true },
];

// Accesos de cuenta — acompañan a los hubs en la barra inferior móvil.
export const ACCOUNT_LINKS: Hub[] = [
  { href: '/orders',  label: 'Pedidos', icon: 'receipt_long' },
  { href: '/profile', label: 'Perfil',  icon: 'person' },
];

export function isHubActive(pathname: string, href: string) {
  if (href === '/' || href === '/market') return pathname === href;
  return pathname.startsWith(href);
}
