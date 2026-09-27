// ¿Esta tienda puede instalarse como SU propia app?
//
// Regla: solo si tiene una dirección propia — un subdominio activo (<tienda>.bogahub.app), un dominio propio
// (mitienda.pe) o un enlace externo propio (p. ej. Delva). Una tienda que solo vive en una ruta
// (bogahub.app/<tienda>) no tiene app propia: al tocar "Instalar" se instala BogaHub, con el nombre y los íconos de Boga
// (ver app/manifest.json/route.ts y app/[slug]/page.tsx). El logo de la tienda queda solo en la pestaña y al compartir.

export function tieneAppPropia(t: {
  subdominioActivo?: boolean | null;
  modulos?: unknown;
  externalUrl?: string | null;
}): boolean {
  if (t.subdominioActivo) return true;
  if (t.externalUrl) return true;
  // Dominio propio: el mismo criterio que proxy.ts (modulos.dominio_propio_url o modulos.dominio_propio).
  const m = (t.modulos ?? {}) as { dominio_propio_url?: unknown; dominio_propio?: unknown };
  return (typeof m.dominio_propio_url === 'string' && m.dominio_propio_url.trim() !== '')
    || (typeof m.dominio_propio === 'string' && m.dominio_propio.trim() !== '');
}
