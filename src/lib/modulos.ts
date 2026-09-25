// Módulos que el superadmin prende o apaga por tienda (columna `stores.modulos`, jsonb).
//
// Un solo lugar: lo usan el admin del comercio (qué pestañas y secciones muestra),
// el editor de tienda del superadmin (los interruptores) y la página de Paquetes
// (la tabla de niveles). Si se agrega un módulo, se agrega acá y en NIVELES.

export type ModuloId = 'pos' | 'inventario' | 'google';
export type Modulos = Partial<Record<ModuloId, boolean>>;

export const MODULOS: { id: ModuloId; label: string; icon: string; desc: string }[] = [
  {
    id: 'pos',
    label: 'Ventas en el local (POS)',
    icon: 'point_of_sale',
    desc: 'Caja rápida con boleta, vendedores propios y ventas en las métricas.',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: 'inventory_2',
    desc: 'Stock que se descuenta solo con cada venta del POS, "Agotado" automático y aviso de poco stock.',
  },
  {
    id: 'google',
    label: 'Productos en Google (Merchant Center)',
    icon: 'shopping_bag',
    desc: 'Los productos de esta tienda salen en el feed de Google (/api/google-feed). Solo entran las tiendas con esto prendido.',
  },
];

// Stock a partir del cual un producto se marca "poco stock".
export const STOCK_BAJO = 5;

// `null`/`undefined` = tienda anterior a los módulos (o la migración todavía no corrió):
// se deja todo prendido para no quitarle nada a quien ya lo usa.
// (El feed de Google no usa esto: ahí solo entra quien lo tenga en true de forma explícita.)
export function moduloActivo(modulos: Modulos | null | undefined, id: ModuloId): boolean {
  if (modulos == null || typeof modulos !== 'object') return true;
  return modulos[id] === true;
}

// Los niveles que se le venden al comercio, en dos ejes que se combinan. Se muestran en Paquetes
// del superadmin para compararlos.
//
//  · ALCANCE (a cuánta gente llega): Carta → App → App + Google.
//    Sale de subdominio_activo y modulos.google de la tienda.
//  · OPERACIÓN (qué controla el dueño en su local): sin caja → Ventas → Ventas + Inventario.
//    Sale de modulos.pos y modulos.inventario.

// ─── Alcance ───
export type AlcanceId = 'carta' | 'app' | 'app_google';

export const ALCANCES: { id: AlcanceId; nombre: string; resumen: string }[] = [
  { id: 'carta', nombre: 'Carta', resumen: 'La carta web con botón de WhatsApp. Nivel base.' },
  { id: 'app', nombre: 'App', resumen: 'Suma su propia dirección (subdominio) para instalar y compartir, y avisos a sus clientes.' },
  { id: 'app_google', nombre: 'App + Google', resumen: 'Suma que sus productos salgan en Google.' },
];

export const CAPACIDADES_ALCANCE: { texto: string; desde: AlcanceId }[] = [
  { texto: 'Carta digital con link y QR', desde: 'carta' },
  { texto: 'Pedidos por WhatsApp', desde: 'carta' },
  { texto: 'Activar o marcar Agotado cada producto (el agotado no se muestra en la carta)', desde: 'carta' },
  { texto: 'Botón para instalar la carta como app (en la dirección de Boga)', desde: 'carta' },
  { texto: 'Subdominio propio (tienda.bogahub.app) con su app instalable', desde: 'app' },
  { texto: 'Avisos push propios a quienes instalaron su app (1 campaña por semana)', desde: 'app' },
  { texto: 'Productos en Google (Merchant Center)', desde: 'app_google' },
];

const RANGO_ALCANCE: Record<AlcanceId, number> = { carta: 0, app: 1, app_google: 2 };
export const alcanceIncluye = (nivel: AlcanceId, desde: AlcanceId) => RANGO_ALCANCE[nivel] >= RANGO_ALCANCE[desde];

/** En qué nivel de alcance está una tienda. */
export function nivelAlcance(t: { modulos?: Modulos | null; subdominio_activo?: boolean | null }): AlcanceId {
  if (t.modulos?.google === true) return 'app_google';
  if (t.subdominio_activo) return 'app';
  return 'carta';
}

// ─── Operación ───
export type OperacionId = 'sin_caja' | 'ventas' | 'inventario';

export const OPERACIONES: { id: OperacionId; nombre: string; resumen: string }[] = [
  { id: 'sin_caja', nombre: 'Sin caja', resumen: 'Solo carta: sin POS ni control de stock.' },
  { id: 'ventas', nombre: 'Ventas', resumen: 'Suma la caja del local para cobrar y llevar el registro.' },
  { id: 'inventario', nombre: 'Ventas + Inventario', resumen: 'Suma el control de stock automático.' },
];

export const CAPACIDADES_OPERACION: { texto: string; desde: OperacionId }[] = [
  { texto: 'Caja rápida (POS) con boleta en PDF y por WhatsApp', desde: 'ventas' },
  { texto: 'Vendedores propios de cada negocio', desde: 'ventas' },
  { texto: 'Pedidos y métricas de ventas del local', desde: 'ventas' },
  { texto: 'Stock que se descuenta solo con cada venta del POS', desde: 'inventario' },
  { texto: 'Producto pasa a Agotado solo al llegar a 0', desde: 'inventario' },
  { texto: 'El POS no deja vender más de lo que hay', desde: 'inventario' },
  { texto: 'Aviso de poco stock (5 unidades o menos)', desde: 'inventario' },
  { texto: 'Botón para ingresar mercadería', desde: 'inventario' },
];

const RANGO_OPERACION: Record<OperacionId, number> = { sin_caja: 0, ventas: 1, inventario: 2 };
export const operacionIncluye = (nivel: OperacionId, desde: OperacionId) => RANGO_OPERACION[nivel] >= RANGO_OPERACION[desde];

/** En qué nivel de operación está una tienda según sus módulos. `null` = anterior a los módulos (todo prendido, sin clasificar). */
export function nivelOperacion(modulos: Modulos | null | undefined): OperacionId | 'sin-clasificar' {
  if (modulos == null || typeof modulos !== 'object') return 'sin-clasificar';
  if (modulos.inventario) return 'inventario';
  if (modulos.pos) return 'ventas';
  return 'sin_caja';
}

// Se activan aparte y todavía no dependen de un nivel.
export const EXTRAS: string[] = [
  'Dominio propio del cliente (parqueado: el cliente lo compra y Boga lo conecta)',
];

// Lo que NO hace hoy, para no prometerlo al vender.
export const LIMITES: string[] = [
  'Los pedidos de la carta web salen por WhatsApp y no quedan registrados: no descuentan stock ni suman a las ventas. Solo cuenta lo cobrado en el POS.',
  'No hay historial de movimientos de stock (quién sacó o ingresó qué y cuándo).',
  'Google: cada producto apunta a la página de su tienda; todavía no hay una página propia por producto.',
  'Los módulos los prende el superadmin a mano por tienda; todavía no hay cobro ni suscripción automática.',
];
