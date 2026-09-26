// Única fuente de verdad de los "hubs" del lado consumidor. La usan el menú
// del AppHeader / SectionNav (escritorio), el riel lateral (MarketTabs, móvil)
// y la barra inferior móvil (BottomNav). Si agregas una sección nueva, va acá
// y aparece en todas — y en el mismo orden.
export type Hub = { href: string; label: string; long?: string; icon: string; apart?: boolean };

// Explorar y "Tiendas y servicios" son pestañas DENTRO del Market (components/MarketSecciones.tsx), no ítems del menú.
export const HUBS: Hub[] = [
  { href: '/',            label: 'Inicio',      icon: 'home' },
  { href: '/explore',     label: 'Market',      icon: 'storefront' },
  { href: '/eventos',     label: 'Agenda',      long: 'Agenda & Eventos', icon: 'celebration' },
  { href: '/inmuebles',   label: 'Inmuebles',   icon: 'real_estate_agent' },
  { href: '/sorteos',     label: 'Sorteos',     icon: 'confirmation_number' },
  { href: '/productos',   label: 'Productos',   icon: 'inventory_2' },
  { href: '/trabajos',    label: 'Trabajos',    long: 'Trabajos & Oficios', icon: 'construction' },
  { href: '/viajes',      label: 'Viajes',      long: 'Viajes & Transporte', icon: 'directions_boat' },
  { href: '/transporte', label: 'Taxi Seguro', icon: 'local_taxi' },
  { href: '/revista',     label: 'Revista',     long: 'Yo Soy de la Selva', icon: 'menu_book' },
  { href: '/negocios',    label: 'Negocios',    long: 'Para Negocios', icon: 'work', apart: true },
];

// Accesos de cuenta — acompañan a los hubs en la barra inferior móvil.
// Hoy vacío: el perfil vive arriba (cabecera) y "Mis pedidos" dentro del perfil.
export const ACCOUNT_LINKS: Hub[] = [];

// La Pensión de almuerzos ya no es un hub del menú: vive dentro de Market (chip en
// /market), así que estando en /pension el ítem "Market" sigue resaltado.
export function isHubActive(pathname: string, href: string) {
  // Market también queda resaltado en sus pestañas internas (Tiendas, Servicios) y en la Pensión.
  if (href === '/explore') return pathname.startsWith('/explore') || pathname.startsWith('/market') || pathname.startsWith('/pension');
  if (href === '/') return pathname === href;
  return pathname.startsWith(href);
}
