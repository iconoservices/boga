// Límites de las campañas de notificaciones, para que la gente no termine silenciando los avisos.
// Se cambian acá, en un solo lugar. Por ahora son iguales para todas las tiendas; más adelante
// pueden depender del plan de cada una (columna `plan` / cupo especial), sin tocar el resto.
export const PUSH_LIMITES = {
  maxPorSemana: 1,      // campañas de una tienda en los últimos 7 días
  maxPorDia: 1,         // ...y en las últimas 24 horas
  horaDesde: 8,         // no se envía antes de esta hora (Lima)
  horaHasta: 22,        // ni a partir de esta hora (Lima)
  zona: 'America/Lima',
  // El superadmin (BogaHub como plataforma) no tiene tope de campañas, pero sí respeta el horario.
  superadminSinTope: true,
};

/** Canal reservado: avisos de la propia plataforma (solo los envía el superadmin). */
export const CANAL_BOGA = 'boga';

export const horaEnLima = (d = new Date()) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: PUSH_LIMITES.zona, hour: 'numeric', hourCycle: 'h23' }).format(d));

export const dentroDeHorario = (d = new Date()) => {
  const h = horaEnLima(d);
  return h >= PUSH_LIMITES.horaDesde && h < PUSH_LIMITES.horaHasta;
};
