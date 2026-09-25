// Registro de los pedidos de la carta (ver src/app/api/pedidos/route.ts).
//
// Es un registro extra: el pedido por WhatsApp sale igual aunque esto falle. Se manda solo
// qué productos y cuántos; el servidor pone los precios leyéndolos de la base.

export interface DatosPedido {
  /** Productos del carrito. Los que no existen en la base (ejemplos de plantilla) el servidor los descarta. */
  items: { id: string; quantity: number }[];
  cliente?: { nombre?: string; telefono?: string; direccion?: string; entrega?: 'delivery' | 'recojo' };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guarda el pedido sin esperar respuesta y sin molestar al cliente si falla. */
export function registrarPedido(slug: string, pedido: DatosPedido): void {
  try {
    const items = pedido.items.filter((i) => UUID.test(String(i.id)) && i.quantity > 0);
    if (!slug || items.length === 0) return;
    void fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store: slug, items, cliente: pedido.cliente }),
      keepalive: true,   // sigue viajando aunque la pestaña se vaya a WhatsApp
    }).catch(() => {});
  } catch { /* nunca debe romper el pedido */ }
}
