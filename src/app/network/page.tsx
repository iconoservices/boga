'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CIUDADES } from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';

const LINK_GRUPO_WHATSAPP = 'https://chat.whatsapp.com/ClozDTrFdhH8cqJPziBYKQ';

export default function BogaNetworkHomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Modal para activar cuenta de network
  const [modalRegistro, setModalRegistro] = useState(false);
  const [pasoRegistro, setPasoRegistro] = useState<'form' | 'exito'>('form');

  // Datos para registrar cuenta
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cuenta existente detectada
  const [cuentaExistente, setCuentaExistente] = useState<{ nombre: string; nombreTienda?: string } | null>(null);

  useEffect(() => {
    document.title = 'Boga Network · Gana Dinero desde tu Celular en Pucallpa';
  }, []);

  // Detectar si el usuario ya tiene cuenta de revendedor
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (!nombre) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        if (metaName) setNombre(metaName);
      }

      if (user.email) {
        supabase
          .from('store_requests')
          .select('business_name, contact_name, whatsapp, city')
          .eq('email', user.email)
          .eq('interest', 'revendedor')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              setCuentaExistente({
                nombre: data[0].contact_name || user.user_metadata?.full_name || '',
                nombreTienda: data[0].business_name || '',
              });
              if (data[0].contact_name) setNombre(data[0].contact_name);
              if (data[0].whatsapp) setWhatsapp(data[0].whatsapp);
              if (data[0].city) setCiudad(data[0].city);
            } else {
              try {
                localStorage.removeItem('boga_revendedor_draft');
                if (user?.id) localStorage.removeItem(`boga_revendedor_draft_${user.id}`);
              } catch {}
              setCuentaExistente(null);
            }
          });
      } else {
        try {
          const draft = localStorage.getItem('boga_revendedor_draft');
          if (draft) {
            const parsed = JSON.parse(draft);
            if (parsed?.whatsapp || parsed?.nombre) {
              setCuentaExistente({ nombre: parsed.nombre || '', nombreTienda: parsed.nombreTienda || '' });
            }
          }
        } catch {}
      }
    }
  }, [user, authLoading, nombre]);

  // Geolocalización
  const handleDetectarCiudad = async () => {
    setDetectando(true);
    setGeoAviso('');
    try {
      const res = await detectarCiudad();
      if (res.ok && res.slug) {
        setCiudad(res.slug);
        setGeoAviso(`Ubicado en ${res.nombreCrudo || res.slug}`);
      } else {
        setGeoAviso('No pudimos detectar tu ubicación.');
      }
    } catch {
      setGeoAviso('Permiso de GPS denegado.');
    } finally {
      setDetectando(false);
    }
  };

  // Activar la cuenta de dropshipping
  const handleActivarCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      router.push('/login?redirect=/network');
      return;
    }

    const cleanWsp = whatsapp.replace(/\D/g, '');
    if (!nombre.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!whatsapp.trim() || cleanWsp.length < 9) {
      setErrorMsg('El número de WhatsApp es obligatorio (mínimo 9 dígitos) para comunicarnos y validar tu cuenta.');
      return;
    }

    setIsLoading(true);
    const nombreTiendaProvisional = `${nombre.trim()} bm`;

    try {
      // Registrar solicitud con interest = 'revendedor'
      const { error } = await supabase.from('store_requests').insert({
        contact_name: nombre.trim(),
        business_name: nombreTiendaProvisional,
        whatsapp: whatsapp.trim(),
        city: ciudad,
        interest: 'revendedor',
        email: user.email || '',
        category: 'revendedor',
        description: 'Cuenta de dropshipping / revendedor activada desde Boga Network',
      });

      if (error) {
        console.warn('Aviso al guardar solicitud en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('Error no bloqueante al registrar solicitud:', err?.message);
    }

    // Guardar el borrador local para inicializar el panel
    try {
      const draftData = {
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        nombreTienda: nombreTiendaProvisional,
        ciudad,
        email: user.email,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('boga_revendedor_draft', JSON.stringify(draftData));
      if (user?.id) {
        localStorage.setItem(`boga_revendedor_draft_${user.id}`, JSON.stringify(draftData));
      }
    } catch {
      // noop
    }

    setIsLoading(false);
    setPasoRegistro('exito');
  };

  const abrirModalActivacion = () => {
    if (cuentaExistente) {
      router.push('/network/panel');
    } else if (user) {
      setPasoRegistro('form');
      setModalRegistro(true);
    } else {
      router.push('/login?redirect=/network');
    }
  };

  const irAPanelPestaña = (tab: 'preview' | 'productos' | 'afiliados') => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/network/panel?tab=${tab}`)}`);
      return;
    }
    if (cuentaExistente) {
      router.push(`/network/panel?tab=${tab}`);
    } else {
      setPasoRegistro('form');
      setModalRegistro(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="Boga Network" className="w-6 h-6" />
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">Boga Network</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gana Dinero · Reventa & Afiliados
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {cuentaExistente ? (
              <Link
                href="/network/panel"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                <span>Ir a mi Panel</span>
              </Link>
            ) : null}

            {authLoading ? (
              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 hidden sm:inline">
                  Hola, <b>{user.user_metadata?.full_name || user.email?.split('@')[0]}</b>
                </span>
                <Link
                  href="/profile"
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">account_circle</span>
                  <span>Mi Cuenta</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login?redirect=/network"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg"
                >
                  Ingresar
                </Link>
                <Link
                  href="/login?modo=registro&redirect=/network"
                  className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl transition shadow-xs"
                >
                  Registrarse
                </Link>
              </div>
            )}

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <Link
              href="/trabajos"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span className="hidden sm:inline">Volver a Trabajos</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Banner si ya tiene cuenta activa ── */}
      {cuentaExistente && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 text-xs shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="material-symbols-outlined text-emerald-200 text-lg">verified_user</span>
              <span>
                Ya tienes tu cuenta activa en Boga Network. Entra a tu panel para ver tus tiendas, productos y ganancias.
              </span>
            </div>
            <Link
              href="/network/panel"
              className="font-black bg-white text-emerald-800 hover:bg-emerald-50 px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition shrink-0"
            >
              Abrir Mi Panel de Control →
            </Link>
          </div>
        </div>
      )}

      {/* ── Contenido Principal (TEXTO A LA IZQUIERDA Y LAS 3 OPCIONES A LA DERECHA) ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
          
          {/* ════ COLUMNA IZQUIERDA: TEXTO PRINCIPAL Y ACCIONES STICKY ════ */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 flex flex-col items-start gap-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Oportunidades de Ingresos · Pucallpa</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Gana dinero desde tu celular con{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                Boga Network
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Descubre las formas oficiales de generar ingresos hoy mismo sin jefes ni horarios. Elige la que mejor se adapte a ti o combínalas.
            </p>

            {/* Botones de acción principales */}
            <div className="flex flex-col gap-2.5 w-full mt-1">
              <button
                type="button"
                onClick={abrirModalActivacion}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
              >
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span>{cuentaExistente ? 'Entrar a Mi Panel de Control →' : 'Activar Mi Cuenta Network →'}</span>
              </button>

              <a
                href={LINK_GRUPO_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-black text-xs sm:text-sm border border-[#25D366]/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
              >
                <span className="material-symbols-outlined text-[19px]">chat</span>
                <span>Únete al Grupo WhatsApp</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              🔒 Sin costos ocultos · Cero inversión en mercadería · Pagos directos
            </p>

            {/* Tarjeta de Beneficios y Confianza */}
            <div className="w-full bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5 mt-1">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                </span>
                <span>Beneficios oficiales de la red</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>Proveedores con stock verificado en Pucallpa.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>Cobros inmediatos por Yape o Plin al entregar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>Comunidad activa con soporte directo por WhatsApp.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* ════ COLUMNA DERECHA: LAS 3 OPCIONES (TARJETAS) DE GANAR DINERO ════ */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* ════ TARJETA 1: CREA Y VENDE CON TU TIENDA VIRTUAL ════ */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-300 hover:shadow-md transition">
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                      1
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                      Tienda Virtual Propia
                    </h2>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Tu Marca
                  </span>
                </div>

                {/* Caja de Ganancia */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Tu Margen</span>
                    <span className="text-lg font-black text-emerald-700 block leading-tight">+15% a +25%</span>
                    <span className="text-[9px] text-slate-500">sobre cada producto</span>
                  </div>
                  <div className="text-right bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 shrink-0">
                    <span className="text-[8px] font-bold text-slate-500 block uppercase">Estimado</span>
                    <span className="text-xs font-black text-slate-900 block leading-tight">S/ 600 - 1,200</span>
                    <span className="text-[8px] text-emerald-700 font-bold">mes</span>
                  </div>
                </div>

                {/* Beneficios directos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">storefront</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Catálogo propio</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Con tus fotos y precios.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Cero inversión</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Proveedor despacha.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] leading-tight">A tu WhatsApp</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Te pagan directamente.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => irAPanelPestaña('preview')}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">store</span>
                <span>{cuentaExistente ? 'Ir a Mis Tiendas Virtuales →' : 'Crear Tienda Virtual →'}</span>
              </button>
            </div>

            {/* ════ TARJETA 2: RECOMIENDA PRODUCTOS INDIVIDUALES ════ */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-4 hover:border-sky-300 hover:shadow-md transition">
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-xs font-black shrink-0">
                      2
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                      Productos Individuales
                    </h2>
                  </div>
                  <span className="bg-sky-100 text-sky-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Venta Rápida
                  </span>
                </div>

                {/* Caja de Ganancia */}
                <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Comisión Directa</span>
                    <span className="text-lg font-black text-sky-800 block leading-tight">+S/ 10 a S/ 35</span>
                    <span className="text-[9px] text-slate-500">por producto vendido</span>
                  </div>
                  <div className="text-right bg-white/80 px-2.5 py-1.5 rounded-xl border border-sky-200/60 shrink-0">
                    <span className="text-[8px] font-bold text-slate-500 block uppercase">En Estados</span>
                    <span className="text-xs font-black text-slate-900 block leading-tight">1 Clic</span>
                    <span className="text-[8px] text-sky-700 font-bold">compartir</span>
                  </div>
                </div>

                {/* Beneficios directos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">loyalty</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Links de Afiliado</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Enlace directo a 1 producto.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Alta demanda</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Relojes, lentes, gadgets.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">share</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 text-[11px] leading-tight">Estados de Wsp</p>
                      <p className="text-[9px] text-slate-500 leading-tight">Publicas y cobras diario.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => irAPanelPestaña('productos')}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>{cuentaExistente ? 'Ir a Productos de Afiliado →' : 'Recomendar Productos →'}</span>
              </button>
            </div>

            {/* ════ TARJETA 3: PROGRAMA DE AFILIADOS & BONOS EN EFECTIVO (DESACTIVADA / GRIS) ════ */}
            <div className="bg-slate-50/90 rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between gap-4 transition opacity-80">
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
                      3
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-slate-600 tracking-tight leading-snug">
                      Bonos por Recomendación
                    </h2>
                  </div>
                  <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    Próximamente
                  </span>
                </div>

                {/* Caja de Ganancia Desactivada */}
                <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Bono por Referido</span>
                    <span className="text-lg font-black text-slate-600 block leading-tight">+S/ 20 a S/ 50</span>
                    <span className="text-[9px] text-slate-400">por cada referido activo</span>
                  </div>
                  <div className="text-right bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400 block uppercase">Estado</span>
                    <span className="text-xs font-black text-slate-600 block leading-tight">En pausa</span>
                    <span className="text-[8px] text-slate-400 font-bold">por ahora</span>
                  </div>
                </div>

                {/* Beneficios directos en gris */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">store</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-700 text-[11px] leading-tight">Comercios</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Pollerías, boutiques.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-700 text-[11px] leading-tight">Choferes</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Taxi o mototaxis.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px]">group_add</span>
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-700 text-[11px] leading-tight">Revendedores</p>
                      <p className="text-[9px] text-slate-400 leading-tight">Comisiones de red.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón en gris / desactivado */}
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-3 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs shadow-none cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Desactivado por ahora · Próximamente</span>
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* ── MODAL: Activación de Cuenta y Confirmación con Grupo de WhatsApp ── */}
      {modalRegistro && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setModalRegistro(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalRegistro(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {pasoRegistro === 'form' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">badge</span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Activar Mi Cuenta Network</h3>
                    <p className="text-xs text-slate-500 font-medium">Completa tus datos para ingresar al panel y unirte a la red</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">contact_phone</span>
                  <span><b>Contacto directo:</b> Revisaremos tu solicitud y usaremos tu WhatsApp para validar tu cuenta.</span>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-red-600 shrink-0">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleActivarCuenta} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tu nombre completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Camila Salazar"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tu WhatsApp de contacto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 987 654 321"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                      />
                      <p className="text-[10px] text-emerald-700 font-bold mt-1">
                        Número de 9 dígitos de celular
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Tu ciudad / distrito</label>
                      <button
                        type="button"
                        onClick={handleDetectarCiudad}
                        disabled={detectando}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">my_location</span>
                        {detectando ? 'Ubicando...' : 'Ubicar GPS'}
                      </button>
                    </div>
                    <select
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                    >
                      {CIUDADES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre} ({c.region})
                        </option>
                      ))}
                    </select>
                    {geoAviso && <p className="text-[10px] text-amber-600 mt-1">{geoAviso}</p>}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <span>Activando tu cuenta...</span>
                      ) : (
                        <>
                          <span>Activar Cuenta y Continuar</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-2">
                      🔒 Sin costos ocultos · Al activar podrás ingresar a tu panel
                    </p>
                  </div>
                </form>
              </>
            ) : (
              /* PANTALLA DE ÉXITO: MENSAJE CLARO Y BOTÓN DEL GRUPO DE WHATSAPP */
              <div className="flex flex-col items-center text-center gap-4 py-2 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    ¡Solicitud Recibida con Éxito! 🚀
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-sm leading-relaxed">
                    Revisaremos tu solicitud y usaremos tu número de WhatsApp (<b>{whatsapp}</b>) para comunicarnos contigo y validar tu cuenta.
                  </p>
                </div>

                <div className="w-full bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm justify-center">
                    <span className="material-symbols-outlined text-[#25D366]">groups</span>
                    <span>Grupo Oficial de Emprendedores</span>
                  </div>
                  <p className="text-slate-600 text-xs">
                    Únete a nuestra comunidad oficial en WhatsApp para novedades de productos, tips de venta y soporte directo:
                  </p>
                  <a
                    href={LINK_GRUPO_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">chat</span>
                    <span>Unirme al Grupo Oficial de WhatsApp</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalRegistro(false);
                    router.push('/network/panel');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Continuar a Mi Panel de Control</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pie de página sutil ── */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        <p>© {new Date().getFullYear()} Boga Network Pucallpa · Reventa & Afiliados</p>
      </footer>
    </div>
  );
}
