// Módulos que el superadmin prende o apaga por tienda (columna `stores.modulos`, jsonb).
//
// Un solo lugar: lo usan el admin del comercio (qué pestañas y secciones muestra),
// el editor de tienda del superadmin (los interruptores) y la página de Paquetes
// (la tabla de niveles). Si se agrega un módulo, se agrega acá y en NIVELES.

export type ModuloId = 'pos' | 'inventario';
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
];

// Stock a partir del cual un producto se marca "poco stock".
export const STOCK_BAJO = 5;

// `null`/`undefined` = tienda anterior a los módulos (o la migración todavía no corrió):
// se deja todo prendido para no quitarle nada a quien ya lo usa.
export function moduloActivo(modulos: Modulos | null | undefined, id: ModuloId): boolean {
  if (modulos == null || typeof modulos !== 'object') return true;
  return modulos[id] === true;
}

// Los niveles que se le venden al comercio. Se muestran en Paquetes del superadmin para
// compararlos. Cada nivel = un conjunto de módulos; lo que trae cada uno sale de CAPACIDADES.
export type NivelId = 'carta' | 'ventas' | 'inventario';

export const NIVELES: { id: NivelId; nombre: string; resumen: string; modulos: ModuloId[] }[] = [
  { id: 'carta', nombre: 'Carta', resumen: 'La carta web con botón de WhatsApp. Nivel base.', modulos: [] },
  { id: 'ventas', nombre: 'Carta + Ventas', resumen: 'Suma la caja del local para cobrar y llevar el registro.', modulos: ['pos'] },
  { id: 'inventario', nombre: 'Carta + Ventas + Inventario', resumen: 'Suma el control de stock automático.', modulos: ['pos', 'inventario'] },
];

// Qué puede hacer el dueño, y desde qué nivel. Cada nivel incluye los anteriores.
export const CAPACIDADES: { texto: string; desde: NivelId }[] = [
  { texto: 'Carta digital con link y QR', desde: 'carta' },
  { texto: 'Pedidos por WhatsApp', desde: 'carta' },
  { texto: 'Activar o marcar Agotado cada producto (el agotado no se muestra en la carta)', desde: 'carta' },
  { texto: 'Botón para instalar la app', desde: 'carta' },
  { texto: 'Caja rápida (POS) con boleta en PDF y por WhatsApp', desde: 'ventas' },
  { texto: 'Vendedores propios de cada negocio', desde: 'ventas' },
  { texto: 'Pedidos y métricas de ventas del local', desde: 'ventas' },
  { texto: 'Stock que se descuenta solo con cada venta del POS', desde: 'inventario' },
  { texto: 'Producto pasa a Agotado solo al llegar a 0', desde: 'inventario' },
  { texto: 'El POS no deja vender más de lo que hay', desde: 'inventario' },
  { texto: 'Aviso de poco stock (5 unidades o menos)', desde: 'inventario' },
  { texto: 'Botón para ingresar mercadería', desde: 'inventario' },
];

// Se activan aparte, por tienda, desde el editor del superadmin — no dependen del nivel.
export const EXTRAS: string[] = [
  'Subdominio propio (tienda.bogahub.app)',
  'Avisos push propios (1 campaña por semana)',
  'Dominio propio del cliente (parqueado)',
];

// Lo que NO hace hoy, para no prometerlo al vender.
export const LIMITES: string[] = [
  'Los pedidos de la carta web salen por WhatsApp y no quedan registrados: no descuentan stock ni suman a las ventas. Solo cuenta lo cobrado en el POS.',
  'No hay historial de movimientos de stock (quién sacó o ingresó qué y cuándo).',
  'Los módulos los prende el superadmin a mano por tienda; todavía no hay cobro ni suscripción automática.',
];

const RANGO: Record<NivelId, number> = { carta: 0, ventas: 1, inventario: 2 };
export const nivelIncluye = (nivel: NivelId, desde: NivelId) => RANGO[nivel] >= RANGO[desde];

/** En qué nivel está una tienda según sus módulos. `null` = anterior a los módulos (todo prendido, sin clasificar). */
export function nivelDeTienda(modulos: Modulos | null | undefined): NivelId | 'sin-clasificar' {
  if (modulos == null || typeof modulos !== 'object') return 'sin-clasificar';
  if (modulos.inventario) return 'inventario';
  if (modulos.pos) return 'ventas';
  return 'carta';
}
