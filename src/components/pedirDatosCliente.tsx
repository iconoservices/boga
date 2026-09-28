'use client';

// Pide nombre y celular al cliente justo antes de mandar su pedido por WhatsApp.
// Opcionalmente (pedirEntrega) también pregunta delivery o recojo, y la dirección.
//
// Se abre con una llamada normal (`await pedirDatosCliente()`) desde cualquier plantilla, sin tener que
// agregar estado ni JSX en cada una: arma su propia ventanita, y devuelve los datos o null si el cliente
// la cierra. Recuerda lo último que escribió (ver lib/cliente.ts).

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { guardarCliente, leerCliente, normalizarCelular, type DatosCliente } from '@/lib/cliente';

export type DatosClienteConEntrega = DatosCliente & { entrega?: 'delivery' | 'recojo'; direccion?: string };

type Opts = {
  color?: string;
  titulo?: string;
  /** Además de nombre y celular, pregunta delivery/recojo y la dirección (como en el resto de plantillas). */
  pedirEntrega?: boolean;
  /** 'ambos' (por defecto) deja elegir; 'delivery'/'recojo' fuerza esa sola opción y esconde el selector. */
  entregaDisponible?: 'delivery' | 'recojo' | 'ambos';
};

function Ventana({ color, titulo, pedirEntrega, entregaDisponible = 'ambos', onListo }: Opts & { onListo: (d: DatosClienteConEntrega | null) => void }) {
  const previo = leerCliente();
  const [nombre, setNombre] = useState(previo?.nombre ?? '');
  const [celular, setCelular] = useState(previo?.telefono ?? '');
  const [entrega, setEntrega] = useState<'delivery' | 'recojo'>(entregaDisponible === 'recojo' ? 'recojo' : 'delivery');
  const [direccion, setDireccion] = useState('');
  const [ubicando, setUbicando] = useState(false);
  const [ubicMsg, setUbicMsg] = useState('');
  const [intento, setIntento] = useState(false);

  const tel = normalizarCelular(celular);
  const faltaNombre = !nombre.trim();
  const faltaDireccion = pedirEntrega && entrega === 'delivery' && !direccion.trim();

  const usarUbicacion = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setUbicMsg('Tu navegador no permite ubicarte. Escribe tu dirección.'); return; }
    setUbicando(true);
    setUbicMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const enlace = `https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setDireccion((d) => {
          const base = d.replace(/\s*·?\s*📍\s*https:\/\/maps\.google\.com\/\?q=\S+/g, '').trim();
          return (base ? `${base} · ` : '') + `📍 ${enlace}`;
        });
        setUbicMsg(`Ubicación agregada (precisión aproximada: ${Math.round(pos.coords.accuracy)} m). Suma una referencia.`);
        setUbicando(false);
      },
      (err) => {
        setUbicMsg(err.code === 1 ? 'No diste permiso de ubicación. Escribe tu dirección.' : 'No pudimos obtener tu ubicación. Escribe tu dirección.');
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const confirmar = () => {
    setIntento(true);
    if (faltaNombre || !tel || faltaDireccion) return;
    const datos: DatosClienteConEntrega = { nombre: nombre.trim(), telefono: tel };
    if (pedirEntrega) { datos.entrega = entrega; datos.direccion = entrega === 'delivery' ? direccion.trim() : undefined; }
    guardarCliente({ nombre: datos.nombre, telefono: datos.telefono });
    onListo(datos);
  };

  const campo = 'w-full border border-gray-300 rounded-xl px-3 py-3 text-base font-semibold text-gray-900 bg-white focus:outline-none focus:border-gray-500';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={() => onListo(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:m-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900">{titulo ?? 'Antes de enviar tu pedido'}</h3>
          <button type="button" aria-label="Cerrar" onClick={() => onListo(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold">✕</button>
        </div>
        <p className="text-sm text-gray-500 font-medium">Para que el negocio te reconozca y te avise cuando tu pedido esté listo.</p>

        <label className="text-xs font-bold text-gray-500 uppercase">Tu nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿A nombre de quién va el pedido?" className={`${campo} mt-1`} autoFocus />
        </label>
        {intento && faltaNombre && <p className="text-xs font-semibold text-red-600 -mt-1">Escribe tu nombre.</p>}

        <label className="text-xs font-bold text-gray-500 uppercase">Tu celular
          <input
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            type="tel"
            inputMode="numeric"
            placeholder="9XX XXX XXX"
            className={`${campo} mt-1`}
          />
        </label>
        {intento && !tel && <p className="text-xs font-semibold text-red-600 -mt-1">Escribe un celular de 9 dígitos que empiece con 9.</p>}

        {pedirEntrega && (
          <>
            {entregaDisponible === 'ambos' && (
              <div className="flex gap-2">
                {(['delivery', 'recojo'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setEntrega(op)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase border transition-all"
                    style={{
                      background: entrega === op ? (color ?? '#111827') : '#fff',
                      color: entrega === op ? '#fff' : '#374151',
                      borderColor: entrega === op ? 'transparent' : '#d1d5db',
                    }}
                  >
                    {op === 'delivery' ? 'Delivery' : 'Recojo en tienda'}
                  </button>
                ))}
              </div>
            )}
            {entrega === 'delivery' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Dirección de entrega
                  <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, referencia" className={`${campo} mt-1`} />
                </label>
                {intento && faltaDireccion && <p className="text-xs font-semibold text-red-600">Escribe tu dirección de entrega.</p>}
                <button
                  type="button"
                  onClick={usarUbicacion}
                  disabled={ubicando}
                  className="self-start inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold active:scale-95 transition-all disabled:opacity-60 border-gray-300 text-gray-700"
                >
                  <span className="material-symbols-outlined text-[16px]">my_location</span>
                  {ubicando ? 'Ubicándote…' : 'Usar mi ubicación'}
                </button>
                {ubicMsg && <p className="text-xs text-gray-500 leading-snug">{ubicMsg}</p>}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={confirmar}
          className="w-full py-3.5 rounded-full text-white font-extrabold text-base mt-1 active:scale-[0.99]"
          style={{ background: color ?? '#111827' }}
        >
          Continuar por WhatsApp
        </button>
      </div>
    </div>
  );
}

export function pedirDatosCliente(opts: Opts = {}): Promise<DatosClienteConEntrega | null> {
  return new Promise((resolve) => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const root = createRoot(cont);
    const cerrar = (d: DatosClienteConEntrega | null) => {
      resolve(d);
      // se desmonta después de este ciclo para no cortar el clic que la cerró
      setTimeout(() => { root.unmount(); cont.remove(); }, 0);
    };
    root.render(<Ventana {...opts} onListo={cerrar} />);
  });
}
