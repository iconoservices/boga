// Notificaciones push del lado del navegador (BogaHub, o una tienda con su propia dirección).
// Una suscripción es del navegador; cada persona elige de qué tiendas quiere avisos (el servidor
// guarda "quién sigue a quién"). Requiere NEXT_PUBLIC_VAPID_PUBLIC_KEY; la privada vive solo en el servidor.

const CLAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const LLAVE_LOCAL = 'boga_push_sigue';

export const hayClave = () => !!CLAVE;

export const pushDisponible = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!CLAVE;

export const esIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

// En iPhone las notificaciones solo funcionan con la app instalada en la pantalla de inicio.
export const enModoApp = () =>
  typeof window !== 'undefined' &&
  (!!(window.navigator as unknown as { standalone?: boolean }).standalone || window.matchMedia('(display-mode: standalone)').matches);

const aBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

// Tiendas que esta persona sigue en este navegador (copia local; la verdad la guarda el servidor).
const leerLocal = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(LLAVE_LOCAL) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
const guardarLocal = (l: string[]) => { try { localStorage.setItem(LLAVE_LOCAL, JSON.stringify(l)); } catch { /* sin almacenamiento */ } };

// El service worker de la app lo registra next-pwa; si todavía no estuviera, se registra acá.
async function registro() {
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  // Si el navegador tenía guardado el service worker viejo (el que no lograba instalarse), se pide
  // el nuevo YA, en vez de esperar a la próxima revisión automática.
  await reg.update().catch(() => {});
  // `ready` no termina nunca si el service worker no logra activarse (p. ej. su instalación falla):
  // sin un tope, la suscripción se queda esperando en silencio. Con el tope, se muestra el motivo.
  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('el service worker no se activó en 10 s')), 10_000)),
  ]);
  return reg;
}

export async function sigueTienda(slug: string): Promise<boolean> {
  if (!pushDisponible() || Notification.permission !== 'granted') return false;
  if (!leerLocal().includes(slug)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(reg && (await reg.pushManager.getSubscription()));
}

// Vuelve a confirmar en el servidor una suscripción que el navegador ya tiene (es idempotente).
// Repara el caso "el navegador dice que sigue, pero el servidor no lo tiene" (p. ej. una falla en el
// momento de activar). Se llama en silencio al entrar, solo si la persona ya seguía ese canal.
export async function resincronizar(slug: string) {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return;
    await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), store_slug: slug }),
    });
  } catch { /* sin red: se intenta la próxima vez */ }
}

// Motivo de la última falla de `seguirTienda` (para mostrarlo y poder diagnosticar en el celular).
let ultimoMotivo = '';
export const motivoError = () => ultimoMotivo;
const texto = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 140);

export async function seguirTienda(slug: string): Promise<'ok' | 'denegado' | 'no-soportado' | 'error'> {
  ultimoMotivo = '';
  if (!pushDisponible()) { ultimoMotivo = 'este navegador no admite avisos'; return 'no-soportado'; }
  let permiso: NotificationPermission;
  try { permiso = await Notification.requestPermission(); } catch (e) { ultimoMotivo = `permiso: ${texto(e)}`; return 'error'; }
  if (permiso !== 'granted') { ultimoMotivo = `permiso ${permiso}`; return 'denegado'; }

  let reg: ServiceWorkerRegistration;
  try { reg = await registro(); } catch (e) { ultimoMotivo = `service worker: ${texto(e)}`; return 'error'; }

  let sub: PushSubscription;
  try {
    sub = (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE!) as BufferSource }));
  } catch (e) { ultimoMotivo = `suscripción: ${texto(e)}`; return 'error'; }

  let res: Response;
  try {
    res = await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), store_slug: slug }),
    });
  } catch (e) { ultimoMotivo = `sin conexión con el servidor: ${texto(e)}`; return 'error'; }
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    ultimoMotivo = `el servidor respondió ${res.status} ${cuerpo.slice(0, 100)}`;
    return 'error';
  }
  guardarLocal([...new Set([...leerLocal(), slug])]);
  return 'ok';
}

export async function dejarDeSeguir(slug: string) {
  guardarLocal(leerLocal().filter((s) => s !== slug));
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  try {
    const res = await fetch('/api/push/baja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, store_slug: slug }),
    });
    const j = await res.json().catch(() => ({}));
    // Si ya no sigue ninguna tienda, el navegador también se da de baja
    if (res.ok && j.quedan === 0) await sub.unsubscribe();
  } catch { /* sin red: queda apagado en este navegador; el servidor lo limpia cuando falle un envío */ }
}

// ── Choferes de taxi ──
// Un chofer recibe los pedidos de taxi como notificación. Se suscribe con su enlace privado (token); el
// servidor guarda a qué chofer pertenece este celular (ver /api/transporte/chofer).
export async function suscribirChofer(token: string): Promise<'ok' | 'denegado' | 'no-soportado' | 'error'> {
  ultimoMotivo = '';
  if (!pushDisponible()) { ultimoMotivo = 'este navegador no admite avisos'; return 'no-soportado'; }
  let permiso: NotificationPermission;
  try { permiso = await Notification.requestPermission(); } catch (e) { ultimoMotivo = `permiso: ${texto(e)}`; return 'error'; }
  if (permiso !== 'granted') { ultimoMotivo = `permiso ${permiso}`; return 'denegado'; }

  let reg: ServiceWorkerRegistration;
  try { reg = await registro(); } catch (e) { ultimoMotivo = `service worker: ${texto(e)}`; return 'error'; }

  let sub: PushSubscription;
  try {
    sub = (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE!) as BufferSource }));
  } catch (e) { ultimoMotivo = `suscripción: ${texto(e)}`; return 'error'; }

  try {
    const res = await fetch('/api/transporte/chofer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: token, accion: 'suscribir', subscription: sub.toJSON() }),
    });
    if (!res.ok) { ultimoMotivo = `el servidor respondió ${res.status}`; return 'error'; }
  } catch (e) { ultimoMotivo = `sin conexión con el servidor: ${texto(e)}`; return 'error'; }
  return 'ok';
}
