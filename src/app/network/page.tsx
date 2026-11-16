'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CIUDADES } from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';

function waLink(numero: string, texto: string) {
  const clean = numero.replace(/\D/g, '');
  const num = clean.length === 9 ? `51${clean}` : clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

export default function BogaNetworkHomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Modal para crear la tienda de reventa (Popup centrado)
  const [modalRegistro, setModalRegistro] = useState(false);

  // Datos para registrar tienda
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [wspBoga, setWspBoga] = useState('51987911213');

  // Tienda existente detectada
  const [tiendaExistente, setTiendaExistente] = useState<{ nombreTienda: string; nombre: string } | null>(null);

  useEffect(() => {
    document.title = 'Boga Network · Reventa & Afiliados';
    fetch('/api/contacto')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (d?.whatsapp) setWspBoga(d.whatsapp);
      })
      .catch(() => {});
  }, []);

  // Detectar si el usuario ya tiene una tienda creada para ofrecerle acceso directo al Panel
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      if (!nombre) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        if (metaName) setNombre(metaName);
      }

      // 1. Revisar si hay un borrador guardado en localStorage
      try {
        const draft = localStorage.getItem('boga_revendedor_draft');
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed?.nombreTienda) {
            setTiendaExistente({ nombreTienda: parsed.nombreTienda, nombre: parsed.nombre || '' });
            return;
          }
        }
      } catch {
        // noop
      }

      // 2. Revisar si ya tiene una tienda de reventa en store_requests en Supabase
      if (user.email) {
        supabase
          .from('store_requests')
          .select('business_name, contact_name')
          .eq('email', user.email)
          .eq('interest', 'revendedor')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0) {
              setTiendaExistente({
                nombreTienda: data[0].business_name,
                nombre: data[0].contact_name,
              });
            }
          });
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

  // Crear la tienda de reventa e ingresar directo al panel
  const handleCrearTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      router.push('/login?redirect=/network');
      return;
    }

    if (!nombre.trim() || !whatsapp.trim() || !nombreTienda.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsLoading(true);

    try {
      // Registrar solicitud con interest = 'revendedor'
      const { error } = await supabase.from('store_requests').insert({
        contact_name: nombre.trim(),
        business_name: nombreTienda.trim(),
        whatsapp: whatsapp.trim(),
        city: ciudad,
        interest: 'revendedor',
        email: user.email || '',
        category: 'revendedor',
        description: 'Tienda de reventa / Dropshipping creada desde Boga Network',
      });

      if (error) {
        console.warn('Aviso al guardar solicitud en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('Error no bloqueante al registrar solicitud:', err?.message);
    }

    // Guardar el borrador local para inicializar el panel
    try {
      localStorage.setItem(
        'boga_revendedor_draft',
        JSON.stringify({
          nombre: nombre.trim(),
          whatsapp: whatsapp.trim(),
          nombreTienda: nombreTienda.trim(),
          ciudad,
          email: user.email,
          createdAt: new Date().toISOString(),
        })
      );
    } catch {
      // noop
    }

    setIsLoading(false);
    setModalRegistro(false);
    router.push('/network/panel');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim con Autenticación y Acceso al Panel ── */}
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
            {tiendaExistente ? (
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

      {/* ── Banner si ya tiene tienda creada ── */}
      {tiendaExistente && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 text-xs shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="material-symbols-outlined text-emerald-200 text-lg">storefront</span>
              <span>
                Ya tienes registrada tu tienda <b>&quot;{tiendaExistente.nombreTienda}&quot;</b>. Entra a tu panel para administrar productos y ganancias.
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

      {/* ── Contenido Principal (DISEÑO LIMPIO, COMPACTO Y BALANCEADO) ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex flex-col items-center">
        {/* Cabecera Principal Compacta */}
        <div className="w-full text-center mb-7 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Oportunidades de Ingresos · Pucallpa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Gana dinero desde tu celular con{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Boga Network
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-xl mx-auto leading-relaxed">
            Descubre las <b>2 formas oficiales</b> de generar ingresos hoy mismo sin jefes ni horarios. Elige la que mejor se adapte a ti o combina ambas.
          </p>
        </div>

        {/* ── LAS 2 FORMAS DE GANAR DINERO: 2 COLUMNAS PERFECTAMENTE SIMÉTRICAS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 w-full items-start">
          
          {/* ════════════════════════════════════════════════════════════════
              COLUMNA 1 (IZQUIERDA): CATÁLOGO DE REVENTA / DROPSHIPPING LOCAL
             ════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4 text-left">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Catálogo de Reventa (Dropshipping)
                  </h2>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Sin inversión
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Crea tu catálogo con tu marca en 2 minutos. Vende productos de tiendas aliadas de Pucallpa (moda, lentes, relojes) sin comprar stock y define tu ganancia.
              </p>
            </div>

            {/* 3 Pastillas compactas limpias */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">0 inversión en mercadería</p>
                  <p className="text-[11px] text-slate-500 mt-1">No compras stock por adelantado. El proveedor local despacha.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">attach_money</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Tú pones tu margen</p>
                  <p className="text-[11px] text-slate-500 mt-1">Regula +10%, +15%, +20% o lo que prefieras ganar por venta.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">chat</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Pedidos directos a tu WhatsApp</p>
                  <p className="text-[11px] text-slate-500 mt-1">Tus clientes te escriben y te pagan a ti directamente.</p>
                </div>
              </div>
            </div>

            {/* Botón de acción Opción 1 */}
            <div className="pt-1 flex flex-col gap-2">
              {tiendaExistente ? (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Link
                    href="/network/panel"
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                    <span>Ingresar a Mi Panel ({tiendaExistente.nombreTienda}) →</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalRegistro(true)}
                    className="text-xs font-bold text-slate-500 hover:text-emerald-700 underline py-1 px-2 cursor-pointer shrink-0"
                  >
                    + Registrar otra
                  </button>
                </div>
              ) : user ? (
                <button
                  type="button"
                  onClick={() => setModalRegistro(true)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">storefront</span>
                  <span>Crear Mi Tienda de Reventa →</span>
                </button>
              ) : (
                <Link
                  href="/login?redirect=/network"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-2 text-center"
                >
                  <span className="material-symbols-outlined text-lg">login</span>
                  <span>Iniciar Sesión para Crear Tienda →</span>
                </Link>
              )}
              <p className="text-[11px] text-slate-400 text-center sm:text-left">
                🔒 Sin costos ocultos · No compras mercadería por adelantado · Empiezas hoy
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              COLUMNA 2 (DERECHA): PROGRAMA DE AFILIADOS BOGA NETWORK
             ════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4 text-left">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Programa de Afiliados
                  </h2>
                </div>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Bono en efectivo
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ¿Conoces negocios o personas con vehículo en Pucallpa? Conéctalos con Boga Network y cobra un bono directo por cada uno activado.
              </p>
            </div>

            {/* 3 Pastillas compactas limpias */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">store</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Comercios y Tiendas Locales</p>
                  <p className="text-[11px] text-slate-500 mt-1">Restaurantes, bodegas o boutiques al publicar su menú o catálogo.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">local_taxi</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Conductores (Taxi / Mototaxi)</p>
                  <p className="text-[11px] text-slate-500 mt-1">Invita a choferes a recibir carreras con Boga Taxi y gana tu comisión.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">payments</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">Pagos al instante por Yape o Plin</p>
                  <p className="text-[11px] text-slate-500 mt-1">Sin trámites complejos. El equipo valida el referido y te transfiere directo.</p>
                </div>
              </div>
            </div>

            {/* Botón de acción Opción 2 */}
            <div className="pt-1 flex flex-col gap-2">
              <a
                href={waLink(
                  wspBoga,
                  `Hola Boga Network! Quiero postular como afiliado para recomendar negocios y choferes en Pucallpa y ganar bonos en efectivo.${user?.email ? ` (Mi correo: ${user.email})` : ''}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                <span>Coordinar Afiliación por WhatsApp con Asesor →</span>
              </a>
              <p className="text-[11px] text-slate-400 text-center sm:text-left">
                Atención rápida · Te explicamos los montos de bono por comercio o chofer
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* ── MODAL CENTRADO: Formulario de Creación de Tienda de Reventa ── */}
      {modalRegistro && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setModalRegistro(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalRegistro(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Crear Mi Tienda de Reventa</h3>
                <p className="text-xs text-slate-500 font-medium">Solo 4 datos para ingresar a tu panel de control</p>
              </div>
            </div>

            {/* Badge de cuenta vinculada */}
            {user?.email && (
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] uppercase shrink-0">
                    {user.email.charAt(0)}
                  </span>
                  <div className="truncate">
                    <p className="text-[10px] text-emerald-800 uppercase font-black">Cuenta vinculada:</p>
                    <p className="font-bold text-slate-800 truncate">{user.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  Verificado ✓
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCrearTienda} className="flex flex-col gap-3">
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
                    Tu WhatsApp de pedidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 987 654 321"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre para tu tienda <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Camila Store, Ofertas Pucallpa"
                    value={nombreTienda}
                    onChange={(e) => setNombreTienda(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 bg-slate-50"
                  />
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
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <span>Creando tu tienda...</span>
                  ) : (
                    <>
                      <span>Crear Tienda e Ingresar al Panel</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-2">
                  🔒 Sin costos ocultos · No compras mercadería por adelantado · Empiezas hoy
                </p>
              </div>
            </form>
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
