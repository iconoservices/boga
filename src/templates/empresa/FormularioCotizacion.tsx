'use client';

import type { StoreTheme } from '@/lib/stores.config';
import { TXT } from '../shared/tokens';

/**
 * Formulario de cotización de la plantilla Empresa: además de nombre, teléfono y detalle, pide la EMPRESA de quien cotiza y el
 * SERVICIO que necesita (un selector con los servicios de la propia tienda: el dueño no llena nada). Arma un mensaje ordenado y
 * lo abre en el WhatsApp de la empresa.
 */
export default function FormularioCotizacion({
  t, servicios, onEnviar,
}: {
  t: StoreTheme;
  /** Nombres de los servicios de la tienda, para el selector. */
  servicios: string[];
  onEnviar: (mensaje: string) => void;
}) {
  const estilo = { borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface } as const;
  const clase = `w-full border rounded-xl px-3 py-2 ${TXT.small} font-semibold focus:outline-none`;
  const etiqueta = `block ${TXT.micro} font-bold uppercase mb-1`;
  const foco = {
    onFocus: (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.outline = `2px solid ${t.primary}`),
    onBlur: (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.outline = 'none'),
  };

  return (
    <div className="p-6 rounded-3xl border shadow-sm space-y-4" style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}>
      <h4 className={`font-bold ${TXT.lead} uppercase`} style={{ color: t.onSurface }}>Pide tu cotización</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const dato = (k: string) => String(f.get(k) ?? '').trim();
          const datos = [
            `Nombre: ${dato('nombre')}`,
            dato('empresa') && `Empresa: ${dato('empresa')}`,
            `Teléfono: ${dato('telefono')}`,
            dato('servicio') && `Servicio: ${dato('servicio')}`,
            dato('detalle') && `Detalle: ${dato('detalle')}`,
          ].filter(Boolean);
          onEnviar(['Quisiera una cotización.', '', ...datos].join('\n'));
        }}
        className="space-y-3.5"
      >
        <div>
          <label htmlFor="cot-nombre" className={etiqueta} style={{ color: t.onSurfaceVariant }}>Tu nombre</label>
          <input id="cot-nombre" name="nombre" type="text" required className={clase} style={estilo} {...foco} />
        </div>
        <div>
          <label htmlFor="cot-empresa" className={etiqueta} style={{ color: t.onSurfaceVariant }}>Tu empresa <span className="font-medium normal-case">(opcional)</span></label>
          <input id="cot-empresa" name="empresa" type="text" className={clase} style={estilo} {...foco} />
        </div>
        <div>
          <label htmlFor="cot-telefono" className={etiqueta} style={{ color: t.onSurfaceVariant }}>Tu teléfono</label>
          <input id="cot-telefono" name="telefono" type="tel" required className={clase} style={estilo} {...foco} />
        </div>
        <div>
          <label htmlFor="cot-servicio" className={etiqueta} style={{ color: t.onSurfaceVariant }}>Servicio que necesitas</label>
          <select id="cot-servicio" name="servicio" defaultValue="" className={clase} style={estilo} {...foco}>
            <option value="">Elige un servicio…</option>
            {servicios.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Otro / no estoy seguro">Otro / no estoy seguro</option>
          </select>
        </div>
        <div>
          <label htmlFor="cot-detalle" className={etiqueta} style={{ color: t.onSurfaceVariant }}>Cuéntanos tu proyecto</label>
          <textarea id="cot-detalle" name="detalle" rows={3} required placeholder="Medidas, materiales, ubicación, plazos…" className={clase} style={estilo} {...foco} />
        </div>
        <button
          type="submit"
          className={`w-full py-3 rounded-full font-bold ${TXT.small} shadow-md uppercase active:scale-95 transition-all`}
          style={{ backgroundColor: t.primary, color: t.onPrimary }}
        >
          Pedir cotización por WhatsApp
        </button>
      </form>
    </div>
  );
}
