import type { StoreTheme } from '@/lib/templates.config';
export type { StoreTheme } from '@/lib/templates.config';

export const BOGA_DEFAULT_ICON = '/pwa-icon.png';

export interface StoreConfig {
  slug: string;
  name: string;
  tagline: string;
  marketplaceCategory: string;
  template: string;
  theme: StoreTheme;
  heroImage: string;
  heroAlt: string;
  iconImage?: string;
  categories: { name: string; icon: string; href: string }[];
  logoImage?: string;
  domain?: string;
  /** Numero al que llegan los pedidos, con codigo de pais y sin signos: 51987654321 */
  whatsapp?: string;
  /**
   * Ficha del local: todos opcionales porque no todo negocio tiene sede
   * fisica (hay tiendas que son puro delivery). Si el comercio no carga
   * alguno, la plantilla oculta esa fila en vez de inventar un dato.
   */
  zona?: string;
  direccion?: string;
  horario?: string;
  /** 0 a 5. Sin decidir todavia de donde sale (manual vs. promedio de reseñas real); por ahora lo carga el comercio a mano. */
  rating?: number;
  /**
   * Mostrar los productos de ejemplo de la plantilla mientras la tienda esta
   * vacia. Solo aplica si no cargo productos propios (ver lib/demo.ts).
   */
  showDemoProducts?: boolean;
}

// Las tiendas viven en Supabase, no aca. Cada consumidor las carga por su lado:
// la tienda publica en app/[slug]/page.tsx, el panel en app/admin/page.tsx.
