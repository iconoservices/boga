import { clienteServicio } from '@/lib/pushServidor';
import { procesarNotificacion } from '@/lib/izipay';

// IPN (notificación instantánea) de Izipay para UNA tienda: Izipay avisa aquí, de servidor a servidor, el resultado de cada
// pago. Es la confirmación que no depende de que el cliente vuelva a la página (cerró el navegador, se cayó la señal…).
// Cada comercio pega esta URL en su Back Office de Izipay (Reglas de notificación → «URL de notificación al final del
// pago»); el panel de su tienda se la muestra. La firma se valida con la clave de API de la tienda (kr-hash-key = password).

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,80}$/;
const TEXTO = { 'Content-Type': 'text/plain; charset=utf-8' };

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = clienteServicio();
  if (!db || !SLUG.test(slug)) return new Response('Servicio no disponible', { status: 503, headers: TEXTO });

  const f = await request.formData().catch(() => null);
  const campos: Record<string, string> = {};
  f?.forEach((v, k) => { if (typeof v === 'string') campos[k] = v; });

  const r = await procesarNotificacion(db, campos, slug);
  if (!r.ok) {
    console.error('[pagos/ipn]', slug, 'rechazada:', r.motivo);
    return new Response('Notificación no válida', { status: 400, headers: TEXTO });
  }
  return new Response(`OK! OrderStatus is ${r.estado}`, { status: 200, headers: TEXTO });
}
