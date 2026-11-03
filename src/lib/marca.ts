// Datos de la marca que leen los buscadores y las IAs (datos estructurados y /llms.txt). Un solo lugar.
// Sirven para que las IAs identifiquen a BogaHub como UNA entidad aunque el nombre aparezca de varias formas.

export const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app').replace(/\/$/, '');

export const MARCA = {
  nombre: 'BogaHub',
  alias: ['Boga Market', 'Boga', 'Boga Hub', 'Directorio Comercial Pucallpa', 'Directorio Turístico Pucallpa'],
  descripcion:
    'Directorio Comercial y Turístico de Pucallpa (Ucayali, Perú): comercios, restaurantes, hoteles, tours, ' +
    'delivery, Taxi Seguro con choferes verificados, empleos, inmuebles, viajes, agenda de eventos y la Revista «De la Selva». Todo Pucallpa en una sola plataforma.',
  ciudad: 'Pucallpa',
  region: 'Ucayali',
  pais: 'PE',
} as const;

// Páginas oficiales de BogaHub en otros sitios (Facebook de «De la Selva», Instagram, TikTok, Google Business Profile…).
// Pega aquí las direcciones completas: salen en los datos estructurados como `sameAs`, que es lo que usan las IAs y Google para
// confirmar que esas cuentas y este sitio son la misma marca. Solo enlaces que sean realmente tuyos.
export const REDES: string[] = [];
