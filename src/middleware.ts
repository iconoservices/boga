import { NextRequest, NextResponse } from 'next/server';
import { getStoreByDomain } from '@/lib/stores.config';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];

  // Skip main domain, www, or localhost
  if (!subdomain || subdomain === 'www' || subdomain === 'boga' || host.includes('localhost')) {
    return NextResponse.next();
  }

  const store = getStoreByDomain(subdomain);
  if (!store) return NextResponse.next();

  const url = new URL(request.url);
  // Rewrite to the store's slug route so [slug]/page.tsx handles it
  url.pathname = `/${store.slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|pwa-icon.png|sw.js|workbox-.*).*)',
  ],
};
