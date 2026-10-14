// Reservas: productos que el cliente reserva por WhatsApp en vez de comprar al momento (sin stock, por encargo…).
//
//  · La tienda las prende con `stores.reserva_activa` (apagado por defecto).
//  · Con la tienda prendida, un producto se ofrece como reserva si `products.reserva` es true (siempre),
//    o si no se decidió (null) y está Agotado CON stock real (un producto de stock ilimitado no se agota: no va a reserva solo).
//    Con `reserva = false` nunca: si está Agotado, se esconde como antes.
//  · Solo las plantillas de esta lista saben pintar «Reservar»; en las demás no se piden los agotados.

export const PLANTILLAS_CON_RESERVA = new Set([
  'delva', 'default', 'bazar', 'belleza', 'detalles', 'fichadigital', 'fichaplana', 'flores', 'gas', 'helados',
  'iniciocatalogo', 'menudirecto', 'polleria', 'rack', 'tecnologia', 'uniformes', 'veterinaria',
]);

export const plantillaConReserva = (template: unknown) => PLANTILLAS_CON_RESERVA.has(String(template));

/** ¿Se ofrece como reserva? Ya con la tienda prendida (reservaActiva) y su plantilla compatible. */
export function esReservable(p: { status?: string | null; reserva?: boolean | null; con_stock?: boolean }): boolean {
  if (p.reserva === true) return true;
  if (p.reserva === false) return false;
  // `con_stock` lo manda la API: true si el producto lleva la cuenta de unidades (ver stockIlimitado en lib/stock.ts).
  return p.status === 'Agotado' && p.con_stock === true;
}
