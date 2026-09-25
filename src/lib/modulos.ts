// Módulos que el superadmin prende o apaga por tienda (columna `stores.modulos`, jsonb).
//
// Un solo lugar: lo usan el admin del comercio (qué pestañas y secciones muestra),
// el editor de tienda del superadmin (los interruptores) y la página de Paquetes
// (la tabla de niveles). Si se agrega un módulo, se agrega acá y en NIVELES.

export type ModuloId = 'pos' | 'inventario' | 'google' | 'marca_blanca' | 'marketplace';
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
  {
    id: 'marca_blanca',
    label: 'Marca blanca',
    icon: 'visibility_off',
    desc: 'Quita el "Powered by Boga Market" del pie de la tienda.',
  },
  {
    id: 'marketplace',
    label: 'Aparece en el marketplace BogaHub',
    icon: 'storefront',
    desc: 'La tienda y sus productos salen en /market y /explore. Apagado, solo se llega a ella por su propio link. (Prendido por defecto.)',
  },
];

// Stock a partir del cual un producto se marca "poco stock".
export const STOCK_BAJO = 5;

// `null`/`undefined` = tienda anterior a los módulos (o la migración todavía no corrió):
// se deja todo prendido para no quitarle nada a quien ya lo usa.
// (El feed de Google no usa esto: ahí solo entra quien lo tenga en true de forma explícita.)
// (El marketplace tampoco: ahí la tienda sale salvo que esté en false — ver `enMarketplace`.)
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

