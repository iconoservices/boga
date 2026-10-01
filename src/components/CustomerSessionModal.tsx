'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCustomerSession, DatosCliente } from '@/context/CustomerSessionContext';
import { useAuth } from '@/context/AuthContext';
import { leerMisPedidos, PedidoLocal } from '@/lib/pedidos';
import { CLAVE_REABRIR_MODAL, setAuthCookie } from '@/lib/authCookies';
import { useFavoritos } from '@/lib/useFavoritos';
import { supabase } from '@/lib/supabase';

interface Props {
  storeSlug: string;
  storeName: string;
}

export default function CustomerSessionModal({ storeSlug, storeName }: Props) {
  const { cliente, guardarCliente, cerrarSesion: cerrarClienteLocal, modalAbierto, setModalAbierto } = useCustomerSession();
  const { user, signInWithGoogle, signIn, signUp, signOut } = useAuth();

  const { lista: listaFavs, alternar: alternarFav } = useFavoritos();
  const favsTienda = listaFavs.filter((f) => f.store === storeSlug);

  const [tab, setTab] = useState<'perfil' | 'pedidos' | 'favoritos'>('perfil');
  const [form, setForm] = useState<DatosCliente>({
    nombre: '',
    telefono: '',
    direccion: '',
    email: '',
  });

  // Si no está logueado pero elige "pedir como invitado"
  const [modoInvitado, setModoInvitado] = useState(false);

  // Modo de autenticación: 'login' o 'registro'
  const [modoAuth, setModoAuth] = useState<'login' | 'registro'>('login');
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [nombreAuth, setNombreAuth] = useState('');
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState<string | null>(null);
  const [exitoAuth, setExitoAuth] = useState<string | null>(null);

  // Modo Staff discreto (sin pestañas públicas llamativas)
  const [mostrarStaff, setMostrarStaff] = useState(false);
  const [pinStaff, setPinStaff] = useState('');
  const [errorStaff, setErrorStaff] = useState('');

  const [guardadoOk, setGuardadoOk] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [ubicMsg, setUbicMsg] = useState('');
  const [misPedidos, setMisPedidos] = useState<PedidoLocal[]>([]);

  // ¿Esta cuenta es dueña de alguna tienda? Igual que "Tu tienda" en el perfil de BogaHub:
  // un acceso directo a su panel, sin tener que pasar por "Acceso staff".
  const [tiendasPropias, setTiendasPropias] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.id) { setTiendasPropias([]); return; }
    let vivo = true;
    supabase.from('stores').select('name').eq('user_id', user.id).then(({ data }) => {
      if (vivo) setTiendasPropias((data || []).map((x: any) => x.name));
    });
    return () => { vivo = false; };
  }, [user?.id]);

  // Sincronizar datos si el usuario de Supabase / Google está conectado
  useEffect(() => {
    if (user) {
      const nombreUser = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const emailUser = user.email || '';
      setForm((prev) => ({
        ...prev,
        nombre: (prev.nombre.trim() && prev.nombre !== 'Invitado') ? prev.nombre : (nombreUser || cliente?.nombre || ''),
        email: emailUser || prev.email || cliente?.email || '',
        telefono: prev.telefono || cliente?.telefono || '',
        direccion: prev.direccion || cliente?.direccion || '',
      }));
    } else if (cliente) {
      setForm({
        nombre: cliente.nombre || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        email: cliente.email || '',
      });
    }
  }, [user, cliente]);

  useEffect(() => {
    if (modalAbierto) {
      const todos = leerMisPedidos();
      const deEstaTienda = todos.filter((p) => p.slug === storeSlug || !p.slug);
      setMisPedidos(deEstaTienda);
      setGuardadoOk(false);
      setMostrarStaff(false);
      setErrorStaff('');
      setErrorAuth(null);
      setExitoAuth(null);
      setModoInvitado(false);
    }
  }, [modalAbierto, storeSlug]);

  if (!modalAbierto) return null;

  const handleGoogleLogin = async () => {
    setErrorAuth(null);
    setCargandoAuth(true);
    if (typeof window !== 'undefined') {
      try {
        setAuthCookie(CLAVE_REABRIR_MODAL, 'true');
        localStorage.setItem(CLAVE_REABRIR_MODAL, 'true');
      } catch {}
    }
    const { error } = await signInWithGoogle(window.location.href);
    setCargandoAuth(false);
    if (error) {
      setErrorAuth('No se pudo conectar con Google. Prueba con correo.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAuth(null);
    setExitoAuth(null);
    setCargandoAuth(true);

    if (modoAuth === 'registro') {
      if (passwordAuth.length < 6) {
        setErrorAuth('La contraseña debe tener al menos 6 caracteres');
        setCargandoAuth(false);
        return;
      }
      const { error, needsEmailConfirm } = await signUp(emailAuth, passwordAuth, nombreAuth);
      setCargandoAuth(false);
      if (error) {
        setErrorAuth(error);
        return;
      }
      if (needsEmailConfirm) {
        setExitoAuth('✅ Cuenta creada. Revisa tu correo para confirmarla e iniciar sesión.');
        return;
      }
      setExitoAuth('✅ ¡Cuenta creada con éxito!');
    } else {
      const { error } = await signIn(emailAuth, passwordAuth);
      setCargandoAuth(false);
      if (error) {
        setErrorAuth('Correo o contraseña incorrectos');
        return;
      }
    }
  };

  const handleCerrarSesionCompleta = async () => {
    cerrarClienteLocal();
    await signOut();
  };

  // Agrega a la dirección un enlace de Google Maps con la ubicación actual (igual que en el checkout)
  const usarUbicacion = () => {
    if (!navigator.geolocation) { setUbicMsg('Tu celular no permite ubicarte. Escribe tu dirección.'); return; }
    setUbicando(true);
    setUbicMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const enlace = `https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setForm((f) => {
          const base = f.direccion.replace(/\s*·?\s*📍\s*https:\/\/maps\.google\.com\/\?q=\S+/g, '').trim();
          return { ...f, direccion: (base ? `${base} · ` : '') + `📍 ${enlace}` };
        });
        setUbicMsg('Ubicación agregada. Suma una referencia (ej: frente al parque).');
        setUbicando(false);
      },
      (err) => {
        setUbicMsg(err.code === 1 ? 'No diste permiso de ubicación. Escribe tu dirección.' : 'No pudimos obtener tu ubicación. Escribe tu dirección.');
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

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
    window.location.href = `/admin?store=${encodeURIComponent(storeSlug)}`;
  };

  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const userName = user?.user_metadata?.name || user?.user_metadata?.full_name || form.nombre || 'Cliente';

  // ¿El cliente ya tiene sesión activa o eligió modo invitado?
  const sesionActiva = !!user || modoInvitado;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full sm:max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm shrink-0" />
            ) : (
              <span className="material-symbols-outlined text-primary text-[26px] shrink-0">
                {user ? 'account_circle' : 'person'}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-gray-900 leading-tight truncate">
                {user ? userName : 'Mi Cuenta en ' + storeName}
              </h2>
              <p className="text-[11px] text-gray-500 truncate">
                {user ? user.email : 'Accede a tus datos y pedidos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalAbierto(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Si YA inició sesión: Pestañas de Datos y Pedidos */}
        {sesionActiva && !mostrarStaff && (
          <div className="px-5 pt-3 flex gap-4 border-b border-gray-100 bg-white">
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
              onClick={() => setTab('favoritos')}
              className={`pb-2 text-xs font-bold transition-all relative ${
                tab === 'favoritos' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Favoritos ({favsTienda.length})
              {tab === 'favoritos' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />}
            </button>
          </div>
        )}

        {/* Contenido */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {mostrarStaff ? (
            /* Vista Staff Discreta */
            <form onSubmit={handleStaffLogin} className="flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">admin_panel_settings</span>
                  Acceso Staff / Negocio
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarStaff(false)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  ← Volver
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Ingresa con el PIN de tu tienda para administrar pedidos o productos.
              </p>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  PIN de Acceso
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
                  O entrar con correo y contraseña →
                </Link>
              </div>
            </form>
          ) : !sesionActiva ? (
            /* Pantalla de Inicio de Sesión / Registro para Clientes */
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="text-center">
                <h3 className="text-base font-black text-gray-900">Bienvenido</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Inicia sesión o crea tu cuenta para autocompletar tus pedidos y ver tu historial.
                </p>
              </div>

              {/* Botón de Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={cargandoAuth}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs py-3 px-4 rounded-xl shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continuar con Google
              </button>

              <div className="flex items-center gap-2 my-1">
                <span className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] uppercase font-bold text-gray-400">o con correo</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Selector: Iniciar Sesión / Crear Cuenta */}
              <div className="flex p-0.5 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setModoAuth('login'); setErrorAuth(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modoAuth === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => { setModoAuth('registro'); setErrorAuth(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modoAuth === 'registro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>

              {/* Formulario de Correo */}
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-2.5">
                {modoAuth === 'registro' && (
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                      Tu Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={nombreAuth}
                      onChange={(e) => setNombreAuth(e.target.value)}
                      placeholder="ej: Carlos Mendoza"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={emailAuth}
                    onChange={(e) => setEmailAuth(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordAuth}
                    onChange={(e) => setPasswordAuth(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium"
                  />
                </div>

                {modoAuth === 'registro' && (
                  <p className="text-[10px] text-gray-500 leading-snug">
                    Al crear tu cuenta aceptas los{' '}
                    <a href="https://bogahub.app/legal" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Términos y la Política de privacidad</a> de BogaHub, y recibir notificaciones y promociones de BogaHub y de las tiendas.
                  </p>
                )}

                {errorAuth && (
                  <p className="text-[11px] text-red-600 font-semibold">{errorAuth}</p>
                )}
                {exitoAuth && (
                  <p className="text-[11px] text-emerald-700 font-semibold">{exitoAuth}</p>
                )}

                <button
                  type="submit"
                  disabled={cargandoAuth}
                  className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 mt-1 shadow-md shadow-primary/20"
                >
                  {cargandoAuth ? 'Procesando…' : modoAuth === 'registro' ? 'Crear mi Cuenta Gratis' : 'Iniciar Sesión'}
                </button>
              </form>

              {/* Botón para pedir sin cuenta */}
              <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModoInvitado(true)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
                >
                  Continuar sin cuenta (guardar solo en este celular)
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarStaff(true)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1 mt-1"
                >
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  ¿Administras este negocio? Acceso staff
                </button>
              </div>
            </div>
          ) : tab === 'perfil' ? (
            /* Vista de Datos de Entrega (solo visible cuando el cliente ya tiene sesión) */
            <div className="flex flex-col gap-4 animate-fade-in">
              {user ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">verified</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-900 leading-tight truncate">Cuenta Conectada</p>
                      <p className="text-[10px] text-emerald-700 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCerrarSesionCompleta}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 underline shrink-0"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-600 leading-snug">
                    <strong className="text-gray-900">Modo invitado en este celular</strong>
                    <br />
                    Crea tu cuenta para guardar tus favoritos y pedidos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModoInvitado(false)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Crear cuenta
                  </button>
                </div>
              )}

              {user && tiendasPropias.length > 0 && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">storefront</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-white/70 leading-tight">Administra tu tienda</span>
                    <span className="block text-xs font-bold truncate leading-tight mt-0.5">
                      {tiendasPropias.length === 1 ? tiendasPropias[0] : `${tiendasPropias[0]} y ${tiendasPropias.length - 1} más`}
                    </span>
                  </span>
                  <span className="material-symbols-outlined text-white/70 text-[20px] shrink-0">chevron_right</span>
                </Link>
              )}

              <form onSubmit={handleSubmitDatos} className="flex flex-col gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Tus datos para pedidos por WhatsApp</h4>
                  <p className="text-[11px] text-gray-500">
                    Se completan automáticamente en cada pedido.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="ej: María Torres"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    Celular WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="ej: 987 654 321"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-primary focus:bg-white font-medium transition-all"
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
                  <button
                    type="button"
                    onClick={usarUbicacion}
                    disabled={ubicando}
                    className="mt-1.5 text-[11px] font-bold text-primary inline-flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">my_location</span>
                    {ubicando ? 'Ubicando…' : 'Usar mi ubicación actual'}
                  </button>
                  {ubicMsg && <p className="text-[10px] text-gray-500 mt-1">{ubicMsg}</p>}

  
                <p className="text-[10px] text-gray-400 leading-snug">
                  {storeName} usa tu nombre, WhatsApp y dirección solo para entregarte tu pedido. {user ? 'Tus datos se guardan en tu cuenta BogaHub.' : 'Tus datos se guardan solo en este celular.'}
                </p>

                {guardadoOk && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    ¡Datos guardados con éxito!
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl hover:opacity-95 active:scale-95 transition-all mt-1 shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Guardar mis datos
                </button>
              </form>

              {/* Acceso discreto para el dueño o staff en el pie */}
              <div className="pt-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setMostrarStaff(true)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  ¿Administras este negocio? Acceso staff
                </button>
              </div>
            </div>
          ) : tab === 'favoritos' ? (
            /* Favoritos de esta tienda (ligados a la cuenta) */
            <div className="flex flex-col gap-3 animate-fade-in">
              {!user ? (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl opacity-50">favorite</span>
                  <p className="text-xs font-semibold max-w-[240px]">Crea tu cuenta o inicia sesión para guardar tus favoritos.</p>
                  <button type="button" onClick={() => setModoInvitado(false)} className="text-xs font-bold text-primary hover:underline">
                    Iniciar sesión
                  </button>
                </div>
              ) : favsTienda.length === 0 ? (
                <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-50">favorite</span>
                  <p className="text-xs font-semibold">Todavía no tienes favoritos en {storeName}.</p>
                  <p className="text-[11px]">Toca el corazón de un producto para guardarlo aquí.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {favsTienda.map((f) => (
                    <div key={f.product_id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                      <Link
                        href={`/${storeSlug}/producto/${f.product_id}`}
                        onClick={() => setModalAbierto(false)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                          {f.image && <img src={f.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{f.name || 'Producto'}</p>
                          {f.price != null && <p className="text-[11px] font-semibold text-primary">S/ {Number(f.price).toFixed(2)}</p>}
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => alternarFav({ store: f.store, id: f.product_id })}
                        aria-label="Quitar de favoritos"
                        className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Vista de Mis Pedidos (solo cuando tiene sesión o modo invitado) */
            <div className="flex flex-col gap-3 animate-fade-in">
              <p className="text-xs text-gray-600">
                Historial de pedidos realizados en <strong>{storeName}</strong>.
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
        </div>
      </div>
    </div>
  );
}
