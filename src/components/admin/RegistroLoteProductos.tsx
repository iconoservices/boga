'use client';

// Registro de varios productos nuevos a la vez: en "Ingresar con cámara" se escanean seguidos los códigos que todavía no existen
// (sin parar a llenar nada) y al cerrar la cámara se abre esta hoja con una fila por código para ponerle nombre y precio a cada uno.
// Los productos quedan creados con su código; la foto y los detalles se completan después, editándolos.

import { useState } from 'react';

export type CodigoPendiente = { codigo: string; cantidad: number };
export type FilaLote = { codigo: string; nombre: string; precio: number; cantidad: number };

type Fila = { codigo: string; nombre: string; precio: string; cantidad: string };

export default function RegistroLoteProductos({
  pendientes, categorias, conStock, onGuardar, onCerrar,
}: {
  pendientes: CodigoPendiente[];
  categorias: string[];
  /** La tienda controla inventario: se pide cuántas unidades entraron de cada uno. */
  conStock: boolean;
  /** Crea los productos de uno en uno. Devuelve los códigos que SÍ se crearon y, si algo falló, un mensaje. */
  onGuardar: (filas: FilaLote[], categoria: string) => Promise<{ guardados: string[]; error: string | null }>;
  /** Cierra la hoja (los códigos que no se guardaron se pierden: hay que volver a escanearlos). */
  onCerrar: () => void;
}) {
  const [filas, setFilas] = useState<Fila[]>(() => pendientes.map((p) => ({ codigo: p.codigo, nombre: '', precio: '', cantidad: String(p.cantidad) })));
  const [categoria, setCategoria] = useState(categorias[0] ?? 'General');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cambiar = (i: number, campo: keyof Fila, v: string) => setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  const filaValida = (f: Fila) => f.nombre.trim().length > 0 && f.precio.trim() !== '' && parseFloat(f.precio) >= 0 && (!conStock || parseInt(f.cantidad, 10) > 0);
  const listas = filas.filter(filaValida).length;
  const todasListas = filas.length > 0 && listas === filas.length;

  const guardar = async () => {
    if (!todasListas || guardando) return;
    setGuardando(true);
    setError('');
    const { guardados, error: msg } = await onGuardar(
      filas.map((f) => ({ codigo: f.codigo, nombre: f.nombre.trim(), precio: Math.round(parseFloat(f.precio) * 100) / 100, cantidad: conStock ? parseInt(f.cantidad, 10) : 0 })),
      categoria,
    );
    setGuardando(false);
    if (msg) {
      // Se quitan las filas que ya quedaron guardadas; las demás se pueden reintentar.
      setFilas((f) => f.filter((x) => !guardados.includes(x.codigo)));
      setError(msg);
      return;
    }
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Registrar productos nuevos">
      <div className="w-full sm:max-w-lg max-h-[92dvh] bg-white text-gray-900 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{filas.length} {filas.length === 1 ? 'producto nuevo' : 'productos nuevos'}</p>
            <h3 className="text-lg font-extrabold leading-tight">Ponles nombre y precio</h3>
            <p className="text-xs text-gray-500 mt-0.5">Escaneaste códigos que todavía no existen. Completa cada uno y guárdalos juntos.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Descartar" className="w-9 h-9 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {categorias.length > 0 && (
          <div className="px-5 pb-2">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría para todos" className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:border-black">
              {categorias.map((c) => <option key={c} value={c}>Categoría: {c}</option>)}
            </select>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-3 flex flex-col gap-2.5">
          {filas.map((f, i) => (
            <div key={f.codigo} className={`rounded-xl border p-3 flex flex-col gap-2 ${filaValida(f) ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-mono font-bold text-gray-600 break-all">{f.codigo}</span>
                <button type="button" onClick={() => setFilas((x) => x.filter((_, j) => j !== i))} aria-label="Quitar este código" className="text-gray-400 hover:text-red-600 shrink-0">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <input
                value={f.nombre}
                onChange={(e) => cambiar(i, 'nombre', e.target.value)}
                placeholder="Nombre del producto"
                maxLength={80}
                autoFocus={i === 0}
                className="h-11 px-3 rounded-lg border border-gray-200 bg-white text-base font-semibold focus:outline-none focus:border-black"
              />
              <div className={`grid gap-2 ${conStock ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">S/</span>
                  <input
                    value={f.precio}
                    onChange={(e) => cambiar(i, 'precio', e.target.value)}
                    type="number" step="0.10" min="0" inputMode="decimal"
                    placeholder="Precio"
                    className="w-full h-11 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-base font-semibold focus:outline-none focus:border-black"
                  />
                </div>
                {conStock && (
                  <input
                    value={f.cantidad}
                    onChange={(e) => cambiar(i, 'cantidad', e.target.value)}
                    type="number" min="1" inputMode="numeric"
                    placeholder="Unidades"
                    aria-label="Unidades que entraron"
                    className="h-11 px-3 rounded-lg border border-gray-200 bg-white text-base font-semibold focus:outline-none focus:border-black"
                  />
                )}
              </div>
            </div>
          ))}
          {filas.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No quedan códigos por registrar.</p>}
        </div>

        <div className="p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex flex-col gap-2">
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="button"
            onClick={guardar}
            disabled={!todasListas || guardando}
            className="h-12 rounded-xl bg-emerald-600 text-white font-extrabold text-base disabled:opacity-40 active:scale-[0.98] transition"
          >
            {guardando ? 'Guardando…' : todasListas ? `Guardar ${filas.length === 1 ? 'el producto' : `los ${filas.length} productos`}` : `Faltan datos (${listas}/${filas.length})`}
          </button>
          <p className="text-[11px] text-gray-400 text-center">La foto y los demás detalles los completas después, editando cada producto.</p>
        </div>
      </div>
    </div>
  );
}
