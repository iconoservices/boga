// Datos para los bloques de GEO/SEO que van en el HTML del servidor (ver components/GeoBloque.tsx y los layouts de cada hub).
// Reusa los mismos endpoints y parseadores que la app: una sola fuente de verdad. Si una fuente falla, devuelve vacío
// (el bloque simplemente no se escribe) y la página sigue igual.

import { unstable_cache } from 'next/cache';
import { GET as inmueblesGET } from '@/app/api/inmuebles/route';
import { GET as ventasGET } from '@/app/api/ventas/route';
import { GET as viajesGET } from '@/app/api/viajes/route';
import { GET as sorteosGET } from '@/app/api/sorteos/route';
import { GET as catalogoGET } from '@/app/api/catalog/route';
import { supabase } from '@/lib/supabase';
import { parseAlquileres, type Aviso } from '@/lib/alquileres';
import { parseVentas, type AvisoVenta } from '@/lib/ventas';
import { parseViajes, type RutaViaje } from '@/lib/viajes';
import { parseSorteos, type Sorteo } from '@/lib/sorteos';
import { COLS_OFERTA, aplicarOferta } from '@/lib/ofertas';

export const soles = (n: number) => `S/ ${n.toFixed(2).replace(/\.00$/, '')}`;
export const esRubroComida = (cat: string) => /restaur|comida|pizz|pollo|caf[eé]|helad|bebida|panader|pasteler|jugo|hamburg|chifa|parrilla|snack/i.test(cat || '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function leer(llamar: () => Promise<Response> | Response): Promise<any> {
  try { const r = await llamar(); return r.ok ? await r.json() : null; } catch { return null; }
}

export async function datosInmuebles(): Promise<{ alquileres: Aviso[]; ventas: AvisoVenta[] }> {
  const [a, v] = await Promise.all([leer(() => inmueblesGET()), leer(() => ventasGET())]);
  return { alquileres: a ? parseAlquileres(a) : [], ventas: v ? parseVentas(v) : [] };
}

export async function datosViajes(): Promise<RutaViaje[]> {
  const v = await leer(() => viajesGET());
  return v ? parseViajes(v) : [];
}

export async function datosSorteosAbiertos(): Promise<Sorteo[]> {
  const s = await leer(() => sorteosGET());
  return s ? parseSorteos(s).filter((x) => x.status === 'abierto') : [];
}

export type TiendaGeo = {
  slug: string; name: string; tagline: string; categoria: string;
  productos: { id: string; name: string; price: number; anterior?: number }[];
};

/** Tiendas del marketplace con hasta `porTienda` productos cada una (los que tienen precio). */
export async function datosTiendas(porTienda = 8): Promise<TiendaGeo[]> {
  const c = await leer(() => catalogoGET(new Request('http://boga.local/api/catalog')));
  if (!c) return [];
  const stores = (c.stores ?? []) as { slug: string; name: string; tagline?: string; marketplace_category?: string }[];
  const products = (c.products ?? []) as { id: string; name: string; price: number; price_anterior?: number; store: string; status?: string }[];
  return stores.map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.tagline || '',
    categoria: s.marketplace_category || '',
    productos: products
      .filter((p) => p.store === s.slug && p.status !== 'Agotado' && Number(p.price) > 0)
      .slice(0, porTienda)
      .map((p) => ({ id: p.id, name: p.name, price: Number(p.price), anterior: Number(p.price_anterior) > 0 ? Number(p.price_anterior) : undefined })),
  }));
}

export type ProductoTienda = { id: string; name: string; description: string; price: number; anterior?: number; category: string; image: string };

/** Productos activos de UNA tienda para su página (con el precio de oferta vigente). Se guarda 5 min; se refresca al editar. */
export const productosDeTienda = unstable_cache(
  async (slug: string): Promise<ProductoTienda[]> => {
    try {
      const base = 'id,name,description,price,category,image,status';
      let { data, error } = await supabase.from('products').select(`${base},${COLS_OFERTA}`).eq('store', slug).limit(300);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error) ({ data, error } = await supabase.from('products').select(base).eq('store', slug).limit(300) as any);
      if (error) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[])
        .filter((p) => p.status !== 'Inactivo' && p.status !== 'Agotado')
        .map(aplicarOferta)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => ({
          id: String(p.id), name: String(p.name || ''), description: String(p.description || '').slice(0, 300),
          price: Number(p.price) || 0, anterior: Number(p.price_anterior) > 0 ? Number(p.price_anterior) : undefined,
          category: String(p.category || ''), image: String(p.image || ''),
        }))
        .filter((p) => p.name && p.price > 0);
    } catch { return []; }
  },
  ['productos-geo'],
  { revalidate: 300, tags: ['stores'] },
);

/** Lista estructurada (schema.org/ItemList) a partir de textos; `url` opcional por elemento. */
export const itemListLd = (nombre: string, elementos: { texto: string; url?: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: nombre,
  numberOfItems: elementos.length,
  itemListElement: elementos.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.texto, ...(e.url ? { url: e.url } : {}) })),
});
