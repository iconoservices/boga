// Helpers de cliente para leer el catálogo desde los endpoints cacheados
// (/api/catalog y /api/catalog/[slug]) en vez de pegarle directo a Supabase
// desde el navegador de cada visitante. Ver el porqué en src/app/api/catalog/route.ts.
//
// Devuelven `any[]` a propósito: reemplazan un `supabase.from(...).select('*')`
// que ya venía sin tipar, y el código que los consume castea a `any`.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Todas las tiendas + productos + banners del marketplace (para /market y /explore). */
export async function fetchCatalogo(): Promise<{ stores: any[]; products: any[]; banners: any[]; bannerStyle: 'center' | 'bottom' }> {
  try {
    const res = await fetch('/api/catalog', { cache: 'no-store' });
    if (!res.ok) return { stores: [], products: [], banners: [], bannerStyle: 'center' };
    const data = await res.json();
    return { stores: data.stores ?? [], products: data.products ?? [], banners: data.banners ?? [], bannerStyle: data.bannerStyle || 'center' };
  } catch {
    return { stores: [], products: [], banners: [], bannerStyle: 'center' };
  }
}

/** Banners activos de un carrusel puntual (ej. 'home' para el Inicio "/") + su estilo. */
export async function fetchBanners(page: string): Promise<{ banners: any[]; style: 'center' | 'bottom' }> {
  try {
    const res = await fetch(`/api/catalog?page=${encodeURIComponent(page)}`, { cache: 'no-store' });
    if (!res.ok) return { banners: [], style: 'bottom' };
    const data = await res.json();
    return { banners: data.banners ?? [], style: data.bannerStyle || 'bottom' };
  } catch {
    return { banners: [], style: 'bottom' };
  }
}

/** Productos de una sola tienda (para las plantillas de storefront). */
export async function fetchProductosDeTienda(slug: string, incluirAgotados = false): Promise<any[]> {
  try {
    const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    // Lo marcado Agotado (a mano, o solo por el inventario al llegar a 0) no se ofrece en la carta; lo Inactivo (oculto por el dueño) tampoco:
    // el sitemap, la ficha del producto y el feed de Google ya lo escondían, pero las plantillas lo seguían mostrando.
    // Las plantillas con «Reserva» (Delva) piden también los Agotados para ofrecerlos como reserva; las demás no los ven.
    return ((data.products ?? []) as any[]).filter((p) => (incluirAgotados || p.status !== 'Agotado') && p.status !== 'Inactivo');
  } catch {
    return [];
  }
}
