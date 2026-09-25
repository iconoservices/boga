// Zonas de Pucallpa para el taxi. Sirven cuando no hay GPS exacto:
//  · el pasajero que no da su ubicación elige en qué zona está;
//  · el chofer marca "estoy en…" para que le lleguen los pedidos de esa zona primero.
//
// Las coordenadas son el centro APROXIMADO de cada zona (basta para ordenar por cercanía).
// Con GPS real o con el paradero guardado por el chofer, la distancia es exacta y esto no se usa.

export interface ZonaTransporte { id: string; nombre: string; lat: number; lng: number }

export const ZONAS_TRANSPORTE: ZonaTransporte[] = [
  { id: 'centro', nombre: 'Centro / Plaza de Armas', lat: -8.3791, lng: -74.5539 },
  { id: 'aeropuerto', nombre: 'Aeropuerto', lat: -8.3779, lng: -74.5743 },
  { id: 'yarinacocha', nombre: 'Yarinacocha', lat: -8.344, lng: -74.584 },
  { id: 'manantay', nombre: 'Manantay', lat: -8.4, lng: -74.54 },
];

export const zonaPorId = (id: string | null | undefined) => ZONAS_TRANSPORTE.find((z) => z.id === id) ?? null;

export const TIPOS_PEDIDO = ['Mototaxi', 'Auto', 'Moto'] as const;

/** Dónde se recuerda, en el celular del pasajero, su último pedido de taxi (para retomarlo si cierra la página). */
export const CLAVE_PEDIDO_TAXI = 'boga_pedido_taxi';
