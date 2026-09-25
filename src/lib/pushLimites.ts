// Límites de las campañas de notificaciones, para que la gente no termine silenciando los avisos.
// Se cambian acá, en un solo lugar.
//
// El cupo es MENSUAL (se renueva el día 1, hora de Lima) y sale de un ritmo semanal que se acumula
// dentro del mes: App = 2 por semana (8 al mes); una tienda sin subdominio = 1 por semana (4 al mes).
// Encima del cupo se pueden comprar paquetes (stores.push_creditos): no vencen y se gastan solo cuando
// el cupo del mes ya se usó. El tope de 1 por día y el horario no se saltan con paquetes.
export const PUSH_LIMITES = {
  porSemanaApp: 2,      // tienda con subdominio propio (plan App)
  porSemanaBase: 1,     // el resto
  semanasPorMes: 4,
  maxPorDia: 1,         // campañas de una tienda en las últimas 24 horas
  horaDesde: 8,         // no se envía antes de esta hora (Lima)
  horaHasta: 22,        // ni a partir de esta hora (Lima)
  zona: 'America/Lima',
  // El superadmin (BogaHub como plataforma) no tiene tope de campañas, pero sí respeta el horario.
  superadminSinTope: true,
};

/** Avisos que trae cada paquete comprado (S/ 10). */
export const PUSH_PAQUETE = 4;

/** Campañas incluidas por mes según el plan de la tienda. */
export const cupoMensual = (conSubdominio: boolean) =>
  (conSubdominio ? PUSH_LIMITES.porSemanaApp : PUSH_LIMITES.porSemanaBase) * PUSH_LIMITES.semanasPorMes;

/** Inicio del mes actual en hora de Lima (UTC-5 fijo, sin horario de verano). */
export const inicioDeMesLima = (d = new Date()) => {
  const l = new Date(d.getTime() - 5 * 3_600_000);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), 1, 5));
};

/** Canal reservado: avisos de la propia plataforma (solo los envía el superadmin). */
export const CANAL_BOGA = 'boga';

export const horaEnLima = (d = new Date()) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: PUSH_LIMITES.zona, hour: 'numeric', hourCycle: 'h23' }).format(d));

export const dentroDeHorario = (d = new Date()) => {
  const h = horaEnLima(d);
  return h >= PUSH_LIMITES.horaDesde && h < PUSH_LIMITES.horaHasta;
};
