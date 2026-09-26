import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching } from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    // Avisos push (public/push-sw.js): se importan dentro del service worker generado
    importScripts: ["/push-sw.js"],
    runtimeCaching: [
      ...runtimeCaching,
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offline-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60,
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/alquileres',
        destination: '/inmuebles',
        permanent: true,
      },
      // La sección de empleos y oficios se llamaba /servicios; ahora es /trabajos.
      // Los enlaces viejos (compartidos, Google) siguen funcionando.
      {
        source: '/servicios',
        destination: '/trabajos',
        permanent: true,
      },
      // Pandero se quitó de BogaHub; Servicios vive dentro de «Tiendas y servicios» del Market (temporales: pueden volver).
      { source: '/pandero', destination: '/market', permanent: false },
      { source: '/servicios-locales', destination: '/explore?vista=servicios', permanent: false },
      // Taxi Seguro pasó a llamarse /transporte: los enlaces viejos (y el registro de choferes) siguen funcionando.
      { source: '/taxi-seguro', destination: '/transporte', permanent: true },
      { source: '/taxi-seguro/:path*', destination: '/transporte/:path*', permanent: true },
      // El Mostrador pasó a llamarse Productos: los enlaces viejos siguen funcionando.
      { source: '/mostrador', destination: '/productos', permanent: true },
      { source: '/mostrador/:path*', destination: '/productos/:path*', permanent: true },
      // Otras formas de escribirla a mano.
      { source: '/trabajo', destination: '/trabajos', permanent: true },
      { source: '/empleos', destination: '/trabajos', permanent: true },
    ];
  },
};

export default withPWA(nextConfig);
