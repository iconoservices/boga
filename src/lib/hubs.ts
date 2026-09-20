// Única fuente de verdad de los "hubs" del lado consumidor. La usan el menú
// del AppHeader / SectionNav (escritorio), el riel lateral (MarketTabs, móvil)
// y la barra inferior móvil (BottomNav). Si agregas una sección nueva, va acá
// y aparece en todas — y en el mismo orden.
export type Hub = { href: string; label: string; long?: string; icon: string; apart?: boolean };

export const HUBS: Hub[] = [
  { href: '/',            label: 'Inicio',      icon: 'home' },
  { href: '/market',      label: 'Market',      icon: 'storefront' },
  { href: '/eventos',     label: 'Agenda',      long: 'Agenda & Eventos', icon: 'celebration' },
  { href: '/inmuebles',   label: 'Inmuebles',   icon: 'real_estate_agent' },
  { href: '/trabajos',    label: 'Trabajos',    long: 'Trabajos & Oficios', icon: 'construction' },
  { href: '/pension',     label: 'Pensión',     long: 'Pensión de almuerzos', icon: 'lunch_dining' },
  { href: '/taxi-seguro', label: 'Taxi Seguro', icon: 'local_taxi' },
  { href: '/viajes',      label: 'Viajes',      long: 'Viajes & Transporte', icon: 'directions_boat' },
  { href: '/sorteos',     label: 'Sorteos',     icon: 'confirmation_number' },
  { href: '/pandero',     label: 'Pandero',     long: 'Pandero · ahorro en grupo', icon: 'savings' },
  { href: '/revista',     label: 'Revista',     long: 'Yo Soy de la Selva', icon: 'menu_book' },
  { href: '/negocios',    label: 'Negocios',    long: 'Para Negocios', icon: 'work', apart: true },
];

// Accesos de cuenta — acompañan a los hubs en la barra inferior móvil.
// Hoy vacío: el perfil vive arriba (cabecera) y "Mis pedidos" dentro del perfil.
export const ACCOUNT_LINKS: Hub[] = [];

export function isHubActive(pathname: string, href: string) {
  if (href === '/' || href === '/market') return pathname === href;
  return pathname.startsWith(href);
}
