import { RUTAS_PLANTILLA } from './rutasTienda';

/**
 * Estándar de construcción de plantillas (ver docs/plantillas-estandar.md). Es lo que muestra /superadmin/mapa.
 * Se mantiene A MANO: al agregar una pieza a una plantilla, se anota aquí para que el mapa no mienta.
 * `rutas` sale solo de lib/rutasTienda.ts.
 */
export const PIEZAS_ESTANDAR = [
  { id: 'motor', label: 'Motor', icon: 'engineering', desc: 'Usa el motor compartido (useCatalogo): productos reales, carrito, WhatsApp, ofertas, medidas y otras monedas.' },
  { id: 'rutas', label: 'Rutas', icon: 'link', desc: 'Cada pestaña tiene su propia dirección (/tienda/pestaña).' },
  { id: 'favoritos', label: 'Favoritos', icon: 'favorite', desc: 'Corazón para guardar productos.' },
  { id: 'cuenta', label: 'Cuenta', icon: 'account_circle', desc: 'Botón de cuenta del cliente en el encabezado.' },
  { id: 'fotos', label: 'Fotos', icon: 'photo_library', desc: 'Con varias fotos, la tarjeta las cambia sola (mouse encima en PC; a la vista en celular).' },
] as const;

export type PiezaEstandar = (typeof PIEZAS_ESTANDAR)[number]['id'];

const lista = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const MOTOR = lista('academia bazar belleza delva detalles empresa fichadigital fichaplana flores gas helados iniciocatalogo menudirecto mercado condimentos polleria rack tecnologia terreno1 terreno2 uniformes veterinaria default');
const FAVORITOS = lista('atelier lookbook bazar belleza delva detalles fichadigital fichaplana flores gas helados iniciocatalogo menudirecto polleria rack tecnologia uniformes veterinaria default');
const CUENTA = lista('academia atelier bazar belleza delva detalles discoteca empresa fichadigital fichaplana flores gas helados iniciocatalogo lookbook menudirecto mercado condimentos polleria rack tecnologia uniformes veterinaria default');
// Todas las plantillas con tarjeta de producto ya cambian las fotos solas (14 oct 2026: se sumaron las últimas 14).
const FOTOS_EXCEPTO = lista('');

export function cumpleEstandar(plantilla: string, pieza: PiezaEstandar): boolean {
  switch (pieza) {
    case 'motor': return MOTOR.has(plantilla);
    case 'rutas': return plantilla in RUTAS_PLANTILLA;
    case 'favoritos': return FAVORITOS.has(plantilla);
    case 'cuenta': return CUENTA.has(plantilla);
    case 'fotos': return !FOTOS_EXCEPTO.has(plantilla);
  }
}
