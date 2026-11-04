'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
import { useEsSuperadmin } from '@/lib/superadmin';
import { supabase } from '@/lib/supabase';

type ClickRow = {
  id: number;
  tienda_slug: string;
  tipo: string;
  origen: string;
  metadata: Record<string, any>;
  user_agent: string | null;
  created_at: string;
};

type TiendaStat = {
  slug: string;
  nombre: string;
  total: number;
  pedidos: number;
  consultas: number;
  guia: number;
  linksDirectos: number;
  ultimoClick: string;
  whatsapp?: string;
};

export default function MetricasWhatsappPage() {
  const { esSuperadmin, cargando: cargandoAuth } = useEsSuperadmin();
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [storesMap, setStoresMap] = useState<Record<string, { name: string; whatsapp?: string }>>({});
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('mes');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [tablaExiste, setTablaExiste] = useState(true);

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    try {
      // 1. Cargar tiendas para tener nombres reales y WhatsApp
      const { data: storesData } = await supabase
        .from('stores')
        .select('slug,name,whatsapp');

      const sMap: Record<string, { name: string; whatsapp?: string }> = {};
      (storesData || []).forEach((s) => {
        sMap[s.slug] = { name: s.name, whatsapp: s.whatsapp || undefined };
      });
      setStoresMap(sMap);

      // 2. Cargar clics de WhatsApp
      const { data: clicksData, error } = await supabase
        .from('whatsapp_clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        if (error.code === '42P01') {
          // Tabla no existe aún
          setTablaExiste(false);
        }
        setClicks([]);
      } else {
        setTablaExiste(true);
        setClicks((clicksData as ClickRow[]) || []);
      }
    } catch {
      setClicks([]);
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    if (esSuperadmin) {
      cargarDatos();
    }
  }, [esSuperadmin, cargarDatos]);

  // Filtrado por fecha
  const clicksFiltrados = useMemo(() => {
    const ahora = new Date();
    return clicks.filter((c) => {
      const fecha = new Date(c.created_at);
      if (periodo === 'hoy') {
        return (
          fecha.getDate() === ahora.getDate() &&
          fecha.getMonth() === ahora.getMonth() &&
          fecha.getFullYear() === ahora.getFullYear()
        );
      }
      if (periodo === 'semana') {
        const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        return fecha >= hace7Dias;
      }
      if (periodo === 'mes') {
        return (
          fecha.getMonth() === ahora.getMonth() &&
          fecha.getFullYear() === ahora.getFullYear()
        );
      }
      return true;
    });
  }, [clicks, periodo]);

  // Agrupado por tienda
  const rankingTiendas = useMemo(() => {
    const map: Record<string, TiendaStat> = {};

    clicksFiltrados.forEach((c) => {
      const s = c.tienda_slug || 'desconocido';
      if (!map[s]) {
        const storeInfo = storesMap[s];
        map[s] = {
          slug: s,
          nombre: storeInfo?.name || (c.metadata?.tienda as string) || (c.metadata?.nombre as string) || s,
          total: 0,
          pedidos: 0,
          consultas: 0,
          guia: 0,
          linksDirectos: 0,
          ultimoClick: c.created_at,
          whatsapp: storeInfo?.whatsapp,
        };
      }

      map[s].total += 1;
      if (c.tipo === 'pedido') map[s].pedidos += 1;
      else if (c.tipo === 'guia') map[s].guia += 1;
      else if (c.tipo === 'link_directo') map[s].linksDirectos += 1;
      else map[s].consultas += 1;

      if (new Date(c.created_at) > new Date(map[s].ultimoClick)) {
        map[s].ultimoClick = c.created_at;
      }
    });

    let res = Object.values(map).sort((a, b) => b.total - a.total);
    if (filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase();
      res = res.filter((t) => t.nombre.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
    }
    return res;
  }, [clicksFiltrados, storesMap, filtroTexto]);

  // KPIs
  const totalHoy = useMemo(() => {
    const ahora = new Date();
    return clicks.filter((c) => {
      const fecha = new Date(c.created_at);
      return (
        fecha.getDate() === ahora.getDate() &&
        fecha.getMonth() === ahora.getMonth() &&
        fecha.getFullYear() === ahora.getFullYear()
      );
    }).length;
  }, [clicks]);

  const totalMes = useMemo(() => {
    const ahora = new Date();
    return clicks.filter((c) => {
      const fecha = new Date(c.created_at);
      return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    }).length;
  }, [clicks]);

  // Enviar reporte por WhatsApp al dueño
  const enviarReporteWhatsApp = (t: TiendaStat) => {
    const num = String(t.whatsapp || '').replace(/\D/g, '');
    const periodoTexto =
      periodo === 'hoy'
        ? 'hoy'
        : periodo === 'semana'
        ? 'en los últimos 7 días'
        : periodo === 'mes'
        ? 'este mes'
        : 'en total';

    const texto = `¡Hola ${t.nombre}! 👋 Te saludamos del equipo de BogaHub Pucallpa 📲

Te compartimos tu reporte oficial de clientes derivados:
📊 ${periodoTexto.toUpperCase()} has recibido *${t.total} clientes interesados* directamente en tu WhatsApp gracias a BogaHub.

${t.pedidos > 0 ? `🛒 Pedidos de catálogo: ${t.pedidos}\n` : ''}${t.consultas > 0 ? `💬 Consultas directas: ${t.consultas}\n` : ''}${t.guia > 0 ? `📍 Contactos desde la Guía Turística: ${t.guia}\n` : ''}
¡Tu vitrina digital en BogaHub sigue atrayendo ventas para tu negocio! 🚀`;

    const url = num.length >= 9
      ? `https://wa.me/${num.length === 9 ? '51' + num : num}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  };

  const copiarSQL = () => {
    const sql = `-- Tabla para registrar los clics hacia WhatsApp
create table if not exists public.whatsapp_clicks (
  id bigint generated always as identity primary key,
  tienda_slug text not null,
  tipo text default 'contacto',
  origen text default '',
  metadata jsonb default '{}'::jsonb,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_whatsapp_clicks_tienda on public.whatsapp_clicks (tienda_slug);
create index if not exists idx_whatsapp_clicks_created_at on public.whatsapp_clicks (created_at desc);

alter table public.whatsapp_clicks enable row level security;

create policy "Cualquiera puede registrar un click"
  on public.whatsapp_clicks for insert with check (true);

create policy "Lectura de clicks para superadmin y anon"
  on public.whatsapp_clicks for select using (true);`;

    navigator.clipboard.writeText(sql);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 2500);
  };

  if (cargandoAuth) {
    return (
      <div className="flex min-h-screen bg-[#f7f9fd] items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
      </div>
    );
  }

  if (!esSuperadmin) {
    return (
      <div className="flex min-h-screen bg-[#f7f9fd] items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-red-600 mb-2">Acceso Restringido</h1>
          <p className="text-sm text-secondary">Esta sección requiere permisos de superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9fd]">
      <SuperadminSidebarNav />

      <main className="flex-1 p-4 lg:p-8 max-w-7xl overflow-y-auto">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-[#25D366]">chat</span>
              <h1 className="text-2xl font-bold tracking-tight text-[#191b23]">Clientes derivados a WhatsApp</h1>
            </div>
            <p className="text-xs text-secondary mt-1">
              Rastreo exacto de clientes enviados a los comercios de Pucallpa para reportes y cobros de membresía.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cargarDatos}
              disabled={cargandoDatos}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#c2c6d6]/60 shadow-xs hover:bg-[#f2f3fd] transition-all active:scale-95 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${cargandoDatos ? 'animate-spin' : ''}`}>refresh</span>
              Actualizar
            </button>
          </div>
        </div>

        {/* Aviso si la tabla aún no se ha creado en Supabase */}
        {!tablaExiste && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">database</span>
              <div>
                <h3 className="font-bold text-sm text-amber-900">La tabla whatsapp_clicks aún no está creada en Supabase</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Pega el script SQL en el SQL Editor de tu proyecto Supabase para comenzar a guardar los clics.
                </p>
              </div>
            </div>
            <button
              onClick={copiarSQL}
              className="shrink-0 px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
            >
              {copiadoSql ? '¡Copiado al portapapeles! ✓' : 'Copiar Script SQL'}
            </button>
          </div>
        )}

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-white border border-[#c2c6d6]/40 shadow-xs">
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Contactos Hoy</span>
              <span className="material-symbols-outlined text-[20px] text-emerald-600">today</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#191b23]">{totalHoy}</div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Interesados directos</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#c2c6d6]/40 shadow-xs">
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Contactos Este Mes</span>
              <span className="material-symbols-outlined text-[20px] text-primary">calendar_month</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#191b23]">{totalMes}</div>
            <span className="text-[11px] text-primary font-semibold mt-1 inline-block">Ventas potenciales</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#c2c6d6]/40 shadow-xs">
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total Histórico</span>
              <span className="material-symbols-outlined text-[20px] text-amber-500">all_inclusive</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#191b23]">{clicks.length}</div>
            <span className="text-[11px] text-secondary font-medium mt-1 inline-block">Clics registrados</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#c2c6d6]/40 shadow-xs">
            <div className="flex items-center justify-between text-secondary mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Comercios Beneficiados</span>
              <span className="material-symbols-outlined text-[20px] text-indigo-500">storefront</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#191b23]">{rankingTiendas.length}</div>
            <span className="text-[11px] text-indigo-600 font-semibold mt-1 inline-block">Tiendas con clientes</span>
          </div>
        </div>

        {/* Filtros de período y buscador */}
        <div className="bg-white rounded-2xl border border-[#c2c6d6]/40 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[#f2f3fd] p-1 border border-[#c2c6d6]/40 self-start sm:self-auto">
            {(['hoy', 'semana', 'mes', 'todo'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  periodo === p
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Últimos 7 días' : p === 'mes' ? 'Este Mes' : 'Todo'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[18px]">search</span>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Filtrar por negocio o slug…"
              className="w-full pl-9 pr-3 py-2 bg-[#f9f9ff] border border-[#c2c6d6]/60 rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Tabla Ranking de Comercios */}
        <div className="bg-white rounded-2xl border border-[#c2c6d6]/40 shadow-xs overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[#c2c6d6]/30 flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#191b23]">Ranking de Comercios con Clientes Derivados</h2>
            <span className="text-xs text-secondary font-mono">
              {rankingTiendas.length} {rankingTiendas.length === 1 ? 'comercio' : 'comercios'}
            </span>
          </div>

          {cargandoDatos ? (
            <div className="p-12 text-center text-secondary text-xs flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
              Cargando estadísticas de WhatsApp…
            </div>
          ) : rankingTiendas.length === 0 ? (
            <div className="p-12 text-center text-secondary">
              <span className="material-symbols-outlined text-4xl text-secondary/40 mb-2">chat_error</span>
              <p className="text-sm font-semibold">No hay contactos registrados en este período.</p>
              <p className="text-xs text-secondary/70 mt-1 max-w-md mx-auto">
                Los clics se registrarán automáticamente cuando los clientes toquen los botones de WhatsApp en las tiendas o la Guía Turística.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9f9ff] text-secondary font-mono uppercase text-[10px] border-b border-[#c2c6d6]/30">
                  <tr>
                    <th className="py-3 px-4">Puesto</th>
                    <th className="py-3 px-4">Negocio / Tienda</th>
                    <th className="py-3 px-4 text-center">Total Clientes</th>
                    <th className="py-3 px-4">Desglose</th>
                    <th className="py-3 px-4">Último Contacto</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c2c6d6]/20">
                  {rankingTiendas.map((t, index) => (
                    <tr key={t.slug} className="hover:bg-[#f9f9ff]/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-secondary">
                        #{index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#191b23] text-sm">{t.nombre}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] text-secondary bg-[#f2f3fd] px-1.5 py-0.5 rounded">
                            {t.slug}
                          </code>
                          <a
                            href={`https://bogahub.app/ir/${t.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline"
                            title="Probar enlace de redirección corta"
                          >
                            /ir/{t.slug} ↗
                          </a>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full font-black text-sm bg-emerald-100 text-emerald-800">
                          {t.total}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {t.pedidos > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              🛒 {t.pedidos} pedidos
                            </span>
                          )}
                          {t.consultas > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              💬 {t.consultas} consultas
                            </span>
                          )}
                          {t.guia > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              📍 {t.guia} guía
                            </span>
                          )}
                          {t.linksDirectos > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                              🔗 {t.linksDirectos} /ir/
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-secondary font-mono text-[11px]">
                        {new Date(t.ultimoClick).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => enviarReporteWhatsApp(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:brightness-105 active:scale-95 shadow-xs transition-all"
                          title="Enviar reporte por WhatsApp al dueño"
                        >
                          <span className="material-symbols-outlined text-[15px]">send</span>
                          Enviar Reporte
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Registro en vivo de últimos 25 clics */}
        {clicksFiltrados.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#c2c6d6]/40 shadow-xs p-5">
            <h3 className="font-bold text-sm text-[#191b23] mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Últimos clics registrados en tiempo real
            </h3>
            <div className="divide-y divide-[#c2c6d6]/20">
              {clicksFiltrados.slice(0, 20).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">touch_app</span>
                    <span className="font-bold text-[#191b23] truncate">
                      {storesMap[c.tienda_slug]?.name || c.tienda_slug}
                    </span>
                    <span className="text-[10px] text-secondary font-mono bg-[#f2f3fd] px-1.5 py-0.5 rounded">
                      {c.tipo}
                    </span>
                    {c.origen && (
                      <span className="text-[10px] text-secondary/60 hidden sm:inline truncate max-w-[200px]">
                        {c.origen}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-secondary shrink-0">
                    {new Date(c.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

