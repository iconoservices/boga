'use client';

// Registro rápido de un producto desde el escáner de "Ingresar con cámara": se escanea un código que no existe y, sin salir de
// la cámara, se le pone nombre y precio (y cuántas unidades entraron). El producto queda creado con ese código; la foto y los
// detalles se completan después, editándolo. Pensado para cargar mercadería nueva rápido, producto por producto.

import { useEffect, useRef, useState } from 'react';

export type DatosRegistroRapido = { codigo: string; nombre: string; precio: number; categoria: string; cantidad: number };

export default function RegistroRapidoProducto({
  codigo, categorias, conStock, onGuardar, onCancelar,
}: {
  codigo: string;
  categorias: string[];
  /** La tienda controla inventario: se pide cuántas unidades entraron. */
  conStock: boolean;
  /** Devuelve un mensaje de error, o null si se guardó bien. */
  onGuardar: (d: DatosRegistroRapido) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState(categorias[0] ?? 'General');
  const [cantidad, setCantidad] = useState('1');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nombreRef.current?.focus(); }, []);

  const valido = nombre.trim().length > 0 && parseFloat(precio) >= 0 && precio.trim() !== '' && (!conStock || parseInt(cantidad, 10) > 0);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || guardando) return;
    setGuardando(true);
    setError('');
    const msg = await onGuardar({
      codigo,
      nombre: nombre.trim(),
      precio: Math.round(parseFloat(precio) * 100) / 100,
      categoria,
      cantidad: conStock ? parseInt(cantidad, 10) : 0,
    });
    setGuardando(false);
    if (msg) setError(msg);
  };

  return (
    <div className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Registrar producto nuevo">
      <form onSubmit={guardar} className="w-full sm:max-w-md bg-white text-gray-900 rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">Producto nuevo</p>
            <h3 className="text-lg font-extrabold leading-tight">Registrar con este código</h3>
            <p className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-700 break-all">{codigo}</p>
          </div>
          <button type="button" onClick={onCancelar} aria-label="Cancelar" className="w-9 h-9 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <input
          ref={nombreRef}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del producto"
          maxLength={80}
          className="h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-semibold focus:outline-none focus:border-black focus:bg-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">S/</span>
            <input
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              inputMode="decimal"
              type="number" step="0.10" min="0"
              placeholder="Precio"
              className="w-full h-12 pl-9 pr-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-semibold focus:outline-none focus:border-black focus:bg-white"
            />
          </div>
          {conStock ? (
            <input
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              inputMode="numeric" type="number" min="1"
              placeholder="Unidades"
              aria-label="Unidades que entraron"
              className="h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-semibold focus:outline-none focus:border-black focus:bg-white"
            />
          ) : <span />}
        </div>
        {categorias.length > 0 && (
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Categoría"
            className="h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold focus:outline-none focus:border-black"
          >
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {conStock && <p className="text-[11px] text-gray-500 -mt-1">Unidades que entraron ahora: se suman al stock.</p>}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!valido || guardando}
          className="h-12 rounded-xl bg-emerald-600 text-white font-extrabold text-base disabled:opacity-40 active:scale-[0.98] transition"
        >
          {guardando ? 'Guardando…' : 'Guardar y seguir escaneando'}
        </button>
        <p className="text-[11px] text-gray-400 text-center">La foto y los demás detalles los completas después, editando el producto.</p>
      </form>
    </div>
  );
}
