'use client';

// Pestaña "Pedidos" del panel del dueño: los pedidos de la carta (que llegan por WhatsApp y ahora
// también quedan registrados) y las ventas de la caja (POS). Se puede ver el detalle, escribirle al
// cliente por WhatsApp y cambiar el estado. Cancelar devuelve el stock (lo hace el panel).

import { useMemo, useState } from 'react';

export interface Pedido {
  id: string;
  store: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: { id?: string; name: string; price: number; quantity: number }[] | string | null;
  total_amount: number;
  status: string;
  payment_method?: string | null;
  seller_name?: string | null;
  order_source?: string | null;
  created_at: string;
  /** Código corto del pedido de la carta (el del enlace /pedido/<código>). */
  codigo?: string | null;
  /** Cobro online (Izipay): null = sin pago online; 'pendiente' | 'pagado' | 'fallido'. */
  pago_estado?: 'pendiente' | 'pagado' | 'fallido' | null;
}

const ESTADOS = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'] as const;
const FILTROS = [
  { id: 'all', label: 'Todos' },
  { id: 'Pendiente', label: 'Pendientes' },
  { id: 'proceso', label: 'En proceso' },
  { id: 'Entregado', label: 'Entregados' },
  { id: 'Cancelado', label: 'Cancelados' },
] as const;
const EN_PROCESO = ['Preparando', 'Listo', 'Enviado'];

const estilo = (estado: string) => {
  if (estado === 'Entregado') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' };
  if (estado === 'Cancelado') return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
  if (EN_PROCESO.includes(estado)) return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' };
  return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' };
};

