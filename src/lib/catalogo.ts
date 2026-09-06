// Helpers de cliente para leer el catálogo desde los endpoints cacheados
// (/api/catalog y /api/catalog/[slug]) en vez de pegarle directo a Supabase
// desde el navegador de cada visitante. Ver el porqué en src/app/api/catalog/route.ts.
//
// Devuelven `any[]` a propósito: reemplazan un `supabase.from(...).select('*')`
// que ya venía sin tipar, y el código que los consume castea a `any`.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Todas las tiendas + productos del marketplace (para /market y /explore). */
export async function fetchCatalogo(): Promise<{ stores: any[]; products: any[] }> {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) return { stores: [], products: [] };
    const data = await res.json();
    return { stores: data.stores ?? [], products: data.products ?? [] };
  } catch {
    return { stores: [], products: [] };
  }
}

/** Productos de una sola tienda (para las plantillas de storefront). */
export async function fetchProductosDeTienda(slug: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.products ?? [];
  } catch {
    return [];
  }
}
