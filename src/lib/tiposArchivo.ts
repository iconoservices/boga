// Tipos de archivo que se aceptan al subir a R2 (fotos.bogahub.app). Solo servidor.
//
// fotos.bogahub.app es un subdominio de bogahub.app, y la sesión vive en cookies de `.bogahub.app`
// (lib/authCookies.ts). Un .html o .svg subido ahí correría JavaScript con acceso a esas cookies:
// por eso solo se aceptan estos tipos, la extensión sale del tipo (nunca del nombre que manda el
// navegador) y se revisan los primeros bytes para que un HTML no se haga pasar por imagen.

export const IMAGENES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export const IMAGENES_Y_PDF: Record<string, string> = { ...IMAGENES, 'application/pdf': 'pdf' };

/** ¿Los primeros bytes corresponden de verdad a ese tipo? */
export function firmaCoincide(tipo: string, b: Uint8Array): boolean {
  const ascii = (desde: number, texto: string) => [...texto].every((c, i) => b[desde + i] === c.charCodeAt(0));
  switch (tipo) {
    case 'image/jpeg': return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png': return b[0] === 0x89 && ascii(1, 'PNG');
    case 'image/gif': return ascii(0, 'GIF8');
    case 'image/webp': return ascii(0, 'RIFF') && ascii(8, 'WEBP');
    case 'image/avif': return ascii(4, 'ftyp');
    case 'application/pdf': return ascii(0, '%PDF');
    default: return false;
  }
}

/** Carpeta destino segura: tramos de letras, números, guiones o puntos, sin "..", sin "/" al inicio. */
export const carpetaValida = (c: string) =>
  c.length <= 120 && /^[a-z0-9_-]+(\/[a-z0-9_.-]+)*$/i.test(c) && !c.split('/').some((t) => t === '.' || t === '..');
