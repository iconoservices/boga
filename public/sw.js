// Service worker de BogaHub.
//
// Antes este archivo lo generaba next-pwa con una lista de archivos para guardar en la instalación
// ("precache"). Pero Boga se compila con Turbopack, que no regenera ese archivo: quedó una lista de
// 59 archivos de un compilado antiguo que ya no existen (404), y por eso el service worker NUNCA
// terminaba de instalarse. Sin un service worker activo no se pueden suscribir las notificaciones.
//
// Ahora es mínimo a propósito: no guarda nada en caché (todo va directo a la red, como una web
// normal) y solo recibe notificaciones push. Si algún día se quiere modo sin red, se hace con una
// estrategia que no dependa de nombres de archivo de un compilado.
importScripts('/push-sw.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
