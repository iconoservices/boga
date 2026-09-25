// Avisos push de BogaHub y de las tiendas con su propia dirección.
// Lo importa el service worker (public/sw.js con importScripts, y next.config.ts en workboxOptions
// por si se regenera), así que el modo sin red y la caché siguen igual.

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(
    self.registration.showNotification(d.title || 'BogaHub', {
      body: d.body || '',
      icon: d.icon || '/notif-icon-192.png',
      badge: '/badge-96.png',
      tag: d.tag || 'bogahub',
      // Los pedidos de taxi piden atención: se quedan en pantalla hasta que el chofer los toque y vibran.
      requireInteraction: d.requireInteraction === true,
      vibrate: Array.isArray(d.vibrate) ? d.vibrate : undefined,
      data: { url: d.url || '/' },
    }),
  );
});

// Al tocar el aviso: enfoca la app si ya está abierta, o la abre en el link del aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const abierta = cs.find((c) => 'focus' in c);
      if (abierta) { if ('navigate' in abierta) abierta.navigate(url); return abierta.focus(); }
      return self.clients.openWindow(url);
    }),
  );
});
