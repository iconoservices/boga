import type { StoreConfig } from '@/lib/stores.config';
import { registrarPedido, generarCodigoPedido, type DatosPedido } from '@/lib/pedidos';

/**
 * Abre WhatsApp con el pedido dirigido al numero de la tienda.
 *
 * Devuelve false si la tienda todavia no configuro su numero. Antes las
 * plantillas tenian 51999999999 hardcodeado, asi que los pedidos de todas las
 * tiendas iban a un numero de relleno y ningun comerciante los recibia.
 */
export function enviarPedidoPorWhatsApp(
  store: Pick<StoreConfig, 'whatsapp' | 'name'> & { slug?: string },
  mensaje: string,
  /** Si es un pedido de carrito, también se guarda en el panel del dueño. Los mensajes de consulta o reserva no lo pasan. */
  pedido?: DatosPedido,
): boolean {
  const numero = (store.whatsapp || '').replace(/\D/g, '');

  if (!numero) {
    alert(
      `${store.name} todavía no configuró su WhatsApp de pedidos.\n\n` +
      'Si administrás esta tienda, agregalo en el panel:\n' +
      'Mis Tiendas → Editar → WhatsApp de Pedidos'
    );
    return false;
  }

  // Pedido de carrito: se le da un código, se guarda con él y el mensaje lleva el enlace al detalle (/pedido/<código>).
  let codigo: string | undefined;
  let texto = mensaje;
  if (pedido && store.slug) {
    codigo = generarCodigoPedido();
    registrarPedido(store.slug, pedido, codigo);
    const sitio = /localhost/.test(window.location.hostname)
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');
    texto = `${mensaje}

Mira el detalle de mi pedido (N° ${codigo.toUpperCase()}): ${sitio}/pedido/${codigo}`;
  }
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  // Solo los pedidos de carrito: PedidoEnviadoSheet ofrece el comprobante en PDF para guardarlo o compartirlo luego.
  if (pedido) window.dispatchEvent(new CustomEvent('boga:pedido-enviado', { detail: { tienda: store.name, mensaje, codigo } }));
  return true;
}

/** True si la tienda puede recibir pedidos. */
export function tieneWhatsApp(store: Pick<StoreConfig, 'whatsapp'>): boolean {
  return Boolean((store.whatsapp || '').replace(/\D/g, ''));
}
