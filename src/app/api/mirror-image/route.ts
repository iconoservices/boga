import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { uploadToR2 } from '@/lib/r2';

// Guarda en R2 una COPIA de una imagen que vive en otra web (p. ej. Facebook).
// Los enlaces de fbcdn caducan a los pocos días y muchos bloqueadores los cortan;
// con la copia en nuestro almacén la imagen no depende de nadie más.
//
// Seguridad: solo usuarios con sesión (igual que /api/upload); solo http(s); se
// rechazan direcciones privadas o locales (anti-SSRF), también en redirecciones;
// solo se aceptan respuestas image/* de hasta 10 MB.

const MAX_BYTES = 10 * 1024 * 1024;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

function esIpPrivada(ip: string): boolean {
  if (ip.includes(':')) {
    const l = ip.toLowerCase();
    return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function hostSeguro(u: URL): Promise<boolean> {
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const h = u.hostname;
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (isIP(h)) return !esIpPrivada(h);
  try {
    const res = await lookup(h, { all: true });
    return res.length > 0 && res.every((r) => !esIpPrivada(r.address));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado: la petición no trajo la sesión (vuelve a iniciar sesión)' }, { status: 401 });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    // Se dice la causa real: "invalid JWT / expired" = la sesión venció (volver a entrar);
    // "Invalid API key" = la llave SUPABASE_SERVICE_ROLE_KEY de Vercel está mal o vacía.
    console.error('[mirror-image] getUser falló:', authError?.message);
    return NextResponse.json({ error: `No autorizado: ${authError?.message || 'sesión inválida'}` }, { status: 403 });
  }

  let url = '';
  let folder = '';
  try {
    const body = await request.json();
    url = String(body.url || '');
    folder = String(body.folder || '');
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  if (!url || !folder || !/^[a-z0-9_-]+$/i.test(folder)) {
    return NextResponse.json({ error: 'Falta la dirección o la carpeta destino' }, { status: 400 });
  }

  // Seguir redirecciones a mano, revisando cada salto.
  let actual: URL;
  try { actual = new URL(url); } catch { return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 }); }
  let resp: Response | null = null;
  for (let salto = 0; salto < 4; salto++) {
    if (!(await hostSeguro(actual))) return NextResponse.json({ error: 'Dirección no permitida' }, { status: 400 });
    try {
      resp = await fetch(actual, {
        headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return NextResponse.json({ error: 'No se pudo descargar la imagen (¿el enlace caducó?)' }, { status: 502 });
    }
    if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
      actual = new URL(resp.headers.get('location')!, actual);
      continue;
    }
    break;
  }
  if (!resp || !resp.ok) return NextResponse.json({ error: 'No se pudo descargar la imagen (¿el enlace caducó?)' }, { status: 502 });

  const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const ext = EXT[tipo];
  if (!ext) return NextResponse.json({ error: 'Esa dirección no es una imagen' }, { status: 415 });

  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length === 0) return NextResponse.json({ error: 'La imagen vino vacía (¿el enlace caducó?)' }, { status: 502 });
  if (buffer.length > MAX_BYTES) return NextResponse.json({ error: 'La imagen pesa más de 10 MB' }, { status: 413 });

  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    return NextResponse.json({ url: await uploadToR2(key, buffer, tipo) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al guardar en R2' }, { status: 500 });
  }
}
