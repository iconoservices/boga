// Lo que se vende en /negocios. Un solo lugar: lo leen la landing (NegociosPlanes) y la página de
// Paquetes del superadmin (NivelesModulos), para que no se desincronicen.
//
// Modelo: todo es un MÓDULO (app, Google, Market, caja, inventario…). Un PLAN es solo un paquete que ya
// trae algunos módulos incluidos; el mismo módulo se puede comprar suelto en cualquier plan.
// Los planes siguen el eje de Alcance del admin (lib/modulos.ts): Carta → App → App + Google.
//
// PRECIOS: 'Por definir' es un marcador. Reemplazar por el monto real ('S/ 80') cuando se decida.

export const POR_DEFINIR = 'Por definir';

export type Precio = { precio: string; periodo: string; nota: string };
export type PlanId = 'carta' | 'app' | 'app_google';
export type Plan = {
  id: PlanId;
  icon: string;
  nombre: string;
  etiqueta?: string;
  pronto?: boolean;
  body: string;
  bullets: string[];
  mes: Precio;
  anio: Precio;
};

export const PLANES: Plan[] = [
  {
    id: 'carta',
    icon: 'storefront',
    nombre: 'Carta',
    body: 'Tu página de pedidos con tu propio link (bogahub.app/tu-negocio) para compartir en WhatsApp o Instagram. Tú vendes y cobras directo — BogaHub no toca tu plata.',
    bullets: [
      'Catálogo y gestión de pedidos',
      'Pedidos directo a tu WhatsApp, sin comisión',
      'Funciona en cualquier ciudad',
      'Instalable como app — incluido en el lanzamiento',
    ],
    mes: { precio: 'S/ 50', periodo: '/mes', nota: 'Precio promocional — fijo de por vida si entras ahora · luego S/ 80/mes' },
    anio: { precio: 'S/ 500', periodo: '/año', nota: 'Precio promocional · 2 meses gratis (≈ S/ 42/mes)' },
  },
  {
    id: 'app',
    icon: 'install_mobile',
    nombre: 'App',
    etiqueta: 'Recomendado',
    body: 'Todo lo de Carta y, además, tu propia dirección (tunegocio.bogahub.app) que tus clientes instalan como app en el celular.',
    bullets: [
      'Todo lo del plan Carta',
      'Subdominio propio, instalable como app',
      'Avisos a tus clientes: 2 por semana, acumulables',
    ],
    mes: { precio: 'S/ 100', periodo: '/mes', nota: 'Precio promocional de lanzamiento' },
    anio: { precio: 'S/ 1 000', periodo: '/año', nota: 'Precio promocional · 2 meses gratis (≈ S/ 83/mes)' },
  },
  {
    id: 'app_google',
    icon: 'shopping_bag',
    nombre: 'App + Google',
    pronto: true,
    body: 'Todo lo de App y, además, tus productos aparecen cuando la gente los busca en Google.',
    bullets: [
      'Todo lo del plan App',
      'Tus productos en Google',
    ],
    // Sin precio hasta que el módulo de Google exista y se defina.
    mes: { precio: 'Próximamente', periodo: '', nota: '' },
    anio: { precio: 'Próximamente', periodo: '', nota: '' },
  },
];

// Módulos que se compran sueltos encima de cualquier plan. `incluidoEn` = planes que ya lo traen.
export type ModuloVenta = {
  id: string;
  icon: string;
  nombre: string;
  body: string;
  precio: string;
  promo?: string;
  /** Planes que lo traen SIN COSTO solo por el lanzamiento (después se paga como módulo). */
  gratisEnLanzamiento?: PlanId[];
  /** Cómo se lee el precio; por defecto '/mes'. */
  unidad?: string;
  incluidoEn: PlanId[];
  pronto?: boolean;
};

