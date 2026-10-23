// Datos del Inicio "/" ya masticados para pintar (sin lógica de red). Los usa el servidor
// (src/lib/homeData.ts, que los deja dentro del HTML) y el cliente (HomeClient), que solo vuelve
// a pedir una sección si el servidor no pudo leerla. Así la misma transformación vive en un sitio.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NotaCard } from '@/lib/revista';
import type { Evento } from '@/lib/eventos';
import type { Lugar } from '@/lib/lugares';
import type { Empleo, Oficio } from '@/lib/chamba';
import type { RutaViaje } from '@/lib/viajes';
import type { Aviso } from '@/lib/alquileres';
import type { AvisoVenta } from '@/lib/ventas';
import type { Sorteo } from '@/lib/sorteos';

export type BannerEstilo = 'center' | 'bottom';

export type HomeSlide = { kicker: string; title: string; href: string; img: string; portrait?: string; pura?: boolean };
export type NotaHome = Pick<NotaCard, 'slug' | 'kicker' | 'titulo' | 'img'>;
export type QueHacerItem = { id: string; title: string; img: string; tag: string; meta: string };
export type EmpleoHome = { id: string; puesto: string; negocio: string; zona: string; tipo: string; pago: string; img: string; subido: string };
export type OficioHome = { id: string; nombre: string; oficio: string; zona: string; img: string };
export type ViajeHome = { id: string; titulo: string; medio: string; tiempo: string; precio: string; icon: string };
export type InmuebleHome = { id: string; titulo: string; zona: string; precio: string; tag: string; img: string };
export type ProductoHome = { id: string; name: string; price: number; priceAnterior?: number; image: string; storeSlug: string; storeName: string; storeExternalUrl?: string };
export type TiendaComida = { slug: string; name: string; tagline: string; logo: string; externalUrl?: string; productos: { id: string; name: string; price: number; priceAnterior?: number; image: string }[] };

/** Cada bloque del Inicio que se lee por separado; si uno falla en el servidor, el cliente lo pide él solo. */
export type SeccionHome = 'revista' | 'promos' | 'agenda' | 'chamba' | 'sorteos' | 'viajes' | 'inmuebles' | 'catalogo';

export type HomeData = {
  notas: NotaHome[];
  promos: HomeSlide[];
  bannerStyle: BannerEstilo;
  queHacer: QueHacerItem[];
  empleos: EmpleoHome[];
  oficios: OficioHome[];
  sorteos: Sorteo[];
  viajes: ViajeHome[];
  inmuebles: InmuebleHome[];
  productos: ProductoHome[];
  tiendasComida: TiendaComida[];
  fallidas: SeccionHome[];
};

export const HOME_VACIO: HomeData = {
  notas: [], promos: [], bannerStyle: 'bottom', queHacer: [], empleos: [], oficios: [], sorteos: [],
  viajes: [], inmuebles: [], productos: [], tiendasComida: [], fallidas: [],
};

export function armarNotas(notas: NotaCard[]): NotaHome[] {
  return notas.slice(0, 8).map((n) => ({ slug: n.slug, kicker: n.kicker, titulo: n.titulo, img: n.img }));
}

export function armarPromos(banners: any[]): HomeSlide[] {
  return banners.map((b) => {
    const conTexto = b.show_text !== false && (b.tag || b.title1 || b.title2 || b.sub);
    return {
      kicker: conTexto ? (b.tag || 'Promo') : '',
      title: conTexto ? [b.title1, b.title2].filter(Boolean).join(' ') : '',
      href: b.link || '/explore',
      img: b.image,
      pura: !conTexto,
    };
  });
}

// "Qué hacer en Pucallpa hoy": la agenda (events) y los lugares para visitar (lugares) en una sola tira.
export function armarQueHacer(eventos: Evento[], lugares: Lugar[]): QueHacerItem[] {
  return [
    ...eventos.slice(0, 4).map((e) => ({
      id: e.id, title: e.titulo, img: e.img,
      tag: [e.dia, e.mes].filter(Boolean).join(' ') || 'Evento',
      // el precio ya viene escrito como «Desde S/30» en la base: no se le antepone otro «Desde»
      meta: e.precio ? (/^desde/i.test(e.precio.trim()) ? e.precio.trim() : `Desde ${e.precio}`) : 'Ver evento',
    })),
    ...lugares.slice(0, 4).map((l) => ({
      id: l.id, title: l.nombre, img: l.img,
      tag: l.tag || 'Para visitar',
      meta: 'Para visitar',
    })),
  ];
}

export function armarChamba(empleos: Empleo[], oficios: Oficio[]): { empleos: EmpleoHome[]; oficios: OficioHome[] } {
  return {
    empleos: empleos.slice(0, 8).map((e) => ({
      id: e.id, puesto: e.puesto, negocio: e.negocio || '', zona: e.zona || '', tipo: e.tipo || '', pago: e.pago || '',
      img: e.img || '', subido: e.subido || '',
    })),
    oficios: oficios.slice(0, 6).map((o) => ({ id: o.id, nombre: o.nombre, oficio: o.oficio, zona: o.zona, img: o.img })),
  };
}

