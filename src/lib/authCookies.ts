// Helper para compartir retorno de autenticación y sesión entre subdominios (*.bogahub.app)
import type { Session } from '@supabase/supabase-js';

export const CLAVE_AUTH_RETURN = 'boga_auth_return_url';
export const CLAVE_REABRIR_MODAL = 'boga_reopen_customer_modal';
export const CLAVE_COOKIE_ACCESS = 'boga_auth_token';
export const CLAVE_COOKIE_REFRESH = 'boga_auth_refresh';
export const DOMINIO_BASE = 'bogahub.app';
const VIGENCIA_RETORNO_MS = 10 * 60 * 1000;

// Guarda la URL de retorno con hora de vencimiento (evita rebotes por retornos viejos)
export function guardarRetornoLocal(url: string): void {
  try { localStorage.setItem(CLAVE_AUTH_RETURN, JSON.stringify({ url, exp: Date.now() + VIGENCIA_RETORNO_MS })); } catch {}
}

export function leerRetornoLocal(): string | null {
  try {
    const raw = localStorage.getItem(CLAVE_AUTH_RETURN);
    if (!raw) return null;
    const { url, exp } = JSON.parse(raw);
    if (typeof url === 'string' && typeof exp === 'number' && exp > Date.now()) return url;
    localStorage.removeItem(CLAVE_AUTH_RETURN);
  } catch { try { localStorage.removeItem(CLAVE_AUTH_RETURN); } catch {} }
  return null;
}

export function getCookieDomain(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';

  const parts = host.split('.');
  if (parts.length >= 2) {
    // Si termina en bogahub.app, retorna .bogahub.app para abarcar todos los subdominios
    const base = parts.slice(-2).join('.');
    return `.${base}`;
  }
  return '';
}

export function setAuthCookie(name: string, value: string, maxAge = 1800): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  const domainAttr = domain ? `; domain=${domain}` : '';
  const secureAttr = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${domainAttr}${secureAttr}`;
}

export function getAuthCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteAuthCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  if (domain) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; domain=${domain}`;
  }
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function esDestinoInternoValido(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) return true;

  try {
    const parsed = new URL(targetUrl, window.location.origin);
    const hostActual = window.location.hostname.toLowerCase();
    const hostDestino = parsed.hostname.toLowerCase();

    // Mismo host
    if (hostDestino === hostActual) return true;

    // Localhost (pruebas locales)
    if (hostActual === 'localhost' && hostDestino === 'localhost') return true;

    // Solo bogahub.app y sus subdominios (tiendas). Si cambia el dominio, editar aquí.
    if (hostDestino === DOMINIO_BASE || hostDestino.endsWith('.' + DOMINIO_BASE)) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Prepara la URL final de redirección.
 * Si el destino está en un subdominio diferente (ej. de bogahub.app a dhafana.bogahub.app),
 * inyecta los tokens en el hash para que Supabase en el subdominio arme la sesión de inmediato.
 */
export function construirUrlRetornoConSesion(targetUrl: string, sess: Session | null): string {
  if (!sess || typeof window === 'undefined') return targetUrl;

  try {
    const parsedTarget = new URL(targetUrl, window.location.origin);
    const esDistintoHost = parsedTarget.hostname.toLowerCase() !== window.location.hostname.toLowerCase();

    if (esDistintoHost && sess.access_token && sess.refresh_token) {
      const urlBase = targetUrl.split('#')[0];
      const hashActual = window.location.hash;
      if (hashActual && hashActual.includes('access_token=')) {
        return `${urlBase}${hashActual}`;
      }
      return `${urlBase}#access_token=${encodeURIComponent(sess.access_token)}&refresh_token=${encodeURIComponent(sess.refresh_token)}&token_type=bearer&type=bearer`;
    }
  } catch {
    // Si es relativa, mismo host
  }

  return targetUrl;
}
