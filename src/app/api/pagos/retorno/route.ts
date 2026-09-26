import { clienteServicio } from '@/lib/pushServidor';
import { procesarNotificacion } from '@/lib/izipay';

// A esta URL manda Izipay al cliente (kr-post-url-success) cuando el pago se procesó, con el resultado firmado
// (kr-answer + kr-hash). Se valida la firma con la clave HMAC-SHA-256 de la tienda, se marca el pedido como «Pagado» y
// se lleva al cliente a su pedido. La firma es lo que impide que alguien "se pague solo" entrando a esta URL a mano.

export const dynamic = 'force-dynamic';

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');
const ir = (ruta: string) => Response.redirect(`${SITIO}${ruta}`, 303);

export async function POST(request: Request) {
  const db = clienteServicio();
  if (!db) return ir('/');
  const f = await request.formData().catch(() => null);
  const campos: Record<string, string> = {};
  f?.forEach((v, k) => { if (typeof v === 'string') campos[k] = v; });

  const r = await procesarNotificacion(db, campos);
  if (!r.ok) {
    console.error('[pagos/retorno] notificación rechazada:', r.motivo);
    return new Response('No se pudo validar el pago. Si te cobraron, escríbele a la tienda con tu código de pedido.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (r.estado === 'pagado') return ir(`/pedido/${r.codigo}?pago=ok`);
  return ir(`/pagar/${r.codigo}?error=1`);
}

// Si alguien abre esta dirección a mano (GET), no hay nada que hacer.
export function GET() { return ir('/'); }
