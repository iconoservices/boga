'use client';

// Selector de horario semanal: se marcan los días y se elige desde qué hora hasta qué hora (se pueden
// poner dos o tres turnos por día). Lo usan el formulario de postulación de choferes y el panel del
// superadmin. Devuelve un `Horario` (ver lib/horario.ts), que el directorio usa para saber solo quién
// está disponible ahora.

import { useEffect, useRef } from 'react';
import { DIAS, FRANJA_DEFECTO, resumenHorario, tieneHorario, type DiaId, type Franja, type Horario } from '@/lib/horario';

const MAX_FRANJAS = 3;

const PRESETS: { texto: string; dias: DiaId[] }[] = [
  { texto: 'Lun–Vie', dias: ['lun', 'mar', 'mie', 'jue', 'vie'] },
  { texto: 'Lun–Sáb', dias: ['lun', 'mar', 'mie', 'jue', 'vie', 'sab'] },
  { texto: 'Todos los días', dias: ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] },
];

export default function SelectorHorario({
  value, onChange, acento = '#00875A',
}: {
  value: Horario;
  onChange: (h: Horario) => void;
  /** Color de lo marcado (el verde de Taxi Seguro por defecto). */
  acento?: string;
}) {
  // Siempre se parte del último valor (no del de la última pintura): así dos toques seguidos no se pisan.
  const ultimo = useRef(value);
  useEffect(() => { ultimo.current = value; }, [value]);
  const cambiar = (h: Horario) => { ultimo.current = h; onChange(h); };

  // La franja que se copia a un día que se prende: la del primer día que ya tenga horario, o 6 am–9 pm.
  const franjaBase = (): Franja[] => {
    const primero = DIAS.map((d) => ultimo.current[d.id]).find((f) => f && f.length > 0);
    return (primero ?? [FRANJA_DEFECTO]).map((f) => ({ ...f }));
  };

  const poner = (dia: DiaId, franjas: Franja[] | null) => {
    const siguiente: Horario = { ...ultimo.current };
    if (franjas && franjas.length > 0) siguiente[dia] = franjas;
    else delete siguiente[dia];
    cambiar(siguiente);
  };

  const alternarDia = (dia: DiaId) => poner(dia, ultimo.current[dia] && ultimo.current[dia]!.length > 0 ? null : franjaBase());

  const cambiarFranja = (dia: DiaId, i: number, campo: keyof Franja, v: string) =>
    poner(dia, (ultimo.current[dia] ?? []).map((f, j) => (j === i ? { ...f, [campo]: v } : f)));

  const preset = (dias: DiaId[]) => {
    const base = franjaBase();
    const siguiente: Horario = {};
    for (const d of dias) siguiente[d] = ultimo.current[d] && ultimo.current[d]!.length > 0 ? ultimo.current[d] : base.map((f) => ({ ...f }));
    cambiar(siguiente);
  };

  const copiarDelPrimero = () => {
    const activos = DIAS.filter((d) => ultimo.current[d.id] && ultimo.current[d.id]!.length > 0);
    if (activos.length < 2) return;
    const base = ultimo.current[activos[0].id]!;
    const siguiente: Horario = {};
    for (const d of activos) siguiente[d.id] = base.map((f) => ({ ...f }));
    cambiar(siguiente);
  };

  const hora = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:border-gray-500';
  const activos = DIAS.filter((d) => value[d.id] && value[d.id]!.length > 0).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.texto} type="button" onClick={() => preset(p.dias)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50">
            {p.texto}
          </button>
        ))}
        {tieneHorario(value) && (
          <button type="button" onClick={() => cambiar({})} className="px-3 py-1.5 rounded-full text-xs font-bold text-red-600 hover:bg-red-50">
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {DIAS.map((d) => {
          const franjas = value[d.id] ?? [];
          const on = franjas.length > 0;
          return (
            <div key={d.id} className={`flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 ${on ? 'bg-white' : 'bg-gray-50'}`}
              style={{ borderColor: on ? `${acento}55` : '#e5e7eb' }}>
              <button type="button" onClick={() => alternarDia(d.id)} aria-pressed={on} aria-label={`${d.largo}: ${on ? 'trabaja' : 'libre'}`}
                className="w-16 shrink-0 py-1.5 rounded-lg text-xs font-extrabold transition-colors"
                style={on ? { background: acento, color: '#fff' } : { background: '#e5e7eb', color: '#6b7280' }}>
                {d.corto}
              </button>

              {!on ? (
                <span className="text-xs font-semibold text-gray-400">Día libre</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {franjas.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input type="time" value={f.desde} onChange={(e) => cambiarFranja(d.id, i, 'desde', e.target.value)} className={hora} aria-label={`${d.largo} desde`} />
                      <span className="text-xs font-bold text-gray-400">a</span>
                      <input type="time" value={f.hasta} onChange={(e) => cambiarFranja(d.id, i, 'hasta', e.target.value)} className={hora} aria-label={`${d.largo} hasta`} />
                      {franjas.length > 1 && (
                        <button type="button" onClick={() => poner(d.id, franjas.filter((_, j) => j !== i))} aria-label="Quitar turno"
                          className="w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 font-bold">✕</button>
                      )}
                    </div>
                  ))}
                  {franjas.length < MAX_FRANJAS && (
                    <button type="button" onClick={() => poner(d.id, [...franjas, { desde: '16:00', hasta: '20:00' }])}
                      className="self-start text-xs font-bold hover:underline" style={{ color: acento }}>
                      + Agregar otro turno
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activos >= 2 && (
        <button type="button" onClick={copiarDelPrimero} className="self-start text-xs font-bold hover:underline" style={{ color: acento }}>
          Usar el horario del primer día en todos los días marcados
        </button>
      )}

      <p className="text-xs font-semibold text-gray-500">
        {tieneHorario(value)
          ? <>Se mostrará como: <b className="text-gray-800">{resumenHorario(value)}</b></>
          : 'Marca los días que trabajas y elige tu hora de inicio y de fin.'}
        {' '}Si terminas de madrugada (ej. de 10 pm a 2 am), pon 22:00 a 02:00.
      </p>
    </div>
  );
}
