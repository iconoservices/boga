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
  const [modoVenta, setModoVenta] = useState<'whatsapp_directo' | 'codigo_afiliado'>('whatsapp_directo');
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

    const desc = [
      `[TIENDA DE REVENTA / DROPSHIPPING]`,
      `Modo: ${modoVenta === 'whatsapp_directo' ? 'WhatsApp Directo' : 'Código de Afiliado'}`,
    ].join(' | ');

    const { error } = await supabase.from('store_requests').insert({
      business_name: nombreTienda.trim(),
      contact_name: nombre.trim(),
      whatsapp: whatsapp.trim(),
      city: ciudad || 'pucallpa',
      category: 'Catálogo Aliado',
      interest: 'revendedor',
      description: desc,
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior Compacta ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="BogaHub" className="w-7 h-7" />
            <span className="font-extrabold text-slate-900 text-base tracking-tight">BogaHub</span>
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

      {/* ── Contenido Principal Compacto (Split Pantalla) ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 w-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center w-full">
          
          {/* ── LADO IZQUIERDO: Propuesta de valor compacta ── */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2">
                <span className="material-symbols-outlined text-[13px]">payments</span>
                Emprende en Pucallpa sin stock
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Gana dinero vendiendo productos locales{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block">
                  sin comprar mercadería
                </span>
              </h1>
              <p className="mt-2 text-slate-600 text-xs sm:text-sm font-normal leading-relaxed">
                Crea tu tienda con tu propia marca en 2 minutos. Elige productos de tiendas aliadas de Pucallpa,
                ponles tu margen de ganancia y cobra directo por WhatsApp.
              </p>
            </div>

            {/* 3 Beneficios en pastillas compactas */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">0 inversión en mercadería</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No compras stock por adelantado.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">attach_money</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">Tú pones tu ganancia</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tú decides cuánto ganar por cada venta.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-none">Pedidos a tu WhatsApp</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tus clientes te escriben y pagan a ti.</p>
                </div>
              </div>
            </div>

            {/* Nota de categorías activas */}
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600 shrink-0 mt-0.5">verified</span>
              <span>
                <b>Catálogo listo:</b> Al entrar al panel podrás importar productos de las tiendas que ya tienen stock activo en Pucallpa.
              </span>
            </div>
          </div>

          {/* ── LADO DERECHO: Formulario Compacto ── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6">
              {isSent ? (
                /* Vista de Éxito */
                <div className="text-center py-6 px-3 flex flex-col items-center">
                  <div className="w-13 h-13 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-3xl">check_circle</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">¡Tu Tienda de Reventa está lista!</h2>
                  <p className="text-xs text-slate-600 max-w-sm mt-1.5 leading-relaxed">
                    Registramos a <b>{nombreTienda}</b> a nombre de <b>{nombre}</b>. Ahora puedes entrar a tu panel para importar los productos de las tiendas aliadas.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2.5 mt-5 w-full max-w-sm">
                    <Link
                      href="/admin"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition"
                    >
                      <span className="material-symbols-outlined text-base">storefront</span>
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
                      <span className="material-symbols-outlined text-base">chat</span>
                      Hablar con Asesor
                    </a>
                  </div>
                </div>
              ) : (
                /* Formulario Compacto */
                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Formulario Rápido de Reventa</h2>
                      <p className="text-[11px] text-slate-500">Solo 4 datos para activar tu tienda</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Paso único
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {errorMsg}
                    </div>
                  )}

                  {/* ── FILA 1: Nombre + WhatsApp (2 columnas) ── */}
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* ── FILA 2: Nombre de Tienda + Ciudad (2 columnas) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre para tu tienda / catálogo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Camila Store, Ofertas Pucallpa"
                        value={nombreTienda}
                        onChange={(e) => setNombreTienda(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
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
                          <span className="material-symbols-outlined text-[13px]">my_location</span>
                          {detectando ? 'Ubicando...' : 'Ubicar GPS'}
                        </button>
                      </div>
                      <select
                        value={ciudad}
                        onChange={(e) => setCiudad(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      >
                        {CIUDADES.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.nombre} ({c.region})
                          </option>
                        ))}
                      </select>
                      {geoAviso && <p className="text-[10px] text-amber-600 mt-0.5">{geoAviso}</p>}
                    </div>
                  </div>

                  {/* ── FILA 3: Modalidad de Atención (2 columnas lado a lado) ── */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ¿Cómo prefieres gestionar tus ventas?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                          modoVenta === 'whatsapp_directo'
                            ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-medium shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modoVenta"
                          checked={modoVenta === 'whatsapp_directo'}
                          onChange={() => setModoVenta('whatsapp_directo')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 leading-snug">WhatsApp Directo</p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            Recibes pedidos a tu WhatsApp, cobras tu margen y pides a la tienda aliada.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                          modoVenta === 'codigo_afiliado'
                            ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-medium shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modoVenta"
                          checked={modoVenta === 'codigo_afiliado'}
                          onChange={() => setModoVenta('codigo_afiliado')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 leading-snug">Código de Referido</p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            Tu cliente compra directo en la tienda con tu código y te abonan tu comisión.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* ── Botón CTA de Envío ── */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <span>Registrando tu tienda...</span>
                      ) : (
                        <>
                          <span>Crear Mi Tienda de Reventa Gratis</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-2">
                      🔒 Sin costos ocultos · No compras stock por adelantado · Empiezas hoy
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer Compacto ── */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 text-center text-[11px] text-slate-400">
        <p>© {new Date().getFullYear()} BogaHub Pucallpa · Plataforma de Comercio y Reventa Local</p>
      </footer>
    </div>
  );
}