export const MODULOS_VENTA: { grupo: string; items: ModuloVenta[] }[] = [
  {
    grupo: 'Llega a más gente',
    items: [
      { id: 'app', icon: 'install_mobile', nombre: 'Tu propia app', body: 'Tu dirección propia (tunegocio.bogahub.app), instalable en el celular de tus clientes, con avisos a quienes la instalan.', precio: POR_DEFINIR, promo: 'Lanzamiento: instalar tu carta como app va incluido en Carta', gratisEnLanzamiento: ['carta'], incluidoEn: ['app', 'app_google'] },
      { id: 'google', icon: 'shopping_bag', nombre: 'Tus productos en Google', body: 'Tus productos aparecen cuando la gente los busca en Google.', precio: POR_DEFINIR, incluidoEn: ['app_google'], pronto: true },
      { id: 'market', icon: 'travel_explore', nombre: 'Boga Market', body: 'Tu negocio aparece en el Market de tu ciudad, junto a otros comercios locales, frente a gente que todavía no te conoce. Solo donde BogaHub opera.', precio: POR_DEFINIR, promo: 'Lanzamiento: incluido sin costo si tu tienda cumple los requisitos', gratisEnLanzamiento: ['carta', 'app', 'app_google'], incluidoEn: [] },
    ],
  },
  {
    grupo: 'Comunícate con tus clientes',
    items: [
      { id: 'avisos', icon: 'notifications_active', nombre: 'Avisos extra', body: 'Paquete de 4 avisos a tus clientes por encima de los de tu plan. No vencen y los usas cuando quieras.', precio: 'S/ 10', unidad: ' por paquete de 4', incluidoEn: [] },
    ],
  },
  {
    grupo: 'Controla tu local',
    items: [
      { id: 'caja', icon: 'point_of_sale', nombre: 'Caja de ventas', body: 'Cobra en tu local con boleta por PDF o WhatsApp, vendedores propios y las ventas del día y del mes.', precio: POR_DEFINIR, incluidoEn: [] },
      { id: 'inventario', icon: 'inventory_2', nombre: 'Inventario', body: 'El stock se descuenta solo con cada venta y cada pedido; te avisa cuando queda poco. Va sobre la caja de ventas.', precio: POR_DEFINIR, incluidoEn: [] },
    ],
  },
];

const RANGO_PLAN: Record<PlanId, number> = { carta: 0, app: 1, app_google: 2 };
export const planIncluye = (plan: PlanId, desde: PlanId) => RANGO_PLAN[plan] >= RANGO_PLAN[desde];

// Qué incluye cada plan, en filas comparables (para la tabla del superadmin). `nuevo` marca lo que
// se sumó al admin para igualar la landing y hay que revisar. `estado` dice si hoy existe en el producto.
// `valor`: en vez del check, muestra ese texto en la columna del plan (p. ej. la cantidad de avisos).
export const CAPACIDADES_PLAN: { texto: string; desde: PlanId; estado: 'hecho' | 'falta'; nuevo?: boolean; valor?: Partial<Record<PlanId, string>> }[] = [
  { texto: 'Link propio de la tienda (bogahub.app/tu-negocio) y código QR', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Catálogo y gestión de pedidos', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Pedidos directo a tu WhatsApp, sin comisión', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Enlace y número de cada pedido, con comprobante en PDF', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Página propia por cada producto, para compartir', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Marca un producto como Agotado y deja de mostrarse', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Plantillas listas para tu rubro', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Funciona en cualquier ciudad', desde: 'carta', estado: 'hecho', nuevo: true },
  { texto: 'Subdominio propio (tunegocio.bogahub.app)', desde: 'app', estado: 'hecho', nuevo: true },
  { texto: 'App instalable en el celular de tus clientes', desde: 'carta', estado: 'hecho', nuevo: true, valor: { carta: 'Incluido en el lanzamiento' } },
  { texto: 'Avisos a tus clientes (los que no uses se acumulan en el mes)', desde: 'app', estado: 'hecho', nuevo: true, valor: { app: '2 por semana', app_google: '2 por semana' } },
  { texto: 'Productos en Google', desde: 'app_google', estado: 'falta', nuevo: true },
];

// Requisitos para entrar al Market durante el lanzamiento. Los revisa el superadmin a mano
// (el interruptor `marketplace` de la tienda); no hay validación automática.
export const REQUISITOS_MARKET: string[] = [
  'Fotos profesionales de los productos: fondo limpio, buena luz y encuadre cuadrado (1:1)',
  'Al menos 5 productos con foto y precio',
  'WhatsApp funcionando',
  'Nombre, logo y ciudad completos',
];

// Módulos pensados pero NO construidos: se venderían aparte y los prende solo el superadmin.
export const MODULOS_PROXIMOS: { nombre: string; desc: string }[] = [
  { nombre: 'Destacado en el Market', desc: 'Sale primero o con sello en /market. Es lo que justifica cobrar el Market después de la promo.' },
  { nombre: 'Coordinación de entrega', desc: 'Boga junta pedidos de varias tiendas y los reparte con choferes acreditados (Taxi Seguro). Lo activa solo el superadmin, por ahora.' },
];
