import type { StoreConfig } from '@/lib/stores.config';

/**
 * Decide si una tienda muestra los productos de ejemplo de su plantilla.
 *
 * Los demo existen para que una tienda recien creada no se vea vacia mientras
 * el comerciante todavia no cargo nada. En una tienda que ya vende son un
 * problema serio: el cliente final pide un plato que no existe en ese local.
 *
 * Dos reglas, en este orden:
 *
 * 1. Si la tienda tiene productos propios, no se muestran demo. Nunca. Es una
 *    red de seguridad: aunque el comerciante se olvide de destildar la opcion,
 *    sus clientes no ven platos falsos.
 * 2. Si esta vacia, manda lo que la tienda tenga guardado en `show_demo_products`.
 *    Por defecto si (columna nueva -> undefined -> true).
 *
 * OJO con el historial: antes esto se decidia con un flag en localStorage
 * (`boga_demo_products`), asi que apagarlo en la compu del superadmin no
 * apagaba nada en el celular del cliente. La decision tiene que viajar en los
 * datos de la tienda, no en el navegador de quien la administra.
 */
export function debeMostrarDemo(
  store: Pick<StoreConfig, 'showDemoProducts'>,
  cantidadDeProductosPropios: number
): boolean {
  if (cantidadDeProductosPropios > 0) return false;
  return store.showDemoProducts !== false;
}
