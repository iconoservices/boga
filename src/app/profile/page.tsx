'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import PasswordInput from '@/components/PasswordInput';
import PedidosPanel from '@/components/PedidosPanel';
import AvisosBogaSwitch from '@/components/AvisosBogaSwitch';
import CerrarOtrasSesiones from '@/components/CerrarOtrasSesiones';

// Placeholder mientras se resuelve la sesión / mientras redirige a /login.
// El contenido real de la página sale de la cuenta autenticada, no de esto.
const EMPTY_USER = {
  name: '',
  email: '',
  phone: '',
  address: '',
  avatar: '',
  isMerchant: false,
  merchantStoreName: '',
  joinedDate: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const [user, setUser] = useState(EMPTY_USER);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user.name, phone: user.phone, address: user.address });
  const [activeSection, setActiveSection] = useState<'perfil' | 'ajustes' | 'favoritos'>('perfil');
  // Enlaces directos: /profile?seccion=favoritos o /profile?seccion=ajustes
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('seccion');
    if (s === 'ajustes' || s === 'favoritos' || s === 'pedidos') {
      setActiveSection(s === 'pedidos' ? 'favoritos' : s as any);
    }
  }, []);
  const [darkMode, setDarkMode] = useState(false);

  // Cambiar contraseña: la sesion ya esta autenticada, asi que Supabase no
  // pide la clave actual para updateUser — no hace falta el flujo de "te
  // mandamos un correo" que sí necesita quien no puede entrar.
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Boga Network
  const [networkStoreName, setNetworkStoreName] = useState<string>('');
  const [hasNetworkStore, setHasNetworkStore] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 6) { setPasswordError('La contraseña tiene que tener al menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas no coinciden.'); return; }
    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSavingPassword(false);
    if (error) { setPasswordError(error.message); return; }
    setPasswordSaved(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => { setShowPasswordModal(false); setPasswordSaved(false); }, 1800);
  };

  // Sin sesión real no hay perfil que mostrar — a /login. Cada cuenta ve
  // sus propios datos, no un "Carlos Mejía" fijo para cualquiera que entre.
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.replace('/login');
      return;
    }
    const base = {
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
      email: authUser.email || '',
      phone: '',
      address: '',
      avatar: '',
      joinedDate: authUser.created_at
        ? new Date(authUser.created_at).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
        : '',
    };
    setUser({ ...base, isMerchant: false, merchantStoreName: '' });

    // ¿Esta cuenta ya tiene tienda(s)? (stores.user_id la referencia). Antes
    // usaba maybeSingle(), que rompe en silencio si hay MAS de una tienda con
    // el mismo dueño (ej. superadmin con varias) — nunca marcaba isMerchant.
    supabase.from('stores').select('name').eq('user_id', authUser.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const nombre = data.length === 1 ? data[0].name : `${data[0].name} y ${data.length - 1} más`;
          setUser((u) => ({ ...u, isMerchant: true, merchantStoreName: nombre }));
        }
      });

    // ¿Esta cuenta tiene tienda(s) de revendedor en Boga Network?
    if (authUser.email) {
      supabase
        .from('store_requests')
        .select('business_name')
        .eq('email', authUser.email)
        .eq('interest', 'revendedor')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0 && data[0].business_name) {
            setHasNetworkStore(true);
            const nombre = data.length === 1 ? data[0].business_name : `${data[0].business_name} y ${data.length - 1} más`;
            setNetworkStoreName(nombre);
          }
        });
    }

    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(`boga_revendedor_draft_${authUser.id}`) || localStorage.getItem('boga_revendedor_draft') : null;
      if (raw) {
        const p = JSON.parse(raw);
        if (p.nombreTienda) {
          setHasNetworkStore(true);
          setNetworkStoreName((prev) => prev || p.nombreTienda);
        }
      }
    } catch {}
  }, [authLoading, authUser, router]);

  const initials = (user.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const { esSuperadmin: isSuperadmin } = useEsSuperadmin();

  const handleSave = () => {
    setUser(prev => ({ ...prev, ...editForm }));
    setIsEditing(false);
  };

  if (authLoading || !authUser) {
    return (
      <>
        <AppHeader cartCount={0} />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 flex items-center justify-center text-secondary text-sm">
          {authLoading ? 'Cargando tu perfil…' : 'Redirigiendo a inicio de sesión…'}
        </main>
      </>
    );
  }

  const navTabs: { key: typeof activeSection; label: string; icon: string }[] = [
    { key: 'perfil', label: 'Mi Perfil', icon: 'person' },
    { key: 'favoritos', label: 'Favoritos', icon: 'favorite' },
    { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
  ];

  return (
    <>
      <AppHeader 
        cartCount={0}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          
          {/* Columna Izquierda: Avatar y Navegación */}
          <div className="w-full lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Hero / Avatar Card */}
            <div className="bg-gradient-to-r from-on-surface to-inverse-surface rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-md text-white">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary-container flex items-center justify-center shrink-0 shadow-md">
                <span className="font-bold text-lg text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5 font-bold">Bienvenido 👋</p>
                <h1 className="font-bold text-base text-white leading-tight truncate">{user.name}</h1>
                <p className="text-white/40 text-[11px] mt-0.5 truncate">
                  {user.email}
                </p>
                <p className="text-white/30 text-[10px] mt-0.5 truncate">
                  Miembro desde {user.joinedDate}
                </p>
              </div>
            </div>

            {/* Selector: Mi Perfil · Favoritos · Ajustes */}
            <div className="flex lg:flex-col gap-1.5 bg-surface-container p-1.5 rounded-2xl border border-surface-container-highest shadow-inner">
              {navTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`flex-1 lg:flex-initial py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center lg:justify-start justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    activeSection === tab.key
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-secondary opacity-70 hover:opacity-100 hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Accesos Directos de Gestión y Contenido */}
          <div className="w-full lg:col-span-8 flex flex-col gap-5 mt-4 lg:mt-0">
            {/* Accesos de Gestión Rediseñados Limpios */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-secondary/70 uppercase tracking-wider px-1">
                Accesos y Espacios de Gestión
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Superadmin */}
                {isSuperadmin && (
                  <Link
                    href="/superadmin"
                    className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                        <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Panel General</span>
                        <span className="text-xs font-black text-slate-900 truncate block mt-0.5">Super Admin</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition text-[18px] shrink-0">chevron_right</span>
                  </Link>
                )}

                {/* Tienda propia */}
                {user.isMerchant ? (
                  <Link
                    href="/admin"
                    className="bg-white hover:bg-red-50/40 border border-red-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-wider block">Tu Negocio</span>
                        <span className="text-xs font-black text-slate-900 truncate block mt-0.5">{user.merchantStoreName}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition text-[18px] shrink-0">chevron_right</span>
                  </Link>
                ) : (
                  <Link
                    href="/negocios"
                    className="bg-gradient-to-r from-red-50 to-orange-50/50 hover:from-red-100/80 hover:to-orange-100/80 border border-red-200/70 rounded-2xl p-3.5 shadow-2xs transition-all flex items-center justify-between gap-3 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">add_business</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-wider block">¿Tienes un negocio?</span>
                        <span className="text-xs font-black text-slate-900 truncate block mt-0.5">Crear carta digital</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-red-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition text-[18px] shrink-0">chevron_right</span>
                  </Link>
                )}

                {/* Boga Network · Tienda de Reventa */}
                {hasNetworkStore ? (
                  <Link
                    href="/network/panel"
                    className="bg-white hover:bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider block">Boga Network</span>
                        <span className="text-xs font-black text-slate-900 truncate block mt-0.5">{networkStoreName || 'Mis Tiendas'}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition text-[18px] shrink-0">chevron_right</span>
                  </Link>
                ) : (
                  <Link
                    href="/network"
                    className="bg-gradient-to-r from-emerald-50 to-teal-50/50 hover:from-emerald-100/80 hover:to-teal-100/80 border border-emerald-200/70 rounded-2xl p-3.5 shadow-2xs transition-all flex items-center justify-between gap-3 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider block">Boga Network</span>
                        <span className="text-xs font-black text-slate-900 truncate block mt-0.5">Gana dinero revendiendo</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-emerald-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition text-[18px] shrink-0">chevron_right</span>
                  </Link>
                )}
              </div>
            </div>

        {/* SECTION: Mi Perfil */}
        {activeSection === 'perfil' && (
          <div className="bg-white rounded-2xl p-6 shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-base text-on-surface">Información personal</h2>
              <button 
                onClick={() => { 
                  setIsEditing(!isEditing); 
                  setEditForm({ name: user.name, phone: user.phone, address: user.address }); 
                }} 
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm ${
                  isEditing 
                    ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{isEditing ? 'close' : 'edit'}</span>
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {[
                { label: 'Nombre completo', value: user.name, field: 'name', icon: 'person' },
                { label: 'Correo electrónico', value: user.email, field: 'email', icon: 'mail', readonly: true },
                { label: 'WhatsApp', value: user.phone ? `+${user.phone}` : '—', field: 'phone', icon: 'phone' },
                { label: 'Dirección de entrega', value: user.address || '—', field: 'address', icon: 'location_on' },
              ].map(({ label, value, field, icon, readonly }) => (
                <div key={field} className="flex flex-col">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                    {label}
                  </label>
                  {isEditing && !readonly ? (
                    <div className="relative">
                      <span className="material-symbols-outlined text-secondary text-[18px] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {icon}
                      </span>
                      <input
                        value={(editForm as any)[field] || ''}
                        onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/60"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-secondary/40">{icon}</span>
                      <span className={`text-sm font-semibold ${value === '—' ? 'text-secondary/40' : 'text-on-surface'}`}>{value}</span>
                      {readonly && (
                        <span className="text-[9px] font-bold text-secondary bg-surface-container px-2 py-0.5 rounded-md uppercase ml-1">
                          No editable
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isEditing && (
              <button 
                onClick={handleSave} 
                className="w-full mt-6 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container active:scale-95 shadow-md transition-all flex items-center justify-center gap-1"
              >
                Guardar cambios ✓
              </button>
            )}
          </div>
        )}

        {/* SECTION: Favoritos */}
        {activeSection === 'favoritos' && <PedidosPanel />}

        {activeSection === 'ajustes' && (
          <div className="flex flex-col gap-4">

            {/* Notificaciones */}
            <div className="bg-white rounded-2xl p-5 border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)]">
              <h3 className="font-bold text-sm text-on-surface mb-4">Notificaciones</h3>
              <AvisosBogaSwitch />
            </div>

            {/* Apariencia */}
            <div className="bg-white rounded-2xl p-5 border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)]">
              <h3 className="font-bold text-sm text-on-surface mb-4">Apariencia</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs text-on-surface">Modo oscuro</p>
                  <p className="text-[10px] text-secondary/60 mt-0.5 leading-normal">Próximamente</p>
                </div>
                <button 
                  onClick={() => setDarkMode(v => !v)} 
                  className={`w-11 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-primary' : 'bg-surface-container-high'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${darkMode ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Cuenta */}
            <div className="bg-white rounded-2xl border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)] overflow-hidden">
              <h3 className="font-bold text-sm text-on-surface p-5 pb-3">Cuenta</h3>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-3.5 px-5 py-3.5 border-t border-surface-container-low w-full text-left bg-transparent border-0 cursor-pointer text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-secondary/40">lock</span>
                <span className="font-bold text-xs flex-1">Cambiar contraseña</span>
                <span className="material-symbols-outlined text-[18px] text-secondary/35">chevron_right</span>
              </button>
              {[
                { icon: 'help', label: 'Centro de ayuda', action: '#' },
                { icon: 'privacy_tip', label: 'Privacidad y términos', action: '#' },
              ].map(({ icon, label, action }) => (
                <a
                  key={label}
                  href={action}
                  className="flex items-center gap-3.5 px-5 py-3.5 border-t border-surface-container-low text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-secondary/40">{icon}</span>
                  <span className="font-bold text-xs flex-1">{label}</span>
                  <span className="material-symbols-outlined text-[18px] text-secondary/35">chevron_right</span>
                </a>
              ))}

              <CerrarOtrasSesiones className="flex items-center gap-3.5 px-5 py-3.5 border-t border-surface-container-low w-full text-left bg-transparent border-0 cursor-pointer text-on-surface-variant hover:bg-surface-container-low/50 transition-colors font-bold text-xs">
                <span className="material-symbols-outlined text-[20px]">devices</span>
                Cerrar sesión en otros dispositivos
              </CerrarOtrasSesiones>

              <button
                onClick={async () => { await signOut(); window.location.href = '/login'; }}
                className="flex items-center gap-3.5 px-5 py-3.5 border-t border-surface-container-low w-full text-left bg-transparent border-0 cursor-pointer text-red-500 hover:bg-red-50/50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-red-500">logout</span>
                <span className="font-bold text-xs">Cerrar sesión</span>
              </button>
            </div>

            {/* Version badge */}
            <p className="text-center font-label-md text-[10px] text-secondary/45 mt-2">
              Boga Market v1.0 · © 2026
            </p>
          </div>
        )}

          </div>
        </div>
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[380px] bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-headline-md text-lg text-on-surface font-black">Cambiar contraseña</h3>
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordError(null); setNewPassword(''); setConfirmPassword(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-xs text-secondary mb-5 leading-normal font-body-md">
              Como ya iniciaste sesión, no hace falta la contraseña actual — solo elige una nueva.
            </p>

            {passwordError && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold">
                {passwordError}
              </div>
            )}

            {passwordSaved ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-primary-container/20 text-on-surface text-xs font-bold border border-primary/20">
                ¡Listo! Tu contraseña se actualizó.
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-secondary mb-1.5 uppercase tracking-wider">Contraseña nueva</label>
                  <PasswordInput
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-secondary mb-1.5 uppercase tracking-wider">Repetila</label>
                  <PasswordInput
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface transition-all focus:bg-white focus:border-surface-container-highest placeholder:text-secondary/40 font-body-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className={`w-full mt-1 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md ${
                    isSavingPassword ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSavingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : 'Guardar contraseña →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
