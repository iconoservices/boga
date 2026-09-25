// Horario semanal de un chofer (o de cualquier negocio): días y franjas de hora, en hora de Perú.
//
// Sirve para que el directorio de /transporte sepa SOLO quién está disponible ahora, sin que el chofer
// tenga que marcar nada: el que está dentro de su horario sale primero y en verde; el que no, sale
// apagado y diciendo cuándo vuelve.
//
// Formato guardado (columna JSONB `horario_semana`):
//   { "lun": [{ "desde": "06:00", "hasta": "13:00" }, { "desde": "16:00", "hasta": "21:00" }], "dom": [...] }
// Un día que no aparece (o con lista vacía) es día libre. Si `hasta` es menor o igual que `desde`, la
// franja cruza la medianoche (ej. 22:00 → 02:00 sigue hasta las 2 de la madrugada del día siguiente).

export const DIAS = [
  { id: 'lun', corto: 'Lun', largo: 'Lunes' },
  { id: 'mar', corto: 'Mar', largo: 'Martes' },
  { id: 'mie', corto: 'Mié', largo: 'Miércoles' },
  { id: 'jue', corto: 'Jue', largo: 'Jueves' },
  { id: 'vie', corto: 'Vie', largo: 'Viernes' },
  { id: 'sab', corto: 'Sáb', largo: 'Sábado' },
  { id: 'dom', corto: 'Dom', largo: 'Domingo' },
] as const;

export type DiaId = (typeof DIAS)[number]['id'];
export interface Franja { desde: string; hasta: string }
export type Horario = Partial<Record<DiaId, Franja[]>>;

export const FRANJA_DEFECTO: Franja = { desde: '06:00', hasta: '21:00' };
const MAX_FRANJAS_POR_DIA = 3;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const IDS = DIAS.map((d) => d.id) as DiaId[];
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Lo que llega de la base o de un formulario, limpio: solo días y franjas válidas. null si no hay ningún día con horario. */
export function normalizarHorario(v: unknown): Horario | null {
  if (!v || typeof v !== 'object') return null;
  const salida: Horario = {};
  for (const dia of IDS) {
    const lista = (v as Record<string, unknown>)[dia];
    if (!Array.isArray(lista)) continue;
    const franjas = lista
      .filter((f): f is Franja => !!f && typeof f.desde === 'string' && typeof f.hasta === 'string' && HHMM.test(f.desde) && HHMM.test(f.hasta) && f.desde !== f.hasta)
      .slice(0, MAX_FRANJAS_POR_DIA)
      .map((f) => ({ desde: f.desde, hasta: f.hasta }));
    if (franjas.length > 0) salida[dia] = franjas;
  }
  return Object.keys(salida).length > 0 ? salida : null;
}

export const tieneHorario = (h: Horario | null | undefined) => !!h && Object.values(h).some((f) => f && f.length > 0);

// ─── Hora de Perú ───
const ZONA = 'America/Lima';
const DIA_INGLES: Record<string, DiaId> = { Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab', Sun: 'dom' };

/** Día de la semana y minutos desde la medianoche, según el reloj de Perú (que no cambia por horario de verano). */
export function ahoraLima(fecha: Date = new Date()): { dia: DiaId; min: number } {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(fecha);
  const dato = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return { dia: DIA_INGLES[dato('weekday')] ?? 'lun', min: Number(dato('hour')) * 60 + Number(dato('minute')) };
}

const diaAnterior = (dia: DiaId): DiaId => IDS[(IDS.indexOf(dia) + 6) % 7];

/**
 * ¿Está dentro de su horario en este momento?
 * true / false, o null si no tiene horario cargado (no se sabe: no se marca ni como abierto ni como cerrado).
 */
export function disponibleAhora(h: Horario | null | undefined, fecha: Date = new Date()): boolean | null {
  if (!tieneHorario(h)) return null;
  const { dia, min } = ahoraLima(fecha);
  // Las franjas de hoy que empiezan antes de ahora (y terminan después, o cruzan la medianoche)…
  for (const f of h![dia] ?? []) {
    const d = minutos(f.desde), a = minutos(f.hasta);
    if (a > d ? min >= d && min < a : min >= d) return true;
  }
  // …y las de anoche que cruzaron la medianoche y todavía no terminan.
  for (const f of h![diaAnterior(dia)] ?? []) {
    const d = minutos(f.desde), a = minutos(f.hasta);
    if (a <= d && min < a) return true;
  }
  return false;
}

// ─── Textos ───
/** "06:00" → "6 am", "21:30" → "9:30 pm". */
export function fmtHora(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2)), m = hhmm.slice(3, 5);
  const sufijo = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === '00' ? `${h12} ${sufijo}` : `${h12}:${m} ${sufijo}`;
}

const franjasTxt = (f: Franja[]) => f.map((x) => `${fmtHora(x.desde)}–${fmtHora(x.hasta)}`).join(' y ');

/** Resumen corto, agrupando los días seguidos con el mismo horario: "Lun–Sáb 6 am–9 pm · Dom 8 am–12 pm". */
export function resumenHorario(h: Horario | null | undefined): string {
  if (!tieneHorario(h)) return '';
  const grupos: { dias: DiaId[]; texto: string }[] = [];
  for (const dia of IDS) {
    const f = h![dia];
    if (!f || f.length === 0) continue;
    const texto = franjasTxt(f);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === texto && IDS.indexOf(ultimo.dias[ultimo.dias.length - 1]) === IDS.indexOf(dia) - 1) ultimo.dias.push(dia);
    else grupos.push({ dias: [dia], texto });
  }
  const corto = (d: DiaId) => DIAS.find((x) => x.id === d)!.corto;
  return grupos
    .map((g) => {
      const dias = g.dias.length === 1 ? corto(g.dias[0]) : g.dias.length === 2 ? `${corto(g.dias[0])} y ${corto(g.dias[1])}` : `${corto(g.dias[0])}–${corto(g.dias[g.dias.length - 1])}`;
      return `${g.dias.length === 7 ? 'Todos los días' : dias} ${g.texto}`;
    })
    .join(' · ');
}

/** Cuándo vuelve a abrir, para el que está fuera de horario: "hoy 4 pm", "mañana 6 am", "jue 8 am". null si no hay horario. */
export function proximaApertura(h: Horario | null | undefined, fecha: Date = new Date()): string | null {
  if (!tieneHorario(h)) return null;
  const { dia, min } = ahoraLima(fecha);
  for (let salto = 0; salto <= 7; salto++) {
    const d = IDS[(IDS.indexOf(dia) + salto) % 7];
    const desdes = (h![d] ?? []).map((f) => f.desde).filter((x) => salto > 0 || minutos(x) > min).sort();
    if (desdes.length > 0) {
      const cuando = salto === 0 ? 'hoy' : salto === 1 ? 'mañana' : DIAS.find((x) => x.id === d)!.corto.toLowerCase();
      return `${cuando} ${fmtHora(desdes[0])}`;
    }
  }
  return null;
}
