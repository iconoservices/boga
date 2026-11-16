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

  // Redirigir si no es superadmin
  useEffect(() => {
    if (!cargando && !esSuperadmin) {
      router.replace('/login?redirect=/superadmin/network');
    }
  }, [cargando, esSuperadmin, router]);

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    try {
      // 1. Cargar solicitudes de revendedores
      const { data: reqData, error: reqErr } = await supabase
        .from('store_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!reqErr && reqData) {
        setSolicitudes(reqData as SolicitudRevendedor[]);
      }

      // 2. Cargar tiendas existentes
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, slug, status, whatsapp, owner_email, plan, created_at')
        .order('created_at', { ascending: false });

      if (storeData) {
        setStores(storeData as TiendaStore[]);
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
      // 1. Actualizar solicitud a approved
      await supabase
        .from('store_requests')
        .update({ status: 'approved' })
        .eq('id', sol.id);

      // 2. Generar slug único limpio
      const baseSlug = (sol.business_name || 'tienda')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Verificar si ya existe en stores
      const { data: storeExistente } = await supabase
        .from('stores')
        .select('id, status')
        .or(`name.ilike.${sol.business_name},slug.eq.${baseSlug}`)
        .limit(1);

      if (storeExistente && storeExistente.length > 0) {
        // Actualizar a activa
        await supabase
          .from('stores')
          .update({
            status: 'active',
            owner_email: sol.email || undefined,
            whatsapp: sol.whatsapp || undefined,
          })
          .eq('id', storeExistente[0].id);
      } else {
        // Crear tienda en stores
        await supabase.from('stores').insert({
          name: sol.business_name,
          slug: baseSlug,
          status: 'active',
          plan: 'revendedor',
          whatsapp: sol.whatsapp,
          owner_email: sol.email,
          city: sol.city || 'pucallpa',
          category: 'Tienda de Reventa',
          tagline: 'Tienda de Reventa Oficial en Boga Network',
        });
      }

      setMensajeExito(`¡Tienda "${sol.business_name}" activada con éxito (Verde en Market)!`);
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
      await supabase
        .from('store_requests')
        .update({ status: 'pending' })
        .eq('id', sol.id);

      // Actualizar en stores si existe
      await supabase
        .from('stores')
        .update({ status: 'inactive' })
        .ilike('name', sol.business_name);

      setMensajeExito(`Tienda "${sol.business_name}" puesta en modo borrador (Gris).`);
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
    try {
      await supabase.from('store_requests').delete().eq('id', sol.id);
      setMensajeExito(`Solicitud de "${sol.business_name}" eliminada.`);
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

                  return (
                    <div
                      key={sol.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                    >
                      {/* Información de la tienda */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                          estaActiva ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className="material-symbols-outlined text-[22px]">
                            {estaActiva ? 'storefront' : 'pending'}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-sm text-slate-900 truncate">
                              {sol.business_name}
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
                              <a
                                href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                                  `Hola ${sol.contact_name}! Te saludamos del equipo de Boga Network respecto a tu tienda "${sol.business_name}".`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
                              >
                                <span className="material-symbols-outlined text-[14px] text-[#25D366]">chat</span>
                                {sol.whatsapp}
                              </a>
                            )}
                            <span className="text-[10px] text-slate-400">
                              Registrado: {fecha}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                        {/* Botón WhatsApp directo */}
                        {sol.whatsapp && (
                          <a
                            href={`https://wa.me/${numWsp}?text=${encodeURIComponent(
                              `Hola ${sol.contact_name}! Te saludamos de Boga Network. Tu tienda "${sol.business_name}" está lista.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#25D366] hover:bg-emerald-50 transition cursor-pointer"
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
                            <span>{accionEnCurso === sol.id ? 'Activando...' : 'Activar Tienda (Verde)'}</span>
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
        </main>
      </div>
    </div>
  );
}
