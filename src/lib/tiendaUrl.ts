// Dirección a la que se manda a una tienda desde BogaHub.
//
// Las tiendas viven en la misma dirección que BogaHub (bogahub.app/<tienda>), así que
// cuando BogaHub está instalada como app, tocar una tienda la abre DENTRO de la app y ahí
// no se puede instalar la app propia de la tienda. Igual que las fotos (fotos.bogahub.app),
// una dirección DISTINTA sale de la app y se abre en el navegador.
//
// Un enlace externo propio de la tienda (p. ej. Delva) manda siempre. Si no lo hay y está
// configurada NEXT_PUBLIC_TIENDAS_URL (p. ej. https://tiendas.bogahub.app), todas las
// tiendas se abren ahí. Sin esa variable, todo queda como antes (dentro de BogaHub).

const BASE = (process.env.NEXT_PUBLIC_TIENDAS_URL || '').replace(/\/$/, '');

export function hrefTienda(slug: string, externalUrl?: string | null): string {
  if (externalUrl) return externalUrl;
  return BASE ? `${BASE}/${slug}` : `/${slug}`;
}

/** true si el enlace sale de BogaHub (se abre en otra pestaña / en el navegador). */
export function esFuera(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
