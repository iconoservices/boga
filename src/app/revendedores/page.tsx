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

export default function RevendedoresHomePage() {
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

      const userDraftKey = `boga_revendedor_draft_${user.id}`;
      let encontrada = false;

      try {
        const raw = typeof window !== 'undefined'
          ? (localStorage.getItem(userDraftKey) || localStorage.getItem('boga_revendedor_draft'))
          : null;

        if (raw) {
          const p = JSON.parse(raw);
          if (p.nombreTienda && p.whatsapp) {
            setTiendaExistente({ nombreTienda: p.nombreTienda, nombre: p.nombre || '' });
            encontrada = true;
          }
        }
      } catch {}

      if (!encontrada && user.email) {
        supabase
          .from('store_requests')
          .select('business_name, contact_name, whatsapp, city')
          .eq('email', user.email)
          .eq('interest', 'revendedor')
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data, error }) => {
            if (!error && data && data.length > 0 && data[0].business_name) {
              setTiendaExistente({
                nombreTienda: data[0].business_name,
                nombre: data[0].contact_name || user.user_metadata?.full_name || '',
              });
            }
          });
      }
    } else {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('boga_revendedor_draft') : null;
        if (raw) {
          const p = JSON.parse(raw);
          if (p.nombreTienda && p.whatsapp) {
            setTiendaExistente({ nombreTienda: p.nombreTienda, nombre: p.nombre || '' });
          }
        }
      } catch {}
    }
  }, [user, authLoading]);

  const handleDetectarCiudad = async () => {
    setDetectando(true);
    setGeoAviso('');
    const res = await detectarCiudad();
    setDetectando(false);
    if (res.ok && res.slug) {
      setCiudad(res.slug);
    } else {
      setGeoAviso('Elige tu ciudad manualmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Debes iniciar sesión con tu correo para registrar tu tienda.');
      return;
    }
    if (!nombre.trim() || !whatsapp.trim() || !nombreTienda.trim()) {
      setErrorMsg('Completa tu nombre, WhatsApp y el nombre de tu tienda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const { error } = await supabase.from('store_requests').insert({
      business_name: nombreTienda.trim(),
      contact_name: nombre.trim(),
      whatsapp: whatsapp.trim(),
      city: ciudad || 'pucallpa',
      category: 'Catálogo Aliado',
      interest: 'revendedor',
      email: user.email,
      description: `[TIENDA DE REVENTA / DROPSHIPPING] [user_id: ${user.id}]`,
    });

    setIsLoading(false);

    if (error) {
      console.error('Error al registrar revendedor:', error);
      setErrorMsg('Ocurrió un error. Por favor intenta de nuevo.');
      return;
    }

    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'generate_lead', {
      tipo: 'revendedor_dropshipping',
      ciudad,
      email: user.email,
    });

    // Guardar borrador inicial
    try {
      const payload = JSON.stringify({
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        nombreTienda: nombreTienda.trim(),
        ciudad: ciudad || 'pucallpa',
        margenPorcentaje: 15,
      });
      localStorage.setItem(`boga_revendedor_draft_${user.id}`, payload);
      localStorage.setItem('boga_revendedor_draft', payload);
    } catch {}

    setModalRegistro(false);
    // Redirigir de inmediato al Panel de Trabajo del Revendedor
    router.push('/revendedores/panel');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim con Autenticación y Acceso al Panel ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="BogaHub" className="w-6 h-6" />
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">BogaHub</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gana Dinero · Reventa & Afiliados
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {tiendaExistente ? (
              <Link
                href="/revendedores/panel"
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
                  href="/login?redirect=/revendedores"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/login?modo=registro&redirect=/revendedores"
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition shadow-xs hidden sm:inline-block"
                >
                  Crear Cuenta
                </Link>
              </div>
            )}

            <div className="h-4 w-px bg-slate-200" />

            <Link
              href="/trabajos"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span className="hidden sm:inline">Volver a</span> Trabajos
            </Link>
          </div>
        </div>
      </header>

      {/* ── Banner si ya tiene tienda creada ── */}
      {tiendaExistente && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2 text-xs shadow-xs">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="material-symbols-outlined text-emerald-200 text-lg">storefront</span>
              <span>
                Ya tienes registrada tu tienda <b>"{tiendaExistente.nombreTienda}"</b>. Entra a tu panel para administrar productos y ganancias.
              </span>
            </div>
            <Link
              href="/revendedores/panel"
              className="font-black bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1 rounded-lg text-xs shadow-xs transition shrink-0"
            >
              Abrir Mi Panel de Control →
            </Link>
          </div>
        </div>
      )}

      {/* ── Contenido Principal (UNA SOLA VISTA: AMBAS OPCIONES JUNTAS) ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full flex flex-col items-center">
        {/* Cabecera Principal de la Página */}
        <div className="text-center max-w-3xl mb-10">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
            <span className="material-symbols-outlined text-[15px]">payments</span>
            Oportunidades de Ingresos en Pucallpa
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Gana dinero desde tu celular con{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              BogaHub
            </span>
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Descubre las <b>2 formas oficiales</b> en que puedes generar ingresos hoy mismo sin jefes y sin horarios. Elige la que mejor se adapte a ti o <b>haz ambas al mismo tiempo</b>.
          </p>
        </div>

        {/* ── LAS 2 FORMAS DE GANAR DINERO EN UNA SOLA VISTA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full items-stretch">
          
          {/* ════════════════════════════════════════════════════════════════
              FORMA 1: CATÁLOGO DE REVENTA / DROPSHIPPING LOCAL
             ════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border-2 border-emerald-500/80 shadow-md p-6 sm:p-8 flex flex-col justify-between gap-6 relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[15px]">storefront</span>
                  Opción 1 · Catálogo de Reventa
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Sin inversión
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  Vende productos de tiendas locales con tu propia marca
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Crea tu catálogo online en 2 minutos. En tu <b>Panel de Control</b> eliges qué productos vender de tiendas aliadas de Pucallpa (relojes, lentes, moda) y defines tu margen de ganancia.
                </p>
              </div>

              {/* Beneficios de Opción 1 */}
              <div className="flex flex-col gap-2 pt-1 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-900">0 inversión en mercadería:</span>
                    <span className="text-slate-500 ml-1">No compras stock por adelantado. El proveedor lo tiene listo en Pucallpa.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-900">Tú pones tu ganancia:</span>
                    <span className="text-slate-500 ml-1">Regulas +10%, +15%, +20% o el margen que prefieras por cada producto.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-900">Pedidos a tu WhatsApp:</span>
                    <span className="text-slate-500 ml-1">Tus clientes te escriben y pagan a ti directamente por Yape o Plin.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acción de Opción 1 */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {tiendaExistente ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/revendedores/panel"
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm text-center shadow-md transition flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                    <span>Ingresar a Mi Panel ({tiendaExistente.nombreTienda}) →</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalRegistro(true)}
                    className="text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1 cursor-pointer"
                  >
                    + Registrar otra tienda
                  </button>
                </div>
              ) : !user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login?redirect=/revendedores"
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm text-center shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">lock_open</span>
                    <span>Iniciar Sesión para Crear Mi Tienda →</span>
                  </Link>
                  <p className="text-[11px] text-slate-400 text-center">
                    🔒 Vinculado a tu correo para ingresar desde cualquier celular o PC.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setModalRegistro(true)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm text-center shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl">rocket_launch</span>
                    <span>Crear Mi Tienda de Reventa →</span>
                  </button>
                  <p className="text-[11px] text-emerald-800 font-semibold text-center flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Sesión iniciada: <b>{user.email}</b>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              FORMA 2: PROGRAMA DE AFILIADOS BOGAHUB
             ════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between gap-6 hover:border-teal-400 transition">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-800 font-extrabold text-[11px] px-3 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[15px]">volunteer_activism</span>
                  Opción 2 · Programa de Afiliados
                </span>
                <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Bono en efectivo
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  Recomienda negocios y choferes locales y cobra tu bono
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  ¿Tienes amigos o conocidos con un negocio o vehículo? Conéctalos con BogaHub y <b>gana un bono en efectivo directo</b> a tu cuenta por cada comercio o conductor activado.
                </p>
              </div>

              {/* Beneficios de Opción 2 */}
              <div className="flex flex-col gap-2 pt-1 text-xs">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="material-symbols-outlined text-teal-600 text-lg shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-900">Comercios y Tiendas:</span>
                    <span className="text-slate-500 ml-1">Restaurantes, pollerías, bodegas o boutiques. Cobras tu bono apenas publiquen su menú o catálogo.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="material-symbols-outlined text-teal-600 text-lg shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-900">Conductores (Taxi / Mototaxi):</span>
                    <span className="text-slate-500 ml-1">Invita a choferes a recibir carreras seguras con Boga Taxi y gana tu comisión por activación.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="material-symbols-outlined text-teal-600 text-lg shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-900">Pagos al instante por Yape o Plin:</span>
                    <span className="text-slate-500 ml-1">Sin trámites complejos. El equipo de BogaHub valida el referido y te transfiere directo.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acción de Opción 2 */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <a
                href={waLink(
                  wspBoga,
                  `Hola BogaHub! Quiero postular como afiliado para recomendar negocios y choferes en Pucallpa y ganar bonos en efectivo.${user?.email ? ` (Mi correo: ${user.email})` : ''}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm text-center shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                <span>Coordinar Afiliación por WhatsApp con Asesor →</span>
              </a>
              <p className="text-[11px] text-slate-400 text-center">
                Atención rápida · Te explicamos los montos de bono por comercio o chofer.
              </p>
            </div>
          </div>

        </div>

        {/* ── SECCIÓN INFORMATIVA: PUEDES HACER AMBAS ── */}
        <div className="w-full mt-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <span className="material-symbols-outlined text-3xl">lightbulb</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black">¿Cuál opción elegir? ¡Puedes hacer ambas!</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                Muchos emprendedores de Pucallpa tienen su catálogo de productos en WhatsApp para ventas del día a día, y cuando visitan negocios o toman un taxi, los afilian y cobran bonos adicionales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                router.push('/login?redirect=/revendedores');
              } else {
                setModalRegistro(true);
              }
            }}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition shrink-0 cursor-pointer"
          >
            Empezar Ahora Gratis
          </button>
        </div>
      </main>

      {/* ── MODAL POPUP PARA CREAR LA TIENDA (LIMPIO Y CENTRADO) ── */}
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

            {/* Encabezado del Modal */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">Crear Mi Tienda de Reventa</h3>
                <p className="text-xs text-slate-500 font-medium">Solo 4 datos para acceder a tu panel de control</p>
              </div>
            </div>

            {/* Badge de cuenta vinculada */}
            {user?.email && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Tu tienda quedará vinculada a:</p>
                    <p className="font-extrabold text-slate-900 truncate text-xs">{user.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                  Verificado ✓
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pt-1">
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
        <p>© {new Date().getFullYear()} BogaHub Pucallpa · Reventa & Afiliados</p>
      </footer>
    </div>
  );
}
