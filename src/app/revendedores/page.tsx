'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CIUDADES } from '@/lib/ciudades';
import { detectarCiudad } from '@/lib/geo';

function waLink(numero: string, texto: string) {
  const clean = numero.replace(/\D/g, '');
  const num = clean.length === 9 ? `51${clean}` : clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

export default function RevendedoresPage() {
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [wspBoga, setWspBoga] = useState('51987911213');

  useEffect(() => {
    fetch('/api/contacto')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (d?.whatsapp) setWspBoga(d.whatsapp);
      })
      .catch(() => {});
  }, []);

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
      description: '[TIENDA DE REVENTA / DROPSHIPPING]',
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
    });

    setIsSent(true);
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-y-auto lg:overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Slim ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="BogaHub" className="w-6 h-6" />
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">BogaHub</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Reventa & Dropshipping
            </span>
          </Link>
          <Link
            href="/trabajos"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Volver a Trabajos
          </Link>
        </div>
      </header>

      {/* ── Contenido Principal (Fijo, Centrado y Sin Scroll) ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center w-full">
          
          {/* ── LADO IZQUIERDO: Propuesta de valor compacta ── */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5">
                <span className="material-symbols-outlined text-[12px]">payments</span>
                Emprende en Pucallpa sin stock
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Gana dinero vendiendo productos locales{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block">
                  sin comprar mercadería
                </span>
              </h1>
              <p className="mt-1.5 text-slate-600 text-xs sm:text-[13px] font-normal leading-snug">
                Crea tu tienda con tu propia marca en 2 minutos. Elige productos de tiendas aliadas de Pucallpa,
                ponles tu margen de ganancia y cobra directo por WhatsApp.
              </p>
            </div>

            {/* 3 Beneficios en pastillas compactas */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">0 inversión en mercadería</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">No compras stock por adelantado.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">attach_money</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">Tú pones tu ganancia</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tú decides cuánto ganar por cada venta.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">Pedidos a tu WhatsApp</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tus clientes te escriben y pagan a ti.</p>
                </div>
              </div>
            </div>

            {/* Nota de catálogo */}
            <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-[10px] text-emerald-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600 shrink-0">verified</span>
              <span>
                <b>Catálogo listo:</b> Al entrar a tu panel podrás importar productos de las tiendas aliadas activas en Pucallpa.
              </span>
            </div>
          </div>

          {/* ── LADO DERECHO: Formulario Compacto ── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5">
              {isSent ? (
                /* Vista de Éxito */
                <div className="text-center py-5 px-3 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900">¡Tu Tienda de Reventa está lista!</h2>
                  <p className="text-xs text-slate-600 max-w-sm mt-1 leading-relaxed">
                    Registramos a <b>{nombreTienda}</b> a nombre de <b>{nombre}</b>. Ahora puedes entrar a tu panel para importar los productos de las tiendas aliadas.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full max-w-sm">
                    <Link
                      href="/admin"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition"
                    >
                      <span className="material-symbols-outlined text-sm">storefront</span>
                      Ir a mi Panel de Tienda
                    </Link>
                    <a
                      href={waLink(
                        wspBoga,
                        `Hola BogaHub! Acabo de registrar mi tienda de reventa "${nombreTienda}" a nombre de ${nombre} y quiero coordinar la activación de mis productos.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      Hablar con Asesor
                    </a>
                  </div>
                </div>
              ) : (
                /* Formulario Compacto */
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Formulario Rápido de Reventa</h2>
                      <p className="text-[10px] text-slate-500">Solo 4 datos para activar tu catálogo</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Paso único
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {errorMsg}
                    </div>
                  )}

                  {/* ── FILA 1: Nombre + WhatsApp (2 columnas) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Tu nombre completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Camila Salazar"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Tu WhatsApp de pedidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 987 654 321"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* ── FILA 2: Nombre de Tienda + Ciudad (2 columnas) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Nombre para tu tienda / catálogo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Camila Store, Ofertas Pucallpa"
                        value={nombreTienda}
                        onChange={(e) => setNombreTienda(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[11px] font-bold text-slate-700">Tu ciudad / distrito</label>
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
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-[13px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      >
                        {CIUDADES.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.nombre} ({c.region})
                          </option>
                        ))}
                      </select>
                      {geoAviso && <p className="text-[10px] text-amber-600">{geoAviso}</p>}
                    </div>
                  </div>

                  {/* ── Botón CTA de Envío ── */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <span>Registrando tu tienda...</span>
                      ) : (
                        <>
                          <span>Crear Mi Tienda y Elegir Productos</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-1.5">
                      🔒 Sin costos ocultos · No compras mercadería por adelantado · Empiezas hoy
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Pie de página sutil (sin scroll) ── */}
      <footer className="w-full py-2 text-center text-[10px] text-slate-400 shrink-0">
        <p>© {new Date().getFullYear()} BogaHub Pucallpa · Reventa & Dropshipping Local</p>
      </footer>
    </div>
  );
}
