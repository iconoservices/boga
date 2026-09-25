// Avisos push de BogaHub y de las tiendas con su propia dirección.
// Lo importa el service worker (public/sw.js con importScripts, y next.config.ts en workboxOptions
// por si se regenera), así que el modo sin red y la caché siguen igual.

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'BogaHub', {
      body: d.body || '',
      icon: d.icon || '/notif-icon-192.png',
      badge: '/badge-96.png',
      tag: d.tag || 'bogahub',
      // Los pedidos de taxi piden atención: se quedan en pantalla hasta que el chofer los toque y vibran.
      requireInteraction: d.requireInteraction === true,
      vibrate: Array.isArray(d.vibrate) ? d.vibrate : undefined,
      actions: Array.isArray(d.actions) ? d.actions : undefined,
      data: { url: d.url || '/', aceptar: d.aceptar || null },
    });
    // Un aviso de "ya no está disponible" reemplaza al del pedido (mismo tag) y se cierra solo a los pocos segundos.
    if (d.cerrarEnSeg) {
      await new Promise((r) => setTimeout(r, Number(d.cerrarEnSeg) * 1000));
      const abiertas = await self.registration.getNotifications({ tag: d.tag || 'bogahub' });
      abiertas.forEach((n) => n.close());
    }
  })());
});

// Al tocar el aviso: enfoca la app si ya está abierta, o la abre en el link del aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const datos = event.notification.data || {};
  const url = datos.url || '/';

  // Botón "Aceptar viaje" de un pedido de taxi: acepta sin abrir la app y avisa cómo le fue.
  if (event.action === 'aceptar' && datos.aceptar && datos.aceptar.t) {
    event.waitUntil((async () => {
      let r = null;
      try {
        const res = await fetch('/api/transporte/chofer', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ t: datos.aceptar.t, accion: 'aceptar', pedido_id: datos.aceptar.id }),
        });
        r = await res.json();
      } catch (e) { /* sin red: se le avisa abajo */ }
      const ok = !!(r && r.ok);
      const motivo = r && r.motivo;
      await self.registration.showNotification(ok ? '✓ Viaje aceptado' : 'No se pudo aceptar el viaje', {
        body: ok ? 'Toca para ver los datos del pasajero y cómo llegar.'
          : motivo === 'tomado' ? 'Otro chofer ya tomó este viaje.'
          : motivo === 'cerrado' ? 'El pasajero ya canceló o se venció.'
          : motivo === 'ocupado' ? 'Termina tu viaje actual antes de aceptar otro.'
          : 'Abre la app e inténtalo de nuevo.',
        icon: '/notif-icon-192.png', badge: '/badge-96.png',
        tag: 'taxi-' + datos.aceptar.id, requireInteraction: ok,
        data: { url: '/transporte/chofer' },
      });
    })());
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const abierta = cs.find((c) => 'focus' in c);
      if (abierta) { if ('navigate' in abierta) abierta.navigate(url); return abierta.focus(); }
      return self.clients.openWindow(url);
    }),
  );
});