// `nuevo`: fila que se sumó para igualar lo que promete /negocios; se marca en el admin para revisarla.
export const CAPACIDADES_ALCANCE: { texto: string; desde: AlcanceId; nuevo?: boolean }[] = [
  { texto: 'Carta digital con link y QR', desde: 'carta' },
  { texto: 'Pedidos por WhatsApp (además quedan registrados en su panel de Pedidos)', desde: 'carta' },
  { texto: 'Página propia por producto (link directo para compartir y para Google)', desde: 'carta' },
  { texto: 'Activar o marcar Agotado cada producto (el agotado no se muestra en la carta)', desde: 'carta' },
  { texto: 'Botón para instalar la carta como app (en la dirección de Boga)', desde: 'carta' },
  { texto: 'Link propio (bogahub.app/tu-negocio) para compartir en WhatsApp o Instagram', desde: 'carta', nuevo: true },
  { texto: 'Pedidos directo a su WhatsApp, sin comisión: el dueño cobra directo, Boga no toca la plata', desde: 'carta', nuevo: true },
  { texto: 'Plantillas listas para su rubro', desde: 'carta', nuevo: true },
  { texto: 'Funciona en cualquier ciudad', desde: 'carta', nuevo: true },
  { texto: 'Subdominio propio (tienda.bogahub.app) con su app instalable', desde: 'app' },
  { texto: 'Notificaciones push propias a quienes instalaron su app (2 por semana, acumulables en el mes; paquetes extra de 4)', desde: 'app' },
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
  { texto: 'Métricas de ventas del local (hoy, mes y más vendidos)', desde: 'ventas' },
  { texto: 'Stock que se descuenta solo con cada venta del POS', desde: 'inventario' },
  { texto: 'Producto pasa a Agotado solo al llegar a 0', desde: 'inventario' },
  { texto: 'El POS no deja vender más de lo que hay', desde: 'inventario' },
  { texto: 'Aviso de poco stock (5 unidades o menos)', desde: 'inventario' },
  { texto: 'Los pedidos de la carta también descuentan stock (y lo devuelven si se cancelan)', desde: 'inventario' },
  { texto: 'Botón para ingresar mercadería', desde: 'inventario' },
  { texto: 'Historial de movimientos de stock (qué entró o salió, cuándo y por qué)', desde: 'inventario' },
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

// Se activan aparte, por tienda, y no dependen de un nivel.
export const EXTRAS: string[] = [
  'Marca blanca: quita el "Powered by Boga Market" (tiene su propio precio)',
  'Aparecer en el marketplace BogaHub (/market): viene prendido; el superadmin lo puede apagar',
  'Dominio propio del cliente (parqueado: el cliente lo compra y Boga lo conecta)',
];

// Lo que NO hace hoy, para no prometerlo al vender.
export const LIMITES: string[] = [
  'El pedido de la carta se registra cuando el cliente toca «enviar por WhatsApp»: no confirma que el mensaje se mandó ni que pagó. Las plantillas todavía no piden el celular del cliente, así que el registro trae solo nombre y dirección.',
  'Los pagos de los negocios se registran a mano (Yape, Plin, transferencia). No hay pasarela ni cobro automático, y los módulos no se apagan solos al vencer: Cobros es un tablero de control.',
  'Google: falta conectar el feed en tu cuenta de Merchant Center (la cuenta de Boga) para que empiece a mostrar productos.',
];

/** ¿Sale la tienda en el marketplace (/market, /explore)? Sí, salvo que el superadmin lo apague. */
export const enMarketplace = (modulos: Modulos | null | undefined) => modulos?.marketplace !== false;

/** ¿Va sin el "Powered by Boga Market"? Solo si el superadmin lo prendió. */
export const conMarcaBlanca = (modulos: Modulos | null | undefined) => modulos?.marca_blanca === true;

// ─── Precios y cobros ───
// Cada paso de nivel tiene un precio mensual en soles que se SUMA al de los pasos anteriores.
// Ej.: una tienda con subdominio + POS + inventario paga  app + ventas + inventario  (más la base).
// Los precios los define el superadmin en /superadmin/cobros (tabla plan_precios).
export const PASOS_PRECIO: { clave: string; etiqueta: string; ayuda: string }[] = [
  { clave: 'alcance:carta', etiqueta: 'Carta (base)', ayuda: 'Lo que paga toda tienda por tener su carta. Puede ser 0.' },
  { clave: 'alcance:app', etiqueta: 'App', ayuda: 'Se suma al tener subdominio propio y avisos.' },
  { clave: 'alcance:app_google', etiqueta: 'Google', ayuda: 'Se suma al activar los productos en Google (suelto: no incluye el precio de App).' },
  { clave: 'operacion:ventas', etiqueta: 'Ventas (POS)', ayuda: 'Se suma al activar la caja y las ventas.' },
  { clave: 'operacion:inventario', etiqueta: 'Inventario', ayuda: 'Se suma al activar el control de stock.' },
  { clave: 'extra:marca_blanca', etiqueta: 'Marca blanca', ayuda: 'Se suma al quitar el "Powered by Boga Market".' },
];

/** Los pasos de precio que alcanzó una tienda según lo que tiene prendido. */
export function pasosDeTienda(t: { modulos?: Modulos | null; subdominio_activo?: boolean | null }): string[] {
  const pasos = ['alcance:carta'];
  const google = t.modulos?.google === true;
  // Cada módulo se paga por sí solo: Google no arrastra el precio de App.
  if (t.subdominio_activo) pasos.push('alcance:app');
  if (google) pasos.push('alcance:app_google');
  const op = nivelOperacion(t.modulos);
  if (op === 'ventas' || op === 'inventario' || op === 'sin-clasificar') pasos.push('operacion:ventas');
  if (op === 'inventario' || op === 'sin-clasificar') pasos.push('operacion:inventario');
  if (conMarcaBlanca(t.modulos)) pasos.push('extra:marca_blanca');
  return pasos;
}

/** Suma de los precios de los pasos de una tienda (S/ al mes). */
export const precioSugerido = (pasos: string[], precios: Record<string, number>) =>
  pasos.reduce((s, clave) => s + (precios[clave] || 0), 0);

export type TipoCobro = 'sin_costo' | 'sin_pagos' | 'vencido' | 'por_vencer' | 'al_dia';

const DIA_MS = 86_400_000;
const aUtc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };

/** Cómo está una tienda con su pago. `hoy` y `vence` son fechas AAAA-MM-DD. */
export function estadoCobro(vence: string | null | undefined, montoMensual: number, hoy: string): { tipo: TipoCobro; dias: number | null } {
  if (!(montoMensual > 0)) return { tipo: 'sin_costo', dias: null };
  if (!vence) return { tipo: 'sin_pagos', dias: null };
  const dias = Math.round((aUtc(vence) - aUtc(hoy)) / DIA_MS);
  if (dias < 0) return { tipo: 'vencido', dias };
  if (dias <= 7) return { tipo: 'por_vencer', dias };
  return { tipo: 'al_dia', dias };
}

/** Suma meses a una fecha AAAA-MM-DD; si el día no existe en el mes de llegada, cae al último (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (m - 1) + meses;
  const anio = y + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(d, ultimo))).toISOString().slice(0, 10);
}
