// Helper client-side para registrar clics derivados a WhatsApp hacia comercios.
// Usa navigator.sendBeacon o fetch con keepalive para garantizar que el clic se guarde
// en Supabase incluso si el navegador abre inmediatamente WhatsApp.

export function trackWhatsappClick(data: {
  slug: string;
  tipo?: 'pedido' | 'contacto' | 'link_directo' | 'guia' | 'trabajo' | 'inmueble' | string;
  origen?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    if (typeof window === 'undefined') return;

    const payload = JSON.stringify({
      slug: data.slug || 'general',
      tipo: data.tipo || 'contacto',
      origen: data.origen || window.location.pathname,
      metadata: data.metadata || {},
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track/whatsapp', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silencioso para no interferir con la navegación del usuario
  }
}