const itemsDe = (o: Pedido) => {
  if (Array.isArray(o.items)) return o.items;
  if (typeof o.items === 'string') { try { const v = JSON.parse(o.items); return Array.isArray(v) ? v : []; } catch { return []; } }
  return [];
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const wa = (tel: string) => {
  const d = tel.replace(/\D/g, '');
  return d ? `https://wa.me/${d.length === 9 ? '51' + d : d}` : '';
};

export default function PedidosTab({
  pedidos,
  nombreTienda,
  mostrarTienda,
  cambiarEstado,
  ocupado,
}: {
  pedidos: Pedido[];
  nombreTienda: (slug: string) => string;
  mostrarTienda: boolean;
  cambiarEstado: (pedido: Pedido, estado: string) => void;
  ocupado: string | null;
}) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('all');
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  const kpi = useMemo(() => {
    const validos = pedidos.filter((p) => p.status !== 'Cancelado');
    const ingresos = validos.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    return {
      ingresos,
      total: pedidos.length,
      activos: pedidos.filter((p) => p.status !== 'Entregado' && p.status !== 'Cancelado').length,
      pendientes: pedidos.filter((p) => p.status === 'Pendiente').length,
      ticket: validos.length ? ingresos / validos.length : 0,
      cancelados: pedidos.filter((p) => p.status === 'Cancelado').length,
    };
  }, [pedidos]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      const okEstado =
        filtro === 'all' ? true : filtro === 'proceso' ? EN_PROCESO.includes(p.status) : p.status === filtro;
      const okBusca = !q || p.id.toLowerCase().includes(q) || (p.customer_name || '').toLowerCase().includes(q) || (p.customer_phone || '').includes(q);
      return okEstado && okBusca;
    });
  }, [pedidos, filtro, busca]);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { t: 'Ingresos', v: `S/ ${kpi.ingresos.toFixed(2)}`, s: `${kpi.total} ${kpi.total === 1 ? 'pedido' : 'pedidos'} en total`, i: 'receipt_long' },
          { t: 'Activos', v: String(kpi.activos), s: `${kpi.pendientes} por atender`, i: 'schedule' },
          { t: 'Ticket promedio', v: `S/ ${kpi.ticket.toFixed(2)}`, s: 'Por pedido', i: 'payments' },
          { t: 'Cancelados', v: String(kpi.cancelados), s: kpi.total ? `${((kpi.cancelados / kpi.total) * 100).toFixed(0)}% del total` : '—', i: 'cancel' },
        ].map((k) => (
          <div key={k.t} className="bg-white border border-gray-100 rounded-md p-4 shadow-sm">
            <h4 className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-1">{k.t}</h4>
            <span className="text-2xl font-black text-gray-900">{k.v}</span>
            <p className="mt-2 flex items-center gap-1 text-gray-400 font-bold text-[12px]">
              <span className="material-symbols-outlined text-[15px]">{k.i}</span>{k.s}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, celular o ID…"
            className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#b8130e] focus:border-transparent focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filtro === f.id ? 'bg-[#b8130e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="bg-white rounded-md border border-gray-100 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">receipt_long</span>
          <p className="text-gray-500 font-bold text-sm">
            {pedidos.length === 0 ? 'Todavía no tienes pedidos. Cuando un cliente pida desde tu carta, aparecerá aquí.' : 'Ningún pedido coincide con este filtro.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((o) => {
            const st = estilo(o.status);
            const items = itemsDe(o);
            const abierta = abierto === o.id;
            const tel = o.customer_phone ? wa(o.customer_phone) : '';
            const esCarta = o.order_source === 'Carta';
            return (
              <div key={o.id} className={`bg-white rounded-md border shadow-sm overflow-hidden ${o.status === 'Pendiente' ? 'border-orange-200' : 'border-gray-100'}`}>
                <button
                  type="button"
                  onClick={() => setAbierto(abierta ? null : o.id)}
                  className="w-full text-left p-4 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-gray-50/60 transition-colors"
                >
                  <span className="text-[#b8130e] font-bold text-xs w-20 shrink-0">#{(o.codigo || o.id.slice(0, 8)).toUpperCase()}</span>
                  <span className="flex-1 min-w-[140px]">
                    <span className="block text-gray-900 font-extrabold text-sm">{o.customer_name || 'Cliente'}</span>
                    <span className="block text-gray-500 text-xs font-medium">
                      {fecha(o.created_at)} • {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                      {mostrarTienda ? ` • ${nombreTienda(o.store)}` : ''}
                    </span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${esCarta ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {esCarta ? 'Carta' : o.order_source || 'POS'}
                  </span>
                  {o.pago_estado && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-extrabold border ${o.pago_estado === 'pagado' ? 'bg-green-50 text-green-700 border-green-200' : o.pago_estado === 'fallido' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      <span className="material-symbols-outlined text-[13px]">{o.pago_estado === 'pagado' ? 'verified' : 'schedule'}</span>
                      {o.pago_estado === 'pagado' ? 'Pagado' : o.pago_estado === 'fallido' ? 'Pago fallido' : 'Sin pagar'}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} ${st.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {o.status}
                  </span>
                  <span className="text-gray-900 font-black text-base w-24 text-right">S/ {Number(o.total_amount).toFixed(2)}</span>
                  <span className={`material-symbols-outlined text-gray-400 text-[20px] transition-transform ${abierta ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {abierta && (
                  <div className="border-t border-gray-100 p-4 flex flex-col gap-4 bg-gray-50/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="font-bold text-gray-900">{o.customer_name || 'Cliente'}</p>
                        {o.customer_phone && (
                          <p className="text-gray-600 font-medium flex items-center gap-2">
                            {o.customer_phone}
                            {tel && (
                              <a href={tel} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 hover:bg-green-100">
                                <span className="material-symbols-outlined text-[13px]">chat</span>WhatsApp
                              </a>
                            )}
                          </p>
                        )}
                        {o.customer_address && <p className="text-gray-600 font-medium">{o.customer_address}</p>}
                        {o.seller_name && <p className="text-gray-500 text-xs mt-1">Vendedor: {o.seller_name}</p>}
                        {o.payment_method && <p className="text-gray-500 text-xs">Pago: {o.payment_method}</p>}
                      </div>
                      <div className="text-sm">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Detalle</p>
                        <ul className="flex flex-col gap-1">
                          {items.map((it, idx) => (
                            <li key={idx} className="flex justify-between gap-3">
                              <span className="text-gray-700 font-medium">{it.quantity}× {it.name}</span>
                              <span className="text-gray-900 font-bold">S/ {(Number(it.price) * Number(it.quantity)).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="flex justify-between border-t border-gray-200 mt-2 pt-2 font-black text-gray-900">
                          <span>Total</span><span>S/ {Number(o.total_amount).toFixed(2)}</span>
                        </p>
                      </div>
                    </div>

                    {o.codigo && (
                      <a href={`/pedido/${o.codigo}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#b8130e] hover:underline self-start">
                        Ver la página del pedido (la que recibió el cliente)
                      </a>
                    )}

                    {o.status === 'Cancelado' ? (
                      <p className="text-xs font-semibold text-red-600">Pedido cancelado. Si llevaba stock, ya se devolvió al inventario.</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mr-1">Estado</span>
                        {ESTADOS.map((e) => {
                          const activo = o.status === e || (e === 'Preparando' && o.status === 'Listo');
                          const s = estilo(e);
                          return (
                            <button
                              key={e}
                              type="button"
                              disabled={ocupado === o.id || activo}
                              onClick={() => {
                                if (e === 'Cancelado' && !window.confirm('¿Cancelar este pedido? Si llevaba stock, se devuelve al inventario.')) return;
                                cambiarEstado(o, e);
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors disabled:cursor-default ${
                                activo ? `${s.bg} ${s.text} ${s.border}` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 disabled:opacity-50'
                              }`}
                            >
                              {e}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-gray-400 font-medium px-1">Mostrando {lista.length} de {pedidos.length} pedidos</p>
        </div>
      )}
    </div>
  );
}
