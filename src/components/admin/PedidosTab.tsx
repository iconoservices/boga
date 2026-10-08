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

// Botones del cambio de estado: todos neutros con su ícono; solo el activo se rellena con el color de la tienda.
const ICONO_ESTADO: Record<(typeof ESTADOS)[number], string> = {
  Pendiente: 'schedule',
  Preparando: 'skillet',
  Enviado: 'local_shipping',
  Entregado: 'check_circle',
  Cancelado: 'cancel',
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
  eliminar,
  puedeEliminar = false,
  ocupado,
  silencio = false,
  alternarSilencio,
}: {
  pedidos: Pedido[];
  nombreTienda: (slug: string) => string;
  mostrarTienda: boolean;
  cambiarEstado: (pedido: Pedido, estado: string) => void;
  /** Borra el pedido para siempre. Solo se ofrece en pedidos ya cancelados (ej. pedidos de prueba). */
  eliminar: (pedido: Pedido) => void;
  /** Se ofrece solo en pedidos ya cancelados; lo puede hacer el admin de la tienda y el superadmin. */
  puedeEliminar?: boolean;
  ocupado: string | null;
  /** Aviso sonoro de pedidos nuevos apagado (lo decide cada admin). */
  silencio?: boolean;
  alternarSilencio?: () => void;
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
            className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[var(--tienda-color,#b8130e)] focus:border-transparent focus:outline-none"
          />
        </div>
        {alternarSilencio && (
          <button
            type="button"
            onClick={alternarSilencio}
            title={silencio ? 'Activar el sonido de pedidos nuevos' : 'Silenciar el sonido de pedidos nuevos'}
            className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 transition ${silencio ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{silencio ? 'volume_off' : 'volume_up'}</span>
            {silencio ? 'Sonido apagado' : 'Sonido activo'}
          </button>
        )}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filtro === f.id ? 'bg-[var(--tienda-color,#b8130e)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
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
                  <span className="text-[var(--tienda-color,#b8130e)] font-bold text-xs w-20 shrink-0">#{(o.codigo || o.id.slice(0, 8)).toUpperCase()}</span>
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
                    {o.status === 'Cancelado' ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-red-600">Pedido cancelado. Si llevaba stock, ya se devolvió al inventario.</p>
                        {puedeEliminar && (
                        <button
                          type="button"
                          disabled={ocupado === o.id}
                          onClick={() => {
                            if (window.confirm('¿Eliminar este pedido para siempre? Sirve para limpiar pedidos de prueba. No se puede deshacer.')) eliminar(o);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-extrabold hover:bg-red-50 active:scale-95 transition disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Eliminar pedido
                        </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">¿En qué va este pedido?</p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {ESTADOS.map((e) => {
                            const activo = o.status === e || (e === 'Preparando' && o.status === 'Listo');
                                                        return (
                              <button
                                key={e}
                                type="button"
                                disabled={ocupado === o.id || activo}
                                onClick={() => {
                                  if (e === 'Cancelado' && !window.confirm('¿Cancelar este pedido? Si llevaba stock, se devuelve al inventario.')) return;
                                  cambiarEstado(o, e);
                                }}
                                className={`flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-xl border-2 text-xs font-extrabold transition active:scale-95 disabled:cursor-default ${
                                  activo ? 'bg-[var(--tienda-color)] border-transparent text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50'
                                } ${e === 'Cancelado' ? 'col-span-2 sm:col-span-1 min-h-[44px] sm:min-h-[64px]' : ''}`}
                              >
                                <span className="material-symbols-outlined text-[24px]">{ICONO_ESTADO[e]}</span>
                                {e}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="font-bold text-gray-900">{o.customer_name || 'Cliente'}</p>
                        {o.customer_phone && (
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-gray-700 font-bold text-base">{o.customer_phone}</span>
                            {tel && (
                              <a href={tel} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" title="Escribir por WhatsApp" className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm hover:brightness-95 active:scale-95 transition">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88zM20.52 3.45A11.8 11.8 0 0 0 12.04 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.54 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.4z"/></svg>
                              </a>
                            )}
                          </div>
                        )}
                        {o.customer_address && (
                          <p className="text-gray-600 font-medium break-words mt-1.5">
                            {o.customer_address.split(/(https?:\/\/[^\s]+)/g).map((t, i) => /^https?:\/\//.test(t)
                              ? <a key={i} href={t} target="_blank" rel="noopener noreferrer" className="text-[var(--tienda-color,#b8130e)] font-bold underline">Abrir en el mapa</a>
                              : <span key={i}>{t}</span>)}
                          </p>
                        )}
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
                      <a href={`/pedido/${o.codigo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:bg-gray-50 active:scale-[0.99] transition">
                        <span className="w-10 h-10 rounded-full bg-[var(--tienda-color,#b8130e)]/10 text-[var(--tienda-color,#b8130e)] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[22px]">receipt_long</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold text-gray-900 leading-tight">Ver el recibo del cliente</span>
                          <span className="block text-[11px] text-gray-500 leading-snug">Lo mismo que le llegó a él, con el seguimiento</span>
                        </span>
                        <span className="material-symbols-outlined text-gray-300 text-[20px] shrink-0">chevron_right</span>
                      </a>
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
