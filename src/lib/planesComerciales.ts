// Planes comerciales: la lista que se vende en /negocios y se edita en Cobros → Precios (tabla planes_comerciales).
// PLANES_BASE es el respaldo mientras la tabla no exista o esté vacía, para que la landing nunca quede sin planes.

import type { SupabaseClient } from '@supabase/supabase-js';

export type NivelPlan = 'carta' | 'app' | 'app_google' | null;

export interface PlanComercial {
  id: string;
  orden: number;
  nombre: string;
  etiqueta: string;
  icono: string;
  descripcion: string;
  caracteristicas: string[];
  /** Lo que paga una tienda por este plan en total, por mes. */
  precio_mes: number;
  precio_oferta: number | null;
  oferta_hasta: string | null;
  recomendado: boolean;
  activo: boolean;
  limite_productos: string;
  /** Número máximo de productos que admite el plan (null = sin tope). Lo hace cumplir un trigger en la base. */
  max_productos: number | null;
  pronto: boolean;
  nivel: NivelPlan;
}

export const PLANES_BASE: PlanComercial[] = [
  {
    id: 'carta', orden: 1, nombre: 'Carta', etiqueta: 'Huariques y menús', icono: 'storefront',
    descripcion: 'Tu página de pedidos con tu propio link (bogahub.app/tu-negocio) para compartir en WhatsApp o Instagram. Tú vendes y cobras directo — BogaHub no toca tu plata.',
    caracteristicas: ['Catálogo y gestión de pedidos', 'Pedidos directo a tu WhatsApp, sin comisión', 'Promociones y combos con etiqueta especial', 'Funciona en cualquier ciudad', 'Instalable como app'],
    precio_mes: 50, precio_oferta: null, oferta_hasta: null, recomendado: false, activo: true, limite_productos: 'Hasta 100 productos', max_productos: 100, pronto: false, nivel: 'carta',
  },
  {
    id: 'app', orden: 2, nombre: 'Tienda', etiqueta: 'Para tiendas', icono: 'install_mobile',
    descripcion: 'Todo lo de Carta y, además, tu propia dirección (tunegocio.bogahub.app) que tus clientes instalan como app en el celular.',
    caracteristicas: ['Todo lo del plan Carta', 'Subdominio propio, instalable como app', 'Notificaciones push al celular de tus clientes (2 por semana)'],
    precio_mes: 100, precio_oferta: null, oferta_hasta: null, recomendado: true, activo: true, limite_productos: 'De 101 a 1 000 productos', max_productos: 1000, pronto: false, nivel: 'app',
  },
  {
    id: 'app_google', orden: 3, nombre: 'Premium', etiqueta: 'Alta capacidad', icono: 'shopping_bag',
    descripcion: 'Todo lo de Tienda y, además, tus productos aparecen cuando la gente los busca en Google, con un catálogo de hasta 5 000 productos.',
    caracteristicas: ['Todo lo del plan Tienda', 'Tus productos en Google', 'Catálogo de 1 001 a 5 000 productos'],
    precio_mes: 180, precio_oferta: null, oferta_hasta: null, recomendado: false, activo: true, limite_productos: 'De 1 001 a 5 000 productos', max_productos: 5000, pronto: true, nivel: 'app_google',
  },
  {
    id: 'multisede', orden: 4, nombre: 'Multi-sede / Franquicia', etiqueta: 'Empresarial', icono: 'account_tree',
    descripcion: 'Varias sucursales con métricas consolidadas por sede, acceso para gerentes y cajeros y marca blanca incluida.',
    caracteristicas: ['Todo lo del plan Premium', 'Múltiples sucursales', 'Métricas consolidadas por sede', 'Acceso para gerentes y cajeros', 'Marca blanca incluida'],
    precio_mes: 399, precio_oferta: null, oferta_hasta: null, recomendado: false, activo: true, limite_productos: 'Más de 5 000 productos', max_productos: null, pronto: true, nivel: null,
  },
];

/** El precio que rige hoy: la oferta si hay y no venció; si no, el normal. `hoy` en AAAA-MM-DD. */
export const precioVigente = (p: Pick<PlanComercial, 'precio_mes' | 'precio_oferta' | 'oferta_hasta'>, hoy: string) =>
  p.precio_oferta != null && p.precio_oferta > 0 && (!p.oferta_hasta || p.oferta_hasta >= hoy) ? p.precio_oferta : p.precio_mes;

export const enOferta = (p: Pick<PlanComercial, 'precio_mes' | 'precio_oferta' | 'oferta_hasta'>, hoy: string) =>
  precioVigente(p, hoy) < p.precio_mes;

type Fila = Partial<Omit<PlanComercial, 'caracteristicas' | 'precio_mes' | 'precio_oferta' | 'max_productos'>> & { max_productos?: number | string | null } & { id: string; caracteristicas?: unknown; precio_mes?: number | string; precio_oferta?: number | string | null };

const aPlan = (f: Fila, base?: PlanComercial): PlanComercial => ({
  id: f.id,
  orden: Number(f.orden ?? base?.orden ?? 99),
  nombre: f.nombre ?? base?.nombre ?? f.id,
  etiqueta: f.etiqueta ?? base?.etiqueta ?? '',
  icono: f.icono ?? base?.icono ?? 'storefront',
  descripcion: f.descripcion ?? base?.descripcion ?? '',
  caracteristicas: Array.isArray(f.caracteristicas) ? (f.caracteristicas as unknown[]).map(String) : base?.caracteristicas ?? [],
  precio_mes: Number(f.precio_mes ?? base?.precio_mes ?? 0) || 0,
  precio_oferta: f.precio_oferta == null ? null : Number(f.precio_oferta) || 0,
  oferta_hasta: f.oferta_hasta ?? null,
  recomendado: f.recomendado === true,
  activo: f.activo !== false,
  limite_productos: f.limite_productos ?? base?.limite_productos ?? '',
  max_productos: f.max_productos == null ? (base?.max_productos ?? null) : Number(f.max_productos),
  pronto: f.pronto === true,
  nivel: (f.nivel ?? base?.nivel ?? null) as NivelPlan,
});

/** Lee los planes de la base. Si la tabla no existe o está vacía, devuelve los de respaldo (`deDb: false`). */
export async function cargarPlanes(db: SupabaseClient): Promise<{ planes: PlanComercial[]; deDb: boolean }> {
  const { data, error } = await db.from('planes_comerciales').select('*').order('orden');
  if (error || !data || data.length === 0) return { planes: PLANES_BASE, deDb: false };
  return { planes: (data as Fila[]).map((f) => aPlan(f, PLANES_BASE.find((b) => b.id === f.id))), deDb: true };
}

/** Plan que le corresponde a una tienda según su alcance (igual que el panel y el trigger de la base). */
export function planDeTienda(t: { modulos?: { google?: boolean } | null; subdominio_activo?: boolean | null }, planes: PlanComercial[]): PlanComercial | undefined {
  const nivel: NivelPlan = t.modulos?.google === true ? 'app_google' : t.subdominio_activo ? 'app' : 'carta';
  return planes.find((p) => p.nivel === nivel);
}
