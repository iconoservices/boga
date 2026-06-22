import { NextRequest, NextResponse } from 'next/server';
import { getStoreByDomain } from '@/lib/stores.config';

export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const parts = host.split('.');
  const subdomain = parts.length > 2 ? parts[0] : '';

  // Skip if no subdomain, www, or localhost
  if (!subdomain || subdomain === 'www' || host.includes('localhost')) {
    return NextResponse.next();
  }

  const store = getStoreByDomain(subdomain);
  if (!store) return NextResponse.next();

  const url = new URL(request.url);
  url.pathname = `/${store.slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|pwa-icon.png|sw.js|workbox-.*).*)',
  ],
};
