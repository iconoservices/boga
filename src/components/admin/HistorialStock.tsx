'use client';

// Historial de movimientos de stock (tabla stock_movements): qué entró o salió, cuándo, por qué y
// cuánto quedó. Solo con el módulo de inventario. Lo ven el dueño (sus tiendas) y el superadmin.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MotivoStock } from '@/lib/stock';

interface Movimiento {
  id: string;
  created_at: string;
  store: string;
  product_name: string;
  delta: number;
  stock_despues: number;
  motivo: MotivoStock;
  pedido_id: string | null;
  usuario: string | null;
}

const MOTIVO: Record<MotivoStock, { texto: string; icono: string }> = {
  venta_pos: { texto: 'Venta en caja', icono: 'point_of_sale' },
  venta_carta: { texto: 'Pedido de la carta', icono: 'shopping_bag' },
  cancelacion: { texto: 'Pedido cancelado', icono: 'undo' },
  ingreso: { texto: 'Ingreso de mercadería', icono: 'inventory' },
  ajuste: { texto: 'Ajuste manual', icono: 'edit' },
};

export default function HistorialStock({
  slugs,
  nombreTienda,
  onClose,
}: {
  slugs: string[];
  nombreTienda: (slug: string) => string;
  onClose: () => void;
}) {
  const [filas, setFilas] = useState<Movimiento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (slugs.length === 0) return;
    supabase
      .from('stock_movements')
      .select('id,created_at,store,product_name,delta,stock_despues,motivo,pedido_id,usuario')
      .in('store', slugs)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setFilas([]); return; }
        setFilas((data ?? []) as Movimiento[]);
      });
  }, [slugs.join(',')]);   // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (filas ?? []).filter((f) => !q || f.product_name.toLowerCase().includes(q));
  }, [filas, busca]);

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[860px] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Historial de stock</h2>
            <p className="text-xs text-gray-500 font-medium">Los últimos 200 movimientos de tus tiendas.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-[#b8130e]"
            />
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {filas === null && slugs.length > 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">Cargando…</p>
          ) : error ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-semibold">
              Todavía no está activado el historial en la base de datos ({error}). Falta correr el SQL de «Historial de stock» de supabase_setup.sql.
            </div>
          ) : visibles.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              {(filas ?? []).length === 0 ? 'Todavía no hay movimientos. Aparecerán cuando vendas, ingreses mercadería o canceles un pedido.' : 'Ningún movimiento coincide.'}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3 font-bold">Cuándo</th>
                  <th className="py-2 pr-3 font-bold">Producto</th>
                  <th className="py-2 pr-3 font-bold">Motivo</th>
                  <th className="py-2 pr-3 font-bold text-right">Cambio</th>
                  <th className="py-2 font-bold text-right">Quedó</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const m = MOTIVO[f.motivo] ?? { texto: f.motivo, icono: 'swap_vert' };
                  return (
                    <tr key={f.id} className="border-b border-gray-50">
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                        {new Date(f.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-gray-900">
                        {f.product_name}
                        {slugs.length > 1 && <span className="block text-[11px] text-gray-400 font-medium">{nombreTienda(f.store)}</span>}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-gray-400">{m.icono}</span>{m.texto}
                        </span>
                        {f.usuario && <span className="block text-[11px] text-gray-400">{f.usuario}</span>}
                      </td>
                      <td className={`py-2 pr-3 text-right font-extrabold ${f.delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {f.delta > 0 ? '+' : ''}{f.delta}
                      </td>
                      <td className="py-2 text-right font-bold text-gray-900">{f.stock_despues}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
