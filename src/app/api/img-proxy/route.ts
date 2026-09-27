import { NextResponse } from 'next/server';

// Devuelve una imagen de nuestro almacén (o de las plantillas) desde ESTE mismo dominio.
//
// Sirve para sacar la paleta de colores de un logo en el navegador (lib/extractThemeClient.ts): la librería
// necesita leer los píxeles, y el navegador solo lo permite si la imagen viene con CORS o del mismo origen.
// fotos.bogahub.app (R2) no manda cabeceras CORS, así que con un logo ya subido la extracción fallaba
// ("No se pudieron sacar colores de esa imagen") y solo funcionaba con uno recién elegido del equipo.
//
// Solo acepta https y dominios de la lista de abajo: no es un proxy abierto.

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;

function hostsPermitidos(): Set<string> {
  const hosts = new Set(['fotos.bogahub.app', 'images.unsplash.com']);
  try {
    if (process.env.R2_PUBLIC_URL) hosts.add(new URL(process.env.R2_PUBLIC_URL).host);
  } catch { /* variable mal escrita: quedan los fijos */ }
  return hosts;
}

export async function GET(request: Request) {
  const u = new URL(request.url).searchParams.get('u') || '';
  let destino: URL;
  try { destino = new URL(u); } catch { return NextResponse.json({ error: 'url' }, { status: 400 }); }
  if (destino.protocol !== 'https:' || !hostsPermitidos().has(destino.host)) {
    return NextResponse.json({ error: 'dominio no permitido' }, { status: 400 });
  }

  try {
    const r = await fetch(destino.toString(), { signal: AbortSignal.timeout(10_000), redirect: 'error' });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || !tipo.startsWith('image/')) return NextResponse.json({ error: 'no es una imagen' }, { status: 502 });
    const largo = Number(r.headers.get('content-length') || 0);
    if (largo > MAX_BYTES) return NextResponse.json({ error: 'muy grande' }, { status: 413 });
    const bytes = await r.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: 'muy grande' }, { status: 413 });
    return new NextResponse(bytes, {
      headers: { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'no se pudo leer la imagen' }, { status: 502 });
  }
}
