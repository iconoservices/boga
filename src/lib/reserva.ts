// Reservas: productos que el cliente reserva por WhatsApp en vez de comprar al momento (sin stock, por encargo…).
//
//  · La tienda las prende con `stores.reserva_activa` (apagado por defecto).
//  · Con la tienda prendida, un producto se ofrece como reserva ÚNICAMENTE si el dueño lo activó
//    explícitamente (`products.reserva === true`). Si no se activó, un producto agotado o con stock 0
//    aparece como agotado y no como reserva.
//  · Solo las plantillas de esta lista saben pintar «Reservar»; en las demás no se piden los agotados.

export const PLANTILLAS_CON_RESERVA = new Set([
  'delva', 'default', 'bazar', 'belleza', 'detalles', 'fichadigital', 'fichaplana', 'flores', 'gas', 'helados',
  'iniciocatalogo', 'menudirecto', 'polleria', 'rack', 'tecnologia', 'uniformes', 'veterinaria',
]);

export const plantillaConReserva = (template: unknown) => PLANTILLAS_CON_RESERVA.has(String(template));

/** ¿Se ofrece como reserva? Solo si el producto fue marcado explícitamente como reservable (reserva = true). */
export function esReservable(p: { status?: string | null; reserva?: boolean | null; con_stock?: boolean }): boolean {
  return p.reserva === true;
}
