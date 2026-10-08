// Cada pestaña del panel tiene su propia dirección (/admin/pedidos, /admin/vender…): se puede guardar en
// favoritos, abrir en una pestaña del navegador y el botón "atrás" funciona entre secciones.
export type TabAdmin = 'inicio' | 'products' | 'categories' | 'orders' | 'pos' | 'metrics' | 'stores';

export const RUTA_DE_TAB: Record<TabAdmin, string> = {
  inicio: '/admin',
  products: '/admin/productos',
  categories: '/admin/categorias',
  orders: '/admin/pedidos',
  pos: '/admin/vender',
  metrics: '/admin/metricas',
  stores: '/admin/tiendas',
};

export const TAB_DE_RUTA: Record<string, TabAdmin> = Object.fromEntries(
  Object.entries(RUTA_DE_TAB).map(([tab, ruta]) => [ruta, tab as TabAdmin]),
);

export const SEGMENTOS_TAB = Object.values(RUTA_DE_TAB).filter((r) => r !== '/admin').map((r) => r.replace('/admin/', ''));
