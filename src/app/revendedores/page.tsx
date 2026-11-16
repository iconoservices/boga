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

const CATEGORIAS_REVENTA = [
  { id: 'moda', label: '👗 Moda y Ropa' },
  { id: 'calzado', label: '👟 Calzado y Zapatillas' },
  { id: 'tecnologia', label: '📱 Tecnología y Accesorios' },
  { id: 'belleza', label: '💄 Belleza y Cuidado' },
  { id: 'hogar', label: '🏠 Hogar y Novedades' },
  { id: 'comida', label: '🍔 Snacks y Comida' },
];

export default function RevendedoresPage() {
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [ciudad, setCiudad] = useState('pucallpa');
  const [detectando, setDetectando] = useState(false);
  const [geoAviso, setGeoAviso] = useState('');
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>(['moda', 'tecnologia']);
  const [modoVenta, setModoVenta] = useState<'whatsapp_directo' | 'codigo_afiliado'>('whatsapp_directo');
  const [margenSugerido, setMargenSugerido] = useState<string>('15');
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

  const toggleCategoria = (id: string) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleDetectarCiudad = async () => {
    setDetectando(true);
    setGeoAviso('');
    const res = await detectarCiudad();
    setDetectando(false);
    if (res.ok && res.slug) {
      setCiudad(res.slug);
    } else {
      setGeoAviso('No se pudo autodetectar. Elige tu ciudad manualmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !whatsapp.trim() || !nombreTienda.trim()) {
      setErrorMsg('Por favor completa tu nombre, WhatsApp y el nombre de tu tienda.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const desc = [
      `[TIENDA DE REVENTA / DROPSHIPPING]`,
      `Modo: ${modoVenta === 'whatsapp_directo' ? 'WhatsApp Directo al Revendedor' : 'Código de Afiliado'}`,
      `Margen estimado: +${margenSugerido}%`,
      `Categorías elegidas: ${categoriasSeleccionadas.join(', ') || 'Todas'}`,
    ].join(' | ');

    const { error } = await supabase.from('store_requests').insert({
      business_name: nombreTienda.trim(),
      contact_name: nombre.trim(),
      whatsapp: whatsapp.trim(),
      city: ciudad || 'pucallpa',
      category: categoriasSeleccionadas.join(', ') || 'General',
      interest: 'revendedor',
      description: desc,
    });

    setIsLoading(false);

    if (error) {
      console.error('Error al registrar revendedor:', error);
      setErrorMsg('Ocurrió un error al guardar tu registro. Por favor intenta de nuevo.');
      return;
    }

    // Analytics hook si existe
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'generate_lead', {
      tipo: 'revendedor_dropshipping',
      ciudad,
    });

    setIsSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* ── Barra Superior ── */}
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo-mark.svg" alt="BogaHub" className="w-8 h-8" />
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">BogaHub</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Reventa & Dropshipping
            </span>
          </Link>
          <Link
            href="/trabajos"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver a Trabajos
          </Link>
        </div>
      </header>

      {/* ── Contenido Principal (Split: Texto Izquierda + Formulario Derecha) ── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ── LADO IZQUIERDO: Titular, Propuesta de Valor y Beneficios ── */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
                <span className="material-symbols-outlined text-[15px]">payments</span>
                Emprende en Pucallpa sin invertir en mercadería
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Gana dinero vendiendo productos locales{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block mt-1">
                  sin comprar stock
                </span>
              </h1>
              <p className="mt-3 text-slate-600 text-sm sm:text-base font-normal leading-relaxed">
                Crea tu tienda con tu propia marca en 2 minutos. Elige productos de proveedores aliados de Pucallpa,
                ponles tu margen de ganancia y comparte tu catálogo por WhatsApp o redes.
              </p>
            </div>

            {/* 3 Beneficios Rápidos en lista */}
            <div className="flex flex-col gap-3">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-emerald-300 transition">
                <span className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">inventory_2</span>
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">0 inversión en mercadería</p>
                  <p className="text-xs text-slate-500">No compras stock por adelantado ni alquilas local.</p>
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-teal-300 transition">
                <span className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">attach_money</span>
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Tu propio margen de ganancia</p>
                  <p className="text-xs text-slate-500">Tú decides cuánto ganar por cada venta (+10%, +20%, etc.).</p>
                </div>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5 hover:border-orange-300 transition">
                <span className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Pedidos directos a tu WhatsApp</p>
                  <p className="text-xs text-slate-500">Tus clientes te escriben y te pagan a ti directamente.</p>
                </div>
              </div>
            </div>

            {/* Pasos Rápidos */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">checklist</span>
                ¿Cómo funciona en 3 pasos?
              </p>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside font-medium">
                <li>Completa el formulario rápido de la derecha.</li>
                <li>Importa productos de tiendas aliadas a tu catálogo.</li>
                <li>Comparte tu link por WhatsApp y cobra tu ganancia.</li>
              </ol>
            </div>
          </div>

          {/* ── LADO DERECHO: El Formulario en Filas y 2 Columnas ── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8">
              {isSent ? (
                /* Vista de Éxito */
                <div className="text-center py-8 px-4 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">¡Tu Tienda de Reventa está lista para despegar!</h2>
                  <p className="text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
                    Registramos a <b>{nombreTienda}</b> a nombre de <b>{nombre}</b>. Ahora puedes ingresar al panel de administración para importar los productos de las tiendas aliadas a tu catálogo.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mt-7 w-full max-w-md">
                    <Link
                      href="/admin"
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl shadow-md transition"
                    >
                      <span className="material-symbols-outlined text-lg">storefront</span>
                      Ir a mi Panel de Tienda
                    </Link>
                    <a
                      href={waLink(
                        wspBoga,
                        `Hola BogaHub! Acabo de registrar mi tienda de reventa "${nombreTienda}" a nombre de ${nombre} y quiero coordinar la activación de mis productos.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-5 rounded-xl transition"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                      Hablar con Asesor
                    </a>
                  </div>
                </div>
              ) : (
                /* Formulario */
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Formulario Rápido de Reventa</h2>
                      <p className="text-xs text-slate-500">Completa tus datos en 2 minutos para habilitar tu catálogo</p>
                    </div>
                    <span className="hidden sm:inline-block text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                      Paso único
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>
                      {errorMsg}
                    </div>
                  )}

                  {/* ── FILA 1: Tus Datos de Contacto (2 columnas) ── */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Fila 1 · Tus datos personales
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tu nombre completo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Camila Salazar o Juan Pérez"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
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
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                        />
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Aquí recibirás los mensajes de tus clientes.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── FILA 2: Tu Tienda y Ubicación (2 columnas) ── */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Fila 2 · Tu marca y ciudad
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nombre para tu tienda / catálogo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Camila Store, Ofertas Pucallpa, Selva Chic"
                          value={nombreTienda}
                          onChange={(e) => setNombreTienda(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">Tu ciudad / distrito</label>
                          <button
                            type="button"
                            onClick={handleDetectarCiudad}
                            disabled={detectando}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">my_location</span>
                            {detectando ? 'Ubicando...' : 'Ubicar GPS'}
                          </button>
                        </div>
                        <select
                          value={ciudad}
                          onChange={(e) => setCiudad(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                        >
                          {CIUDADES.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.nombre} ({c.region})
                            </option>
                          ))}
                        </select>
                        {geoAviso && <p className="text-[11px] text-amber-600 mt-1">{geoAviso}</p>}
                      </div>
                    </div>
                  </div>

                  {/* ── FILA 3: Preferencias de Catálogo (2 columnas) ── */}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Fila 3 · ¿Qué y cómo quieres vender?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Categorías que le interesan */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Categorías que te interesan (elige una o más)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORIAS_REVENTA.map((cat) => {
                            const isSelected = categoriasSeleccionadas.includes(cat.id);
                            return (
                              <button
                                type="button"
                                key={cat.id}
                                onClick={() => toggleCategoria(cat.id)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition active:scale-95 flex items-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Modo de Atención */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Modalidad de venta preferida
                        </label>
                        <div className="flex flex-col gap-2">
                          <label
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              modoVenta === 'whatsapp_directo'
                                ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modoVenta"
                              checked={modoVenta === 'whatsapp_directo'}
                              onChange={() => setModoVenta('whatsapp_directo')}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="font-bold text-slate-900">WhatsApp Directo (Recomendado)</p>
                              <p className="text-[11px] text-slate-500 leading-tight">
                                El cliente te pide a ti, cobras tu ganancia y coordinas el envío con la tienda aliada.
                              </p>
                            </div>
                          </label>

                          <label
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              modoVenta === 'codigo_afiliado'
                                ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950 font-medium'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modoVenta"
                              checked={modoVenta === 'codigo_afiliado'}
                              onChange={() => setModoVenta('codigo_afiliado')}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="font-bold text-slate-900">Código de Referido</p>
                              <p className="text-[11px] text-slate-500 leading-tight">
                                El cliente compra con tu código y la tienda te abona tu comisión.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón CTA de Envío */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <span>Registrando tu tienda...</span>
                      ) : (
                        <>
                          <span>Crear Mi Tienda de Reventa Gratis</span>
                          <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[11px] text-slate-400 mt-2.5">
                      🔒 Sin cobros ocultos · No necesitas tarjeta de crédito · Empiezas a vender hoy mismo
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} BogaHub Pucallpa · Plataforma de Comercio y Reventa Local</p>
      </footer>
    </div>
  );
}
