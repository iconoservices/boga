import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Cifrado de las claves de cobro de cada comercio (Izipay) antes de guardarlas en la base.
//
// AES-256-GCM con la llave `PAGOS_ENC_KEY` (variable de entorno del servidor, 32 bytes en base64 o 64 en hex).
// Las claves nunca se guardan en claro ni se devuelven al navegador: el panel solo sabe si están puestas.
// Sin la variable, guardar claves falla a propósito (mejor que dejarlas legibles).

function llave(): Buffer {
  const v = (process.env.PAGOS_ENC_KEY || '').trim();
  if (!v) throw new Error('Falta PAGOS_ENC_KEY en el servidor');
  const buf = /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, 'hex') : Buffer.from(v, 'base64');
  if (buf.length !== 32) throw new Error('PAGOS_ENC_KEY debe ser de 32 bytes (base64 o hex de 64 caracteres)');
  return buf;
}

export const cifradoDisponible = () => {
  try { llave(); return true; } catch { return false; }
};

/** Devuelve `v1.<iv>.<tag>.<texto cifrado>` (todo en base64url). */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', llave(), iv);
  const ct = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
}

export function descifrar(valor: string): string {
  const [v, iv, tag, ct] = valor.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Formato de clave cifrada no válido');
  const d = createDecipheriv('aes-256-gcm', llave(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
}