export function armarViajes(rows: RutaViaje[]): ViajeHome[] {
  const nombreMedio = { fluvial: 'Fluvial', terrestre: 'Terrestre', aereo: 'Aéreo' } as const;
  return rows.slice(0, 6).map((r) => ({
    id: r.id, titulo: r.destino, medio: nombreMedio[r.medio], tiempo: r.duracion,
    precio: r.precio || 'Consultar', icon: r.icon,
  }));
}

export function armarInmuebles(alq: Aviso[], vta: AvisoVenta[]): InmuebleHome[] {
  const precio = (n: number, moneda: string) =>
    n > 0 ? `${moneda === 'USD' ? '$' : 'S/'} ${n.toLocaleString('es-PE')}` : 'Consultar';
  return [
    ...alq.slice(0, 4).map((a) => ({
      id: `alq-${a.id}`, titulo: a.titulo, zona: a.zona,
      precio: precio(a.precio, 'PEN'), tag: a.tipo === 'Pensión' ? 'Hotel' : a.tipo,
      img: a.img || '',
    })),
    ...vta.slice(0, 2).map((v) => ({
      id: `vta-${v.id}`, titulo: v.titulo, zona: v.zona,
      precio: precio(v.precio, v.moneda), tag: 'Venta',
      img: v.img || '',
    })),
  ];
}

// Mezclador SOLO para el cliente (navegador): nunca debe ejecutarse en el servidor durante
// la generación de páginas ISR/SSG porque Math.random() produce un resultado distinto cada vez,
// lo que hace que Vercel detecte el HTML como «cambiado» y escriba en disco cada regeneración.
export const clientMezclar = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

// Mezclador DETERMINISTA para el servidor: ordena por un hash del id (o del nombre si no hay id)
// para que, con los mismos datos de Supabase, el HTML de salida sea siempre idéntico.
// Así Vercel no gasta Write Units si nada en la base de datos cambió.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function mezclarDeterminista<T>(a: T[]): T[] {
  return [...a].sort((x, y) => hashCode(String((x as any)?.id ?? (Array.isArray(x) ? (x[0] as any)?.id : x))) - hashCode(String((y as any)?.id ?? (Array.isArray(y) ? (y[0] as any)?.id : y))));
}

// "Lo que se pide en Market" (productos de TODAS las categorías, repartidos por tienda en rondas para
// que no domine la que tiene más) y "Tiendas de comida" (solo rubro comida/bebida, con su logo).
export function armarCatalogoHome(dbStores: any[], dbProducts: any[]): { productos: ProductoHome[]; tiendasComida: TiendaComida[] } {
  const tiendasPorSlug: Record<string, any> = {};
  (dbStores || []).forEach((s) => { tiendasPorSlug[s.slug] = s; });

  const items: ProductoHome[] = (dbProducts || [])
    .filter((p) => tiendasPorSlug[p.store] && p.image)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      priceAnterior: Number(p.price_anterior) > 0 ? Number(p.price_anterior) : undefined,
      image: p.image,
      storeSlug: p.store,
      storeName: tiendasPorSlug[p.store]?.name || p.store,
      storeExternalUrl: tiendasPorSlug[p.store]?.external_url || undefined,
    }));

  // Repartir en rondas (una por tienda) con orden determinista: así el servidor siempre
  // produce el mismo HTML para los mismos datos y Vercel no escribe en disco innecesariamente.
  const porTienda: Record<string, ProductoHome[]> = {};
  mezclarDeterminista(items).forEach((it) => { (porTienda[it.storeSlug] ||= []).push(it); });
  const colas = mezclarDeterminista(Object.values(porTienda).map((arr) => arr));
  const productos: ProductoHome[] = [];
  while (productos.length < 12 && colas.some((c) => c.length)) {
    for (const c of colas) {
      const it = c.shift();
      if (it && productos.length < 12) productos.push(it);
    }
  }

  const esComida = (cat: string) => /restaur|comida|pizz|pollo|caf[eé]|helad|bebida|panader|pasteler|jugo|hamburg|chifa|parrilla|snack/.test(cat.toLowerCase());
  const tiendasComida: TiendaComida[] = (dbStores || [])
    .filter((st) => esComida(st.marketplace_category || ''))
    .map((st) => ({
      slug: st.slug,
      name: st.name,
      tagline: st.tagline || st.marketplace_category || '',
      logo: st.logo_image || '',
      externalUrl: st.external_url || undefined,
      // En el servidor: orden determinista (sin Math.random). El cliente puede reordenar con clientMezclar si quiere variedad visual.
      productos: mezclarDeterminista((dbProducts || []).filter((p) => p.store === st.slug && p.image))
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, priceAnterior: Number(p.price_anterior) > 0 ? Number(p.price_anterior) : undefined, image: p.image })),
    }))
    .filter((t) => t.productos.length > 0);

  return { productos, tiendasComida };
}
