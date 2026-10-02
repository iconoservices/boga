'use client';

import React, { useState } from 'react';
import { iconForCategory } from '@/templates/shared/tokens';

export type Categoria = { name: string; icon: string; href: string };

interface Props {
  nombreTienda: string;
  categorias: Categoria[];
  /** Cuántos productos tiene cada categoría (por nombre). */
  conteos: Record<string, number>;
  /** Guarda la lista completa (en el orden que se ve). Devuelve false si falló. */
  onGuardar: (lista: Categoria[]) => Promise<boolean>;
  /** Pasa los productos de una categoría a otro nombre. Devuelve false si falló. */
  onRenombrarProductos: (viejo: string, nuevo: string) => Promise<boolean>;
}

const slug = (n: string) =>
  n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'categoria';

/**
 * Categorías de la carta: el dueño las crea, renombra, ordena y borra desde un solo lugar.
 * El orden de la lista es el orden en que las ven los clientes.
 */
export default function CategoriasTab({ nombreTienda, categorias, conteos, onGuardar, onRenombrarProductos }: Props) {
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState<string | null>(null); // href en edición
  const [borrador, setBorrador] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [moviendo, setMoviendo] = useState<string | null>(null); // href de la categoría que se quiere borrar teniendo productos
  const [destino, setDestino] = useState('');

  const existeNombre = (n: string, exceptoHref?: string) =>
    categorias.some((c) => c.href !== exceptoHref && c.name.trim().toLowerCase() === n.trim().toLowerCase());

  const crear = async () => {
    const nombre = nueva.trim();
    if (!nombre) return;
    if (existeNombre(nombre)) { setAviso('Ya tienes una categoría con ese nombre.'); return; }
    let href = slug(nombre);
    const base = href;
    for (let n = 2; categorias.some((c) => c.href === href); n++) href = `${base}-${n}`;
    setOcupado(true);
    const ok = await onGuardar([...categorias, { name: nombre, icon: iconForCategory(nombre), href }]);
    setOcupado(false);
    if (ok) { setNueva(''); setAviso(''); }
  };

  const renombrar = async (cat: Categoria) => {
    const nuevo = borrador.trim();
    setEditando(null);
    if (!nuevo || nuevo === cat.name) return;
    if (existeNombre(nuevo, cat.href)) { setAviso('Ya tienes una categoría con ese nombre.'); return; }
    setOcupado(true);
    const ok = await onGuardar(categorias.map((c) => (c.href === cat.href ? { ...c, name: nuevo, icon: iconForCategory(nuevo) } : c)));
    if (ok && (conteos[cat.name] ?? 0) > 0) await onRenombrarProductos(cat.name, nuevo);
    setOcupado(false);
    setAviso('');
  };

  const mover = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= categorias.length) return;
    const lista = [...categorias];
    [lista[idx], lista[j]] = [lista[j], lista[idx]];
    setOcupado(true);
    await onGuardar(lista);
    setOcupado(false);
  };

  const borrar = async (cat: Categoria) => {
    if (!window.confirm(`¿Borrar la categoría "${cat.name}"?`)) return;
    setOcupado(true);
    await onGuardar(categorias.filter((c) => c.href !== cat.href));
    setOcupado(false);
  };

  // Borrar una categoría que tiene productos: primero se pasan todos a otra y recién ahí se quita.
  const moverYBorrar = async (cat: Categoria) => {
    if (!destino) return;
    setOcupado(true);
    const ok = await onRenombrarProductos(cat.name, destino);
    if (ok) await onGuardar(categorias.filter((c) => c.href !== cat.href));
    setOcupado(false);
    setMoviendo(null);
    setDestino('');
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-gray-900">Categorías de {nombreTienda}</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Los rubros de tu carta. El orden de esta lista es el que ven tus clientes.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={nueva}
            onChange={(e) => { setNueva(e.target.value); setAviso(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crear(); } }}
            placeholder="Nueva categoría (ej: Racks, Bebidas)"
            className="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md font-medium text-sm focus:bg-white focus:outline-none focus:border-black transition-all"
          />
          <button
            type="button"
            onClick={crear}
            disabled={ocupado || !nueva.trim()}
            className="px-4 py-2.5 bg-black text-white rounded-md font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
        {aviso && <p className="text-xs font-semibold text-red-600">{aviso}</p>}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm divide-y divide-gray-100">
        {categorias.length === 0 && (
          <p className="p-5 text-sm text-gray-400 italic">Todavía no tienes categorías. Crea la primera arriba.</p>
        )}
        {categorias.map((cat, idx) => {
          const usados = conteos[cat.name] ?? 0;
          return (
            <div key={cat.href} className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  aria-label="Subir"
                  disabled={ocupado || idx === 0}
                  onClick={() => mover(idx, -1)}
                  className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-black disabled:opacity-20"
                >
                  <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
                </button>
                <button
                  type="button"
                  aria-label="Bajar"
                  disabled={ocupado || idx === categorias.length - 1}
                  onClick={() => mover(idx, 1)}
                  className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-black disabled:opacity-20"
                >
                  <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                </button>
              </div>

              <span className="material-symbols-outlined text-[20px] text-gray-400 shrink-0">{cat.icon || iconForCategory(cat.name)}</span>

              {editando === cat.href ? (
                <input
                  autoFocus
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renombrar(cat);
                    if (e.key === 'Escape') setEditando(null);
                  }}
                  onBlur={() => renombrar(cat)}
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-50 border border-black rounded-md font-semibold text-sm focus:outline-none"
                />
              ) : (
                <span className="flex-1 min-w-0 font-bold text-gray-800 truncate">
                  {cat.name}
                  <span className="ml-2 text-xs font-semibold text-gray-400">
                    {usados} producto{usados !== 1 ? 's' : ''}
                  </span>
                </span>
              )}

              <button
                type="button"
                title="Cambiar nombre"
                disabled={ocupado}
                onClick={() => { setEditando(cat.href); setBorrador(cat.name); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                type="button"
                title={usados > 0 ? 'Tiene productos: te dejo pasarlos a otra categoría y borrarla' : 'Borrar categoría'}
                disabled={ocupado}
                onClick={() => { if (usados > 0) { setMoviendo(moviendo === cat.href ? null : cat.href); setDestino(''); } else borrar(cat); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            {moviendo === cat.href && (
              <div className="mt-2 ml-8 rounded-lg border border-amber-200 bg-amber-50 p-3 flex flex-col gap-2">
                {categorias.length < 2 ? (
                  <p className="text-xs font-semibold text-amber-900">
                    Para borrar &quot;{cat.name}&quot; necesitas otra categoría a donde pasar sus {usados} producto{usados !== 1 ? 's' : ''}. Crea una arriba y vuelve a intentarlo.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-amber-900">
                      &quot;{cat.name}&quot; tiene {usados} producto{usados !== 1 ? 's' : ''}. ¿A qué categoría los pasamos?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={destino}
                        onChange={(e) => setDestino(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 bg-white border border-amber-200 rounded-md text-sm font-semibold focus:outline-none focus:border-black"
                      >
                        <option value="">Elige la categoría…</option>
                        {categorias.filter((c) => c.href !== cat.href).map((c) => (
                          <option key={c.href} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!destino || ocupado}
                        onClick={() => moverYBorrar(cat)}
                        className="px-4 py-2 bg-black text-white rounded-md text-sm font-bold hover:bg-gray-800 disabled:opacity-40"
                      >
                        Mover y borrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
