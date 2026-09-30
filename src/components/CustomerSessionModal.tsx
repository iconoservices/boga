'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCustomerSession, DatosCliente } from '@/context/CustomerSessionContext';
import { leerMisPedidos, PedidoLocal } from '@/lib/pedidos';

interface Props {
  storeSlug: string;
  storeName: string;
}

export default function CustomerSessionModal({ storeSlug, storeName }: Props) {
  const { cliente, guardarCliente, cerrarSesion, modalAbierto, setModalAbierto } = useCustomerSession();

  const [tab, setTab] = useState<'perfil' | 'pedidos' | 'staff'>('perfil');
  const [form, setForm] = useState<DatosCliente>({
    nombre: '',
    telefono: '',
    direccion: '',
    email: '',
  });
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [misPedidos, setMisPedidos] = useState<PedidoLocal[]>([]);
  const [pinStaff, setPinStaff] = useState('');
  const [errorStaff, setErrorStaff] = useState('');

  useEffect(() => {
    if (cliente) {
      setForm({
        nombre: cliente.nombre || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        email: cliente.email || '',
      });
    }
  }, [cliente]);

  useEffect(() => {
    if (modalAbierto) {
      const todos = leerMisPedidos();
      // Filtrar pedidos de esta tienda
      const deEstaTienda = todos.filter((p) => p.slug === storeSlug || !p.slug);
      setMisPedidos(deEstaTienda);
      setGuardadoOk(false);
      setErrorStaff('');
    }
  }, [modalAbierto, storeSlug]);

  if (!modalAbierto) return null;

  const handleSubmitDatos = (e: React.FormEvent) => {
    e.preventDefault();
    guardarCliente(form);
    setGuardadoOk(true);
    setTimeout(() => {
      setGuardadoOk(false);
      setModalAbierto(false);
    }, 1500);
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinStaff.length < 4) {
      setErrorStaff('El PIN debe tener al menos 4 dígitos');
      return;
    }
    // Redirigir al panel de administración de la tienda
    window.location.href = `/admin?store=${encodeURIComponent(storeSlug)}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full sm:max-w-[460px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">account_circle</span>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 leading-tight">Mi Cuenta de Cliente</h2>
              <p className="text-[11px] text-gray-500">{storeName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalAbierto(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Pestañas */}
        <div className="px-5 pt-3 flex gap-2 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => setTab('perfil')}
            className={`pb-2 text-xs font-bold transition-all relative ${
              tab === 'perfil' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Mis Datos de Entrega
            {tab === 'perfil' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />}
          </button>

          <button
            type="button"
            onClick={() => setTab('pedidos')}
            className={`pb-2 text-xs font-bold transition-all relative ${
              tab === 'pedidos' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Mis Pedidos ({misPedidos.length})
            {tab === 'pedidos' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />}
          </button>

          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`pb-2 text-xs font-bold ml-auto transition-all relative ${
              tab === 'staff' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Acceso Staff 🔒
            {tab === 'staff' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gray-900 rounded-full" />}
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {tab === 'perfil' && (
            <form onSubmit={handleSubmitDatos} className="flex flex-col gap-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Guarda tus datos una sola vez. Al pedir por WhatsApp se completarán solos sin tener que volver a escribirlos.
              </p>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  Tu Nombre o Apodo
                </label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="ej: María Torres"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  Celular / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="ej: 987 654 321"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  Dirección de Entrega habitual
                </label>
                <textarea
                  rows={2}
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="ej: Jr. Tarapacá 450 (frente al parque)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium transition-all resize-none"
                />
              </div>

              {guardadoOk && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  ¡Tus datos quedaron guardados para tus pedidos!
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 active:scale-95 transition-all mt-1 shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Guardar mis datos
              </button>

              {cliente && (
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="text-xs text-gray-400 hover:text-red-500 font-semibold self-center transition-colors pt-1"
                >
                  Borrar mis datos guardados
                </button>
              )}
            </form>
          )}

          {tab === 'pedidos' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-600">
                Historial de pedidos realizados en <strong>{storeName}</strong> desde este dispositivo.
              </p>

              {misPedidos.length === 0 ? (
                <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-50">receipt_long</span>
                  <p className="text-xs font-semibold">Todavía no has hecho pedidos en esta tienda.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 flex flex-col gap-2">
                  {misPedidos.map((p) => (
                    <Link
                      key={p.codigo}
                      href={`/pedido/${p.codigo}`}
                      className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div>
                        <p className="text-xs font-black text-gray-900 group-hover:text-primary transition-colors">
                          Pedido N° {p.codigo.toUpperCase()}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {p.fecha ? new Date(p.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-primary text-xs font-bold">
                        <span>Ver estado</span>
                        <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'staff' && (
            <form onSubmit={handleStaffLogin} className="flex flex-col gap-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900">
                <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">admin_panel_settings</span>
                <p className="text-xs leading-relaxed font-medium">
                  <strong>Acceso exclusivo para el dueño o personal de {storeName}.</strong> Ingresa para administrar productos, pedidos o abrir el lector de puerta.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  PIN o Clave de Acceso
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  value={pinStaff}
                  onChange={(e) => setPinStaff(e.target.value)}
                  placeholder="PIN de 4 dígitos"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-gray-900 focus:bg-white font-mono tracking-widest transition-all"
                />
              </div>

              {errorStaff && (
                <p className="text-xs text-red-600 font-semibold">{errorStaff}</p>
              )}

              <button
                type="submit"
                className="w-full bg-gray-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-black active:scale-95 transition-all mt-1 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                Entrar al Administrador
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  O ingresar con correo electrónico / contraseña →
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
