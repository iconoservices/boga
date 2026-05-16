import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true, // Activa la actualización silenciosa
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de Next.js
  turbopack: {}
};

export default withPWA(nextConfig);
