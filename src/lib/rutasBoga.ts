// Rutas de primer nivel que son de BogaHub (no son tiendas). Cualquier otra ruta
// /<algo> es la página de una tienda. Al agregar un hub o sección nueva, súmala
// acá: la usan proxy.ts (direcciones de tiendas) y el botón del chat (que no debe
// verse dentro de una tienda).
export const RUTAS_DE_BOGAHUB = new Set([
  'admin', 'apple-icon.png', 'eventos', 'explore', 'guia', 'inmuebles', 'legal', 'libro-de-reclamaciones',
  'login', 'market', 'mostrador', 'productos', 'negocios', 'offline', 'orders', 'org', 'pandero', 'pension', 'preview', 'profile',
  'promotions', 'reset-password', 'revista', 'sorteos', 'superadmin', 'taxi-seguro', 'transporte', 'trabajos', 'vende-con-boga',
  'viajes', 'servicios', 'trabajo', 'empleos', 'alquileres', 'product', 'pedido',
]);
