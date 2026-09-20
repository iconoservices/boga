import { NextRequest, NextResponse } from 'next/server';

// Dirección aparte para las tiendas (p. ej. https://tiendas.bogahub.app), configurada con
// NEXT_PUBLIC_TIENDAS_URL. Es el MISMO sitio: en esa dirección solo se muestran las tiendas
// (/<tienda>). Como es otra dirección, al tocar una tienda desde BogaHub instalada se abre
// afuera (en el navegador) y la tienda se puede instalar como app propia.
// Todo lo que NO sea una tienda (inicio, market, agenda, etc.) se manda al sitio principal.
// Sin la variable, este archivo no hace nada.
//
// TAMBIÉN: una dirección propia por tienda, <tienda>.bogahub.app (p. ej. el-cholao.bogahub.app).
// En esa dirección la portada ("/") es la tienda, y todo lo que no sea de esa tienda se manda
// al sitio principal. Se activa sola para cualquier <algo>.bogahub.app que no esté reservado
// (www, tiendas, fotos…); no hace falta configurar nada más en el código por tienda.

const hostDe = (url?: string) => {
  try { return url ? new URL(url).host : ''; } catch { return ''; }
};
const TIENDAS_HOST = hostDe(process.env.NEXT_PUBLIC_TIENDAS_URL);
const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');
const DOMINIO_BASE = hostDe(SITIO);                       // p. ej. bogahub.app
const SUBDOMINIOS_RESERVADOS = new Set(['www', 'tiendas', 'fotos', 'api', 'admin', 'app', 'mail', 'cdn', 'static', 'assets']);

/** "el-cholao.bogahub.app" -> "el-cholao"; null si no es una dirección de tienda. */
function tiendaDeSubdominio(host: string): string | null {
  const h = host.replace(/:\d+$/, '');
  if (!DOMINIO_BASE || !h.endsWith('.' + DOMINIO_BASE)) return null;
  const etiqueta = h.slice(0, -(DOMINIO_BASE.length + 1));
  if (!/^[a-z0-9-]+$/.test(etiqueta) || SUBDOMINIOS_RESERVADOS.has(etiqueta)) return null;
  return etiqueta;
}

// Rutas de primer nivel que son de BogaHub (no son tiendas).
const RUTAS_DE_BOGAHUB = new Set([
  'admin', 'apple-icon.png', 'eventos', 'explore', 'guia', 'inmuebles', 'legal', 'libro-de-reclamaciones',
  'login', 'market', 'negocios', 'offline', 'orders', 'org', 'pandero', 'pension', 'preview', 'profile',
  'promotions', 'reset-password', 'revista', 'sorteos', 'superadmin', 'taxi-seguro', 'trabajos', 'vende-con-boga',
  'viajes', 'servicios', 'trabajo', 'empleos', 'alquileres', 'product',
]);

export function proxy(request: NextRequest) {
  // ── Dirección propia de una tienda: <tienda>.bogahub.app ──
  const tienda = tiendaDeSubdominio(request.headers.get('host') || '');
  if (tienda) {
    const { pathname, search } = request.nextUrl;
    const primero = pathname.split('/')[1] || '';
    const esArchivo = /\.[a-z0-9]+$/i.test(pathname);
    const esInterno = primero === 'api' || primero === '_next';
    if (pathname === '/') return NextResponse.rewrite(new URL(`/${tienda}${search}`, request.url));   // portada = la tienda
    if (esArchivo || esInterno || primero === tienda) return NextResponse.next();                     // /<tienda>/… y recursos
    return NextResponse.redirect(`${SITIO}${pathname}${search}`);                                     // lo demás: al sitio principal
  }

  if (TIENDAS_HOST && request.headers.get('host') === TIENDAS_HOST) {
    const { pathname, search } = request.nextUrl;
    const primero = pathname.split('/')[1] || '';
    const esArchivo = /\.[a-z0-9]+$/i.test(pathname);   // íconos, imágenes, sw, etc.
    const esInterno = primero === 'api' || primero === '_next';
    const esTienda = primero !== '' && !RUTAS_DE_BOGAHUB.has(primero);
    if (!esArchivo && !esInterno && !esTienda) {
      return NextResponse.redirect(`${SITIO}${pathname}${search}`);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|pwa-icon.png|sw.js|workbox-.*).*)',
  ],
};
