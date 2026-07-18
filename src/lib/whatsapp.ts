import type { StoreConfig } from '@/lib/stores.config';

/**
 * Abre WhatsApp con el pedido dirigido al numero de la tienda.
 *
 * Devuelve false si la tienda todavia no configuro su numero. Antes las
 * plantillas tenian 51999999999 hardcodeado, asi que los pedidos de todas las
 * tiendas iban a un numero de relleno y ningun comerciante los recibia.
 */
export function enviarPedidoPorWhatsApp(store: Pick<StoreConfig, 'whatsapp' | 'name'>, mensaje: string): boolean {
  const numero = (store.whatsapp || '').replace(/\D/g, '');

  if (!numero) {
    alert(
      `${store.name} todavía no configuró su WhatsApp de pedidos.\n\n` +
      'Si administrás esta tienda, agregalo en el panel:\n' +
      'Mis Tiendas → Editar → WhatsApp de Pedidos'
    );
    return false;
  }

  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  return true;
}

/** True si la tienda puede recibir pedidos. */
export function tieneWhatsApp(store: Pick<StoreConfig, 'whatsapp'>): boolean {
  return Boolean((store.whatsapp || '').replace(/\D/g, ''));
}
