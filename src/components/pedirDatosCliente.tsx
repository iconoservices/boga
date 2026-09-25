'use client';

// Pide nombre y celular al cliente justo antes de mandar su pedido por WhatsApp.
//
// Se abre con una llamada normal (`await pedirDatosCliente()`) desde cualquier plantilla, sin tener que
// agregar estado ni JSX en cada una: arma su propia ventanita, y devuelve los datos o null si el cliente
// la cierra. Recuerda lo último que escribió (ver lib/cliente.ts).

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { guardarCliente, leerCliente, normalizarCelular, type DatosCliente } from '@/lib/cliente';

function Ventana({ color, titulo, onListo }: { color: string; titulo: string; onListo: (d: DatosCliente | null) => void }) {
  const previo = leerCliente();
  const [nombre, setNombre] = useState(previo?.nombre ?? '');
  const [celular, setCelular] = useState(previo?.telefono ?? '');
  const [intento, setIntento] = useState(false);

  const tel = normalizarCelular(celular);
  const faltaNombre = !nombre.trim();

  const confirmar = () => {
    setIntento(true);
    if (faltaNombre || !tel) return;
    const datos = { nombre: nombre.trim(), telefono: tel };
    guardarCliente(datos);
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
        className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:m-4 flex flex-col gap-3"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900">{titulo}</h3>
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

        <button
          type="button"
          onClick={confirmar}
          className="w-full py-3.5 rounded-full text-white font-extrabold text-base mt-1 active:scale-[0.99]"
          style={{ background: color }}
        >
          Continuar por WhatsApp
        </button>
      </div>
    </div>
  );
}

export function pedirDatosCliente(opts: { color?: string; titulo?: string } = {}): Promise<DatosCliente | null> {
  return new Promise((resolve) => {
    const cont = document.createElement('div');
    document.body.appendChild(cont);
    const root = createRoot(cont);
    const cerrar = (d: DatosCliente | null) => {
      resolve(d);
      // se desmonta después de este ciclo para no cortar el clic que la cerró
      setTimeout(() => { root.unmount(); cont.remove(); }, 0);
    };
    root.render(<Ventana color={opts.color ?? '#111827'} titulo={opts.titulo ?? 'Antes de enviar tu pedido'} onListo={cerrar} />);
  });
}
