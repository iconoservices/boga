import { NextRequest, NextResponse } from 'next/server';
import { getDynamicStore } from '@/app/[slug]/cargarTienda';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  const store = slug ? await getDynamicStore(slug) : null;

  // Si la tienda subió su logo oficial, redirigir a su imagen
  if (store?.logoImage) {
    return NextResponse.redirect(store.logoImage);
  }

  // Si no tiene imagen subida, generar SVG vectorial con su letra inicial
  const nombreLimpio = store?.name ? store.name.replace(/\s*bm$/i, '').trim() : 'Tienda';
  const letra = (nombreLimpio.charAt(0) || 'T').toUpperCase();
  const colorFondo = (store?.theme as any)?.primaryColor || '#059669';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="${colorFondo}"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${letra}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
