'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

type SolicitudRevendedor = {
  id: string;
  contact_name: string;
  business_name: string;
  whatsapp: string;
  city: string;
  email: string;
  interest: string;
  category: string;
  description: string;
  status: string; // 'pending' | 'approved' | 'rejected'
  created_at: string;
};

type TiendaStore = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  whatsapp?: string;
  owner_email?: string;
  plan?: string;
  created_at?: string;
  tienda_proveedora?: string;
  modulos?: Record<string, any>;
  es_revendedor?: boolean;
  template?: string;
};

export default function SuperadminNetworkPage() {
  const router = useRouter();
  const { esSuperadmin, cargando } = useEsSuperadmin();

  const [solicitudes, setSolicitudes] = useState<SolicitudRevendedor[]>([]);
  const [stores, setStores] = useState<TiendaStore[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'activas'>('todos');
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState('');
  const [tiendaDetalle, setTiendaDetalle] = useState<{
    solicitud: SolicitudRevendedor;
    store?: TiendaStore;
  } | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Redirigir si no es superadmin
  useEffect(() => {
    if (!cargando && !esSuperadmin) {
      router.replace('/login?redirect=/superadmin/network');
    }
  }, [cargando, esSuperadmin, router]);

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  };

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const d = await res.json();
        setSolicitudes(d.solicitudes || []);
        setStores(d.stores || []);
      } else {
        // Fallback directo a supabase si la api estuviera restringida
        const { data: reqData } = await supabase
          .from('store_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (reqData) setSolicitudes(reqData as SolicitudRevendedor[]);
      }
    } catch (err) {
      console.warn('Error al cargar datos en superadmin/network:', err);
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    if (esSuperadmin) {
      document.title = 'Boga Admin · Tiendas Revendedoras (Network)';
      cargarDatos();
    }
  }, [esSuperadmin, cargarDatos]);

  // Activar tienda (Pasa de gris a activa)
  const handleActivar = async (sol: SolicitudRevendedor) => {
    setAccionEnCurso(sol.id);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'activar',
          id: sol.id,
          business_name: sol.business_name,
          whatsapp: sol.whatsapp,
          email: sol.email,
          city: sol.city,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al activar');

      setMensajeExito(data.mensaje || `¡Tienda "${sol.business_name}" activada con éxito (Verde en Market)!`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error al activar la tienda: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  // Desactivar tienda (Pasar a gris / borrador)
  const handleDesactivar = async (sol: SolicitudRevendedor) => {
    setAccionEnCurso(sol.id);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'desactivar',
          id: sol.id,
          business_name: sol.business_name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desactivar');

      setMensajeExito(data.mensaje || `Tienda "${sol.business_name}" puesta en modo borrador (Gris).`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  // Eliminar solicitud
  const handleEliminar = async (sol: SolicitudRevendedor) => {
    if (!confirm(`¿Eliminar definitivamente la solicitud de "${sol.business_name}"?`)) return;

    setAccionEnCurso(sol.id);
    setMensajeExito('');

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/superadmin/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: 'eliminar',
          id: sol.id,
          business_name: sol.business_name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      setMensajeExito(data.mensaje || `Solicitud de "${sol.business_name}" eliminada.`);
      await cargarDatos();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  if (!esSuperadmin) return null;

  // Filtrado de solicitudes de revendedores
  const solicitudesRevendedores = solicitudes.filter((s) => {
    const esRevendedor =
      s.interest === 'revendedor' ||
      s.category?.toLowerCase().includes('revend') ||
      s.description?.toLowerCase().includes('reventa') ||
      s.description?.toLowerCase().includes('dropshipping');

    if (!esRevendedor && solicitudes.length > 0) {
      // También incluir si es el único tipo de solicitudes
      return s.interest === 'revendedor';
    }
    return true;
  });

  const listaFiltrada = solicitudesRevendedores.filter((s) => {
    // Filtro por estado
    if (filtroEstado === 'pendientes' && s.status === 'approved') return false;
    if (filtroEstado === 'activas' && s.status !== 'approved') return false;

    // Filtro por búsqueda
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      s.business_name?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.whatsapp?.includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  const totalRevendedores = solicitudesRevendedores.length;
  const totalActivas = solicitudesRevendedores.filter((s) => s.status === 'approved').length;
  const totalPendientes = solicitudesRevendedores.filter((s) => s.status !== 'approved').length;

  const encontrarStore = (sol: SolicitudRevendedor) => {
    return stores.find((st) => {
      if (st.slug && sol.business_name) {
        const slugBuscado = sol.business_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        if (
          st.slug === slugBuscado ||
          st.slug === `${slugBuscado}-bm` ||
          st.slug.replace(/-bm$/, '') === slugBuscado
        ) {
          return true;
        }
      }
      if (st.whatsapp && sol.whatsapp && st.whatsapp.replace(/\D/g, '') === sol.whatsapp.replace(/\D/g, '')) {
        return true;
      }
      if (st.owner_email && sol.email && st.owner_email.toLowerCase() === sol.email.toLowerCase()) {
        return true;
      }
      return false;
    });
  };

  const obtenerSlug = (sol: SolicitudRevendedor, st?: TiendaStore) => {
    if (st?.slug) return st.slug;
    return (sol.business_name || 'tienda')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const copiarLinkTienda = (slug: string) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>

      <div className="flex-1 min-w-0 bg-background text-[#191b23] font-body-md flex flex-col">
        {/* Cabecera */}
        <header className="border-b border-[#c2c6d6]/50 bg-white sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/superadmin" className="text-[#424754] hover:text-[#0058be] text-xs font-semibold flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Superadmin
              </Link>
              <span className="text-[#c2c6d6]">/</span>
              <span className="font-bold text-sm text-[#191b23] flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">hub</span>
                Boga Network · Tiendas Revendedoras
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cargarDatos}
                disabled={cargandoDatos}
                className="px-3 py-1.5 rounded-lg border border-[#c2c6d6] hover:bg-slate-50 text-xs font-bold text-[#424754] flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] ${cargandoDatos ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span className="hidden sm:inline">Refrescar</span>
              </button>
              <Link
                href="/network"
                target="_blank"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Ver Landing Network</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 flex flex-col gap-6">
          
          {/* Mensaje de éxito */}
          {mensajeExito && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {mensajeExito}
              </span>
              <button onClick={() => setMensajeExito('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-[#c2c6d6]/60 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#424754]/70 uppercase tracking-wider">Total Revendedores</p>
                <p className="text-2xl font-black text-[#191b23] mt-0.5">{totalRevendedores}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Emprendedores registrados</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">storefront</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Tiendas Activas (Verde)</p>
                <p className="text-2xl font-black text-emerald-800 mt-0.5">{totalActivas}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Visibles y recibiendo pedidos</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">En Borrador / Gris</p>
                <p className="text-2xl font-black text-amber-900 mt-0.5">{totalPendientes}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Esperando aceptación o en prueba</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[24px]">pending</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-2xl border border-[#c2c6d6]/60 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por tienda, responsable, WhatsApp..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>

            {/* Pestañas de estado */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroEstado === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({totalRevendedores})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('pendientes')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroEstado === 'pendientes' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendientes / Gris ({totalPendientes})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('activas')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filtroEstado === 'activas' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activas ({totalActivas})
              </button>
            </div>
          </div>

          {/* Tabla / Lista de Tiendas Revendedoras */}
          <div className="bg-white rounded-2xl border border-[#c2c6d6]/60 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">store</span>
                Directorio de Tiendas de Reventa ({listaFiltrada.length})
              </span>
              <span className="text-[11px] text-slate-400">Control directo de activación</span>
            </div>

            {cargandoDatos ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <span className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-slate-500 font-medium">Cargando directorio de revendedores...</p>
              </div>
            ) : listaFiltrada.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">storefront</span>
                <p className="text-xs font-bold text-slate-600">No se encontraron tiendas revendedoras</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {busqueda ? 'Prueba con otro término de búsqueda.' : 'Las nuevas tiendas creadas desde /network aparecerán aquí.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {listaFiltrada.map((sol) => {
                  const estaActiva = sol.status === 'approved';
                  const cleanWsp = sol.whatsapp?.replace(/\D/g, '') || '';
                  const numWsp = cleanWsp.length === 9 ? `51${cleanWsp}` : cleanWsp;
                  const fecha = sol.created_at ? new Date(sol.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
                  const st = encontrarStore(sol);
                  const slug = obtenerSlug(sol, st);

                  return (
                    <div
                      key={sol.id}
                      onClick={() => setTiendaDetalle({ solicitud: sol, store: st })}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-emerald-50/40 transition cursor-pointer group"
                    >
                      {/* Información de la tienda */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold transition group-hover:scale-105 shadow-2xs ${
                          estaActiva ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className="material-symbols-outlined text-[22px]">
                            {estaActiva ? 'storefront' : 'pending'}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition flex items-center gap-1.5">
                              <span>{sol.business_name}</span>
                              <span className="material-symbols-outlined text-[15px] opacity-0 group-hover:opacity-100 transition text-emerald-600">
                                visibility
                              </span>
                            </h3>
                            {estaActiva ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Activa (Verde)
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Desactivada (Gris / Borrador)
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 capitalize">
                              · {sol.city || 'Pucallpa'}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60 hidden sm:inline">
                              /{slug}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                              {sol.contact_name}
                            </span>
                            {sol.email && (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">mail</span>
                                {sol.email}
                              </span>
                            )}
                            {sol.whatsapp && (
                              <span className="text-slate-700 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-[#25D366]">chat</span>
                                {sol.whatsapp}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              Registrado: {fecha}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {/* Botón Ver Detalles */}
                        <button
                          type="button"
                          onClick={() => setTiendaDetalle({ solicitud: sol, store: st })}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Ver todos los detalles de esta tienda"
                        >
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">info</span>
                          <span>Detalles</span>
                        </button>

                        {/* Botón Abrir Tienda */}
                        <a
                          href={`/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer shadow-2xs"
                          title="Abrir tienda en nueva pestaña"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>

                        {/* Botón WhatsApp directo */}
                        {sol.whatsapp && (
                          <a
                            href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                              `Hola ${sol.contact_name}! Te saludamos de Boga Network. Tu tienda "${sol.business_name}" está lista.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#25D366] hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
                            title="Escribir por WhatsApp"
                          >
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                          </a>
                        )}

                        {/* Botón Activar / Desactivar */}
                        {estaActiva ? (
                          <button
                            type="button"
                            disabled={accionEnCurso === sol.id}
                            onClick={() => handleDesactivar(sol)}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            {accionEnCurso === sol.id ? 'Guardando...' : 'Poner en Gris'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={accionEnCurso === sol.id}
                            onClick={() => handleActivar(sol)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>{accionEnCurso === sol.id ? 'Activando...' : 'Activar (Verde)'}</span>
                          </button>
                        )}

                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          disabled={accionEnCurso === sol.id}
                          onClick={() => handleEliminar(sol)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Eliminar solicitud"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ MODAL DE DETALLES DE LA TIENDA REVENDEDORA ══ */}
          {tiendaDetalle && (() => {
            const sol = tiendaDetalle.solicitud;
            const st = tiendaDetalle.store;
            const estaActiva = sol.status === 'approved';
            const cleanWsp = sol.whatsapp?.replace(/\D/g, '') || '';
            const numWsp = cleanWsp.length === 9 ? `51${cleanWsp}` : cleanWsp;
            const slug = obtenerSlug(sol, st);
            const fecha = sol.created_at ? new Date(sol.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';

            // Margen y proveedor desde modulos
            const mod = (st?.modulos as any) || {};
            const proveedor = st?.tienda_proveedora || mod.tiendaProveedora || 'Delva';
            const tipoMargen = mod.tipo_margen || 'porcentaje';
            const valorMargen = mod.margen_ganancia || 15;
            const margenTexto = tipoMargen === 'fijo' ? `S/ ${Number(valorMargen).toFixed(2)} por producto` : `+${valorMargen}% sobre precio proveedor`;
            const productosCount = Array.isArray(mod.productos_seleccionados) ? `${mod.productos_seleccionados.length} seleccionados` : 'Todos del catálogo (41+)';

            return (
              <div
                className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
                onClick={() => setTiendaDetalle(null)}
              >
                <div
                  className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Cabecera del Modal */}
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs shrink-0 ${
                        estaActiva ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                      }`}>
                        {sol.business_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-slate-900">
                            {sol.business_name}
                          </h2>
                          {estaActiva ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Activa (Verde)
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Desactivada (Gris)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Tienda de Reventa · {sol.city || 'Pucallpa'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTiendaDetalle(null)}
                      className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer border border-slate-200"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>

                  {/* Contenido del Modal */}
                  <div className="p-5 sm:p-6 flex flex-col gap-4">
                    {/* 1. Enlace Oficial y Accesos Rápidos */}
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex flex-col gap-2.5">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-emerald-700">link</span>
                        Enlace de la Tienda
                      </span>
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900">
                        <span className="truncate">{typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`}</span>
                        <button
                          type="button"
                          onClick={() => copiarLinkTienda(slug)}
                          className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">{linkCopiado ? 'check' : 'content_copy'}</span>
                          <span>{linkCopiado ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Abrir Tienda</span>
                        </a>
                        <a
                          href="/network/panel"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">dashboard</span>
                          <span>Panel Revendedor</span>
                        </a>
                      </div>
                    </div>

                    {/* 2. Ficha del Revendedor */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                        Datos del Revendedor
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Responsable:</span>
                          <span className="font-bold text-slate-900">{sol.contact_name}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Email:</span>
                          <span className="font-semibold text-slate-800">{sol.email || 'No registrado'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">WhatsApp:</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-slate-900">{sol.whatsapp || 'Sin número'}</span>
                            {sol.whatsapp && (
                              <a
                                href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                                  `Hola ${sol.contact_name}! Te saludamos de Boga Network respecto a tu tienda "${sol.business_name}".`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg transition"
                              >
                                <span className="material-symbols-outlined text-[12px]">chat</span>
                                <span>Escribir</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Ciudad de Entrega:</span>
                          <span className="font-semibold text-slate-800 capitalize">{sol.city || 'Pucallpa'}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Fecha de Registro:</span>
                          <span className="text-slate-700">{fecha}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Categoría:</span>
                          <span className="text-slate-700">{sol.category || sol.interest || 'Tienda de Reventa'}</span>
                        </div>
                      </div>

                      {sol.description && (
                        <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                          <span className="text-slate-400 block text-[11px]">Notas / Descripción:</span>
                          <p className="mt-0.5 italic">{sol.description}</p>
                        </div>
                      )}
                    </div>

                    {/* 3. Configuración de Boga Network */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">tune</span>
                        Configuración de Reventa
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Proveedor Aliado:</span>
                          <span className="font-bold text-slate-900 capitalize">{proveedor}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Margen de Ganancia:</span>
                          <span className="font-bold text-emerald-700">{margenTexto}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Productos Activos:</span>
                          <span className="font-semibold text-slate-800">{productosCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Acciones de Control Superadmin */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      {estaActiva ? (
                        <button
                          type="button"
                          disabled={accionEnCurso === sol.id}
                          onClick={() => {
                            handleDesactivar(sol);
                            setTiendaDetalle(null);
                          }}
                          className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">pause</span>
                          <span>Poner en Gris (Desactivar)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={accionEnCurso === sol.id}
                          onClick={() => {
                            handleActivar(sol);
                            setTiendaDetalle(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Activar Tienda (Poner en Verde)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={accionEnCurso === sol.id}
                        onClick={() => {
                          handleEliminar(sol);
                          setTiendaDetalle(null);
                        }}
                        className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Eliminar Registro</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}

