'use client';

// Pestaña "Pedidos" del panel del dueño: los pedidos de la carta (que llegan por WhatsApp y ahora
// también quedan registrados) y las ventas de la caja (POS). Se puede ver el detalle, escribirle al
// cliente por WhatsApp y cambiar el estado. Cancelar devuelve el stock (lo hace el panel).

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Pedido {
  id: string;
  store: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: { id?: string; name: string; price: number; quantity: number; /** El cliente lo pidió sin stock suficiente (lo marca /api/pedidos). */ sin_stock?: boolean }[] | string | null;
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

// ── Tablero: una columna por etapa; cada pedido avanza con un solo botón ──
const COLUMNAS = [
  { id: 'recibidos', titulo: 'Recibidos', punto: 'bg-orange-500', estados: ['Pendiente'], siguiente: { estado: 'Preparando', texto: 'Preparar', icono: 'skillet' } },
  { id: 'preparando', titulo: 'Preparando', punto: 'bg-amber-500', estados: ['Preparando', 'Listo'], siguiente: { estado: 'Enviado', texto: 'Enviar', icono: 'local_shipping' }, anterior: { estado: 'Pendiente', texto: 'Recibidos' } },
  { id: 'camino', titulo: 'En camino', punto: 'bg-sky-500', estados: ['Enviado'], siguiente: { estado: 'Entregado', texto: 'Entregado', icono: 'check_circle' }, anterior: { estado: 'Preparando', texto: 'Preparando' } },
  { id: 'entregado', titulo: 'Entregados', punto: 'bg-emerald-500', estados: ['Entregado'], siguiente: null, anterior: { estado: 'Enviado', texto: 'En camino' } },
  { id: 'cancelados', titulo: 'Cancelados', punto: 'bg-red-500', estados: ['Cancelado'], siguiente: null },
] as { id: string; titulo: string; punto: string; estados: string[]; siguiente: { estado: string; texto: string; icono: string } | null; anterior?: { estado: string; texto: string } }[];
const MAX_ENTREGADOS = 15;

const hace = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

/**
 * Arrastrar la tarjeta hacia la derecha (con el dedo o con el mouse) la pasa a la siguiente etapa.
 * Cuidado con el scroll: el gesto solo cuenta si es claramente horizontal y largo; soltar antes lo cancela, y el aviso
 * «Deshacer» cubre cualquier error. El botón de la tarjeta sigue ahí para quien prefiera tocar.
 */
function TarjetaDeslizable({ onAvanzar, etiqueta, icono, children }: { onAvanzar?: () => void; etiqueta?: string; icono?: string; children: React.ReactNode }) {
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const modo = useRef<'h' | 'v' | null>(null);
  const arrastro = useRef(false);
  const [dx, setDx] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const UMBRAL = 96;

  if (!onAvanzar) return <>{children}</>;

  const reiniciar = () => { inicio.current = null; modo.current = null; setDx(0); setArrastrando(false); };
  const alBajar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Los botones y enlaces de la tarjeta se tocan normal: el arrastre solo arranca desde el resto de la tarjeta.
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    inicio.current = { x: e.clientX, y: e.clientY };
    modo.current = null;
    arrastro.current = false;
  };
  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!inicio.current) return;
    const mx = e.clientX - inicio.current.x;
    const my = e.clientY - inicio.current.y;
    if (!modo.current) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      modo.current = Math.abs(mx) > Math.abs(my) * 1.8 ? 'h' : 'v';
      if (modo.current === 'h') { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} setArrastrando(true); }
    }
    if (modo.current === 'h') { arrastro.current = true; setDx(Math.max(0, Math.min(mx, 160))); }
  };
  const alSoltar = () => {
    if (modo.current === 'h' && dx >= UMBRAL) onAvanzar();
    reiniciar();
  };

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <div className={`absolute inset-0 flex items-center gap-2 pl-4 rounded-lg text-white font-extrabold text-sm transition-colors ${dx >= UMBRAL ? 'bg-emerald-600' : 'bg-emerald-400'}`} aria-hidden="true">
        <span className="material-symbols-outlined text-[22px]">{icono ?? 'arrow_forward'}</span>{dx >= UMBRAL ? 'Suelta para ' : 'Sigue arrastrando · '}{etiqueta}
      </div>
      <div
        className={`relative ${arrastrando ? 'select-none cursor-grabbing' : 'cursor-grab'}`}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s' : 'none' }}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={reiniciar}
        onClickCapture={(e) => { if (arrastro.current) { e.preventDefault(); e.stopPropagation(); arrastro.current = false; } }}
      >
        {children}
      </div>
    </div>
  );
}

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
  // Tablero (por etapas) o lista; se recuerda lo último que eligió el dueño en este dispositivo.
  const [vista, setVista] = useState<'tablero' | 'lista'>('tablero');
  const [verCancelados, setVerCancelados] = useState(false);
  // En celular se ve una etapa a la vez (con pestañas arriba); en pantalla ancha, todas las columnas juntas.
  const [colMovil, setColMovil] = useState('recibidos');
  // Al pasar un pedido a la siguiente etapa sale un aviso con «Deshacer» unos segundos (en celular la tarjeta desaparece de la
  // pestaña y no se ve a dónde fue; además evita los errores de dedo).
  const [deshacer, setDeshacer] = useState<{ pedido: Pedido; antes: string; ahora: string } | null>(null);
  useEffect(() => {
    if (!deshacer) return;
    const t = setTimeout(() => setDeshacer(null), 7000);
    return () => clearTimeout(t);
  }, [deshacer]);
  const avanzar = (o: Pedido, estado: string) => {
    setDeshacer({ pedido: o, antes: o.status, ahora: estado });
    cambiarEstado(o, estado);
  };
  // Al abrir, se muestra la primera etapa que tenga pedidos (los nuevos, si hay).
  const [yaElegi, setYaElegi] = useState(false);
  useEffect(() => {
    if (yaElegi || pedidos.length === 0) return;
    const primera = COLUMNAS.find((c) => c.id !== 'cancelados' && pedidos.some((p) => c.estados.includes(p.status)));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (primera) setColMovil(primera.id);
    setYaElegi(true);
  }, [pedidos, yaElegi]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { if (localStorage.getItem('boga:pedidos-vista') === 'lista') setVista('lista'); } catch {}
  }, []);
  const elegirVista = (v: 'tablero' | 'lista') => {
    setVista(v);
    try { localStorage.setItem('boga:pedidos-vista', v); } catch {}
  };

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

  // Tablero: todos los pedidos que coinciden con la búsqueda, del más nuevo al más viejo.
  const tablero = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pedidos
      .filter((p) => !q || p.id.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q) || (p.customer_name || '').toLowerCase().includes(q) || (p.customer_phone || '').includes(q))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [pedidos, busca]);

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
    <div className="flex flex-col gap-3 w-full">
      {/* Resumen: una franja delgada con los cuatro números (antes eran cuatro tarjetas grandes) */}
      <p className="sm:hidden flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-md shadow-sm px-3 py-2 text-[12px] font-semibold text-gray-500">
        <span><b className="text-gray-900 text-sm font-black">S/ {kpi.ingresos.toFixed(2)}</b> · {kpi.total} {kpi.total === 1 ? 'pedido' : 'pedidos'}</span>
        <span>{kpi.activos} {kpi.activos === 1 ? 'activo' : 'activos'}{kpi.cancelados > 0 ? ` · ${kpi.cancelados} canc.` : ''}</span>
      </p>
      <div className="hidden sm:grid grid-cols-4 bg-white border border-gray-100 rounded-md shadow-sm divide-x divide-gray-100 overflow-hidden">
        {[
          { t: 'Ingresos', v: `S/ ${kpi.ingresos.toFixed(2)}`, s: `${kpi.total} ${kpi.total === 1 ? 'pedido' : 'pedidos'}` },
          { t: 'Activos', v: String(kpi.activos), s: `${kpi.pendientes} por atender` },
          { t: 'Ticket promedio', v: `S/ ${kpi.ticket.toFixed(2)}`, s: 'por pedido' },
          { t: 'Cancelados', v: String(kpi.cancelados), s: kpi.total ? `${((kpi.cancelados / kpi.total) * 100).toFixed(0)}%` : '—' },
        ].map((k) => (
          <div key={k.t} className="px-3 py-2 min-w-0">
            <h4 className="text-[10px] font-bold text-gray-500 tracking-wider uppercase truncate">{k.t}</h4>
            <p className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-gray-900 leading-tight">{k.v}</span>
              <span className="text-[11px] font-semibold text-gray-400 truncate">{k.s}</span>
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
        <div className="flex items-center gap-2 sm:contents">
        {alternarSilencio && (
          <button
            type="button"
            onClick={alternarSilencio}
            title={silencio ? 'Activar el sonido de pedidos nuevos' : 'Silenciar el sonido de pedidos nuevos'}
            className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 transition ${silencio ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{silencio ? 'volume_off' : 'volume_up'}</span>
            <span className="hidden sm:inline">{silencio ? 'Sonido apagado' : 'Sonido activo'}</span>
          </button>
        )}
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0" role="group" aria-label="Cómo ver los pedidos">
          {([['tablero', 'view_kanban', 'Tablero'], ['lista', 'list', 'Lista']] as const).map(([id, ico, txt]) => (
            <button
              key={id}
              type="button"
              onClick={() => elegirVista(id)}
              aria-pressed={vista === id}
              className={`h-9 px-3 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${vista === id ? 'bg-[var(--tienda-color,#b8130e)] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{ico}</span>{txt}
            </button>
          ))}
        </div>
        {vista === 'tablero' && kpi.cancelados > 0 && (
          <button
            type="button"
            onClick={() => setVerCancelados((v) => !v)}
            className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 shrink-0 transition ${verCancelados ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>Cancelados ({kpi.cancelados})
          </button>
        )}
        </div>
        <div className={`flex gap-2 overflow-x-auto hide-scrollbar ${vista === 'lista' ? '' : 'hidden'}`}>
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

      {/* Tablero */}
      {vista === 'tablero' && (
        <>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar lg:hidden -mx-1 px-1" role="tablist" aria-label="Etapas del pedido">
          {COLUMNAS.filter((col) => col.id !== 'cancelados' || verCancelados).map((col) => {
            const n = tablero.filter((p) => col.estados.includes(p.status)).length;
            const activa = colMovil === col.id;
            return (
              <button
                key={col.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setColMovil(col.id)}
                className={`shrink-0 h-10 px-3 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition ${activa ? 'bg-[var(--tienda-color,#b8130e)] border-transparent text-white' : col.id === 'recibidos' && n > 0 ? 'bg-orange-50 border-orange-300 text-orange-700 ring-2 ring-orange-200' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                <span className={`w-2 h-2 rounded-full ${activa ? 'bg-white' : col.punto}`} />
                {col.titulo}
                <span className={`min-w-[20px] text-center rounded-full px-1.5 text-[11px] font-black ${activa ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col lg:grid gap-3" style={{ gridTemplateColumns: `repeat(${verCancelados ? 5 : 4}, minmax(0, 1fr))` }}>
          {COLUMNAS.filter((col) => col.id !== 'cancelados' || verCancelados).map((col) => {
            const todos = tablero.filter((p) => col.estados.includes(p.status));
            const visibles = col.id === 'entregado' ? todos.slice(0, MAX_ENTREGADOS) : todos;
            return (
              <section key={col.id} className={`${colMovil === col.id ? 'flex' : 'hidden'} lg:flex min-w-0 flex-col rounded-xl bg-gray-50/70 border border-gray-100`}>
                <header className="hidden lg:flex items-center justify-between gap-2 px-3 py-2.5">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold text-gray-700 uppercase tracking-wide">
                    <span className={`w-2 h-2 rounded-full ${col.punto}`} />{col.titulo}
                  </h3>
                  <span className="text-[11px] font-black text-gray-500 bg-white border border-gray-200 rounded-full min-w-[22px] text-center px-1.5 py-0.5">{todos.length}</span>
                </header>
                <div className="flex flex-col gap-2.5 p-2 lg:pt-0">
                  {visibles.length === 0 && <p className="text-[11px] font-semibold text-gray-400 text-center py-6">Sin pedidos</p>}
                  {visibles.map((o) => {
                    const items = itemsDe(o);
                    const tel = o.customer_phone ? wa(o.customer_phone) : '';
                    const nuevo = o.status === 'Pendiente';
                    const direccion = (o.customer_address || '').replace(/https?:\/\/\S+/g, '').trim();
                    const enlaceMapa = (o.customer_address || '').match(/https?:\/\/\S+/)?.[0];
                    return (
                      <TarjetaDeslizable key={o.id} onAvanzar={col.siguiente && ocupado !== o.id ? () => avanzar(o, col.siguiente!.estado) : undefined} etiqueta={col.siguiente?.texto.toLowerCase()} icono={col.siguiente?.icono}>
                      <article className={`bg-white rounded-lg border shadow-sm p-3 flex flex-col gap-2 ${nuevo ? 'border-orange-300' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--tienda-color,#b8130e)] font-black text-xs">#{(o.codigo || o.id.slice(0, 8)).toUpperCase()}</span>
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            {nuevo && <span className="px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-black">NUEVO</span>}
                            {hace(o.created_at)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-gray-900 leading-tight truncate">{o.customer_name || 'Cliente'}</p>
                          {o.customer_phone && <p className="text-[11px] font-semibold text-gray-500">{o.customer_phone}</p>}
                          {mostrarTienda && <p className="text-[10px] font-bold text-gray-400">{nombreTienda(o.store)}</p>}
                        </div>
                        <ul className="text-xs text-gray-700 font-medium border-y border-gray-100 py-1.5 flex flex-col gap-0.5">
                          {items.slice(0, 4).map((it, i) => <li key={i} className="flex gap-1.5"><span className="font-black text-gray-900">{it.quantity}×</span><span className="truncate">{it.name}</span></li>)}
                          {items.length > 4 && <li className="text-[11px] text-gray-400 font-bold">+{items.length - 4} más…</li>}
                        </ul>
                        {(direccion || enlaceMapa) && (
                          <div className="flex flex-col gap-1">
                            {direccion && <p className="text-[11px] text-gray-500 font-medium flex items-start gap-1 line-clamp-2"><span className="material-symbols-outlined text-[14px] shrink-0">location_on</span>{direccion}</p>}
                            {enlaceMapa && (
                              <a href={enlaceMapa} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--tienda-color,#b8130e)] underline">
                                <span className="material-symbols-outlined text-[14px]">map</span>Abrir en el mapa
                              </a>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-black text-gray-900">S/ {Number(o.total_amount).toFixed(2)}</span>
                          <span className="flex items-center gap-1 flex-wrap justify-end">
                            {o.payment_method && <span className="text-[10px] font-bold text-gray-500">{o.payment_method}</span>}
                            {o.pago_estado && (
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${o.pago_estado === 'pagado' ? 'bg-green-50 text-green-700 border-green-200' : o.pago_estado === 'fallido' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {o.pago_estado === 'pagado' ? 'Pagado' : o.pago_estado === 'fallido' ? 'Pago fallido' : 'Por cobrar'}
                              </span>
                            )}
                          </span>
                        </div>
                        {col.siguiente && (
                          <button
                            type="button"
                            disabled={ocupado === o.id}
                            onClick={() => avanzar(o, col.siguiente!.estado)}
                            className="w-full h-12 rounded-xl bg-[var(--tienda-color,#b8130e)] text-white text-base font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[22px]">{col.siguiente.icono}</span>{col.siguiente.texto}
                          </button>
                        )}
                        {/* Acciones con nombre (no solo íconos) para que se entienda qué hace cada una */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-0.5 border-t border-gray-100">
                          {tel && (
                            <a href={tel} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[84px] h-8 px-2 rounded-full bg-[#25D366] text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 hover:brightness-95 active:scale-95 transition">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88zM20.52 3.45A11.8 11.8 0 0 0 12.04 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.54 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.4z"/></svg>WhatsApp
                            </a>
                          )}
                          {o.codigo && (
                            <a href={`/pedido/${o.codigo}`} target="_blank" rel="noopener noreferrer" title="Lo mismo que le llegó al cliente" className="flex-1 min-w-[84px] h-8 px-2 rounded-full border border-gray-200 text-gray-600 text-[11px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-gray-50 active:scale-95 transition">
                              <span className="material-symbols-outlined text-[16px]">receipt_long</span>Recibo
                            </a>
                          )}
                          {col.anterior && (
                            <button
                              type="button"
                              disabled={ocupado === o.id}
                              onClick={() => avanzar(o, col.anterior!.estado)}
                              title={`Regresarlo a «${col.anterior.texto}»`}
                              className="w-full h-8 px-2 rounded-full border border-gray-200 text-gray-600 text-[11px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-gray-50 active:scale-95 transition disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">undo</span>Regresar a {col.anterior.texto}
                            </button>
                          )}
                          {col.id !== 'entregado' && col.id !== 'cancelados' && (
                            <button
                              type="button"
                              disabled={ocupado === o.id}
                              onClick={() => { if (window.confirm('¿Cancelar este pedido? Si llevaba stock, se devuelve al inventario.')) cambiarEstado(o, 'Cancelado'); }}
                              className="w-full h-8 px-2 rounded-full text-red-500 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-red-50 active:scale-95 transition disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>Cancelar pedido
                            </button>
                          )}
                          {col.id === 'cancelados' && puedeEliminar && (
                            <button
                              type="button"
                              disabled={ocupado === o.id}
                              onClick={() => { if (window.confirm('¿Eliminar este pedido para siempre? Sirve para limpiar pedidos de prueba. No se puede deshacer.')) eliminar(o); }}
                              className="flex-1 min-w-[84px] h-8 px-2 rounded-full border border-red-200 text-red-600 text-[11px] font-extrabold flex items-center justify-center gap-1.5 hover:bg-red-50 active:scale-95 transition disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>Eliminar
                            </button>
                          )}
                        </div>
                      </article>
                      </TarjetaDeslizable>
                    );
                  })}
                  {col.id === 'entregado' && todos.length > MAX_ENTREGADOS && (
                    <p className="text-[11px] font-semibold text-gray-400 text-center py-1">Mostrando los últimos {MAX_ENTREGADOS}. Los demás están en «Lista».</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        </>
      )}

      {deshacer && (
        <div className="fixed left-3 right-3 bottom-20 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96 z-[60] flex items-center justify-between gap-3 rounded-xl bg-gray-900 text-white px-4 py-3 shadow-xl" role="status">
          <span className="text-sm font-semibold min-w-0 truncate">Pasó a «{deshacer.ahora === 'Pendiente' ? 'Recibidos' : deshacer.ahora === 'Enviado' ? 'En camino' : deshacer.ahora === 'Entregado' ? 'Entregados' : deshacer.ahora}»</span>
          <button
            type="button"
            onClick={() => { cambiarEstado(deshacer.pedido, deshacer.antes); setDeshacer(null); }}
            className="shrink-0 text-sm font-extrabold text-amber-300 px-2 py-1 -mr-2"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* Lista */}
      {vista === 'lista' && (lista.length === 0 ? (
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
                              <span className="text-gray-700 font-medium">
                                {it.quantity}× {it.name}
                                {it.sin_stock && (
                                  <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold align-middle" title="Cuando el cliente lo pidió no había stock suficiente. Revisa antes de confirmar.">
                                    <span className="material-symbols-outlined text-[12px]">warning</span>Sin stock
                                  </span>
                                )}
                              </span>
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
      ))}
    </div>
  );
}
