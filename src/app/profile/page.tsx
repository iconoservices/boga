'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';

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
  const [activeSection, setActiveSection] = useState<'perfil' | 'ajustes'>('perfil');
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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

    // ¿Esta cuenta ya tiene una tienda? (stores.user_id la referencia)
    supabase.from('stores').select('name').eq('user_id', authUser.id).maybeSingle()
      .then(({ data }) => {
        if (data) setUser((u) => ({ ...u, isMerchant: true, merchantStoreName: data.name }));
      });
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
        <AppHeader showSearch={false} cartCount={0} />
        <main className="max-w-[640px] mx-auto px-container-margin pt-20 pb-12 flex items-center justify-center text-secondary text-sm">
          {authLoading ? 'Cargando tu perfil…' : 'Redirigiendo a inicio de sesión…'}
        </main>
      </>
    );
  }

  const navTabs: { key: typeof activeSection; label: string; icon: string }[] = [
    { key: 'perfil', label: 'Mi Perfil', icon: 'person' },
    { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
  ];

  return (
    <>
      <AppHeader 
        showSearch={false} 
        cartCount={0}
      />

      <main className="max-w-[640px] mx-auto px-container-margin pt-6 pb-12 flex flex-col gap-6">
        
        {/* Hero / Avatar Card */}
        <div className="bg-gradient-to-r from-on-surface to-inverse-surface rounded-2xl p-6 flex items-center gap-5 shadow-lg text-white">
          <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-primary to-primary-container flex items-center justify-center shrink-0 shadow-md">
            <span className="font-bold text-2xl text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5 font-bold">Bienvenido 👋</p>
            <h1 className="font-bold text-xl text-white leading-tight">{user.name}</h1>
            <p className="text-white/40 text-xs mt-1">
              {user.email} · Miembro desde {user.joinedDate}
            </p>
          </div>
        </div>

        {/* Superadmin Card — atajo a TODAS las tiendas, no solo la propia */}
        {isSuperadmin && (
          <div className="bg-gradient-to-r from-[#1a1a1a] to-[#333] rounded-2xl p-5 flex items-center gap-4 shadow-md text-white">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[24px]">admin_panel_settings</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Acceso Super Admin</p>
              <p className="font-bold text-sm text-white mt-0.5">Gestionar todas las tiendas de Boga</p>
            </div>
            <Link
              href="/superadmin"
              className="bg-white text-on-surface hover:bg-neutral-50 transition-all font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              Mis tiendas
            </Link>
          </div>
        )}

        {/* Merchant Card */}
        {user.isMerchant && (
          <div className="bg-gradient-to-r from-primary to-primary-container rounded-2xl p-5 flex items-center gap-4 shadow-md text-white">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md">
              <span className="material-symbols-outlined text-white text-[24px]">storefront</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Tu tienda en Boga</p>
              <p className="font-bold text-sm text-white mt-0.5">{user.merchantStoreName}</p>
            </div>
            <Link 
              href="/admin" 
              className="bg-white text-primary hover:bg-neutral-50 transition-all font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              Admin
            </Link>
          </div>
        )}

        {/* No-merchant CTA */}
        {!user.isMerchant && (
          <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-surface-container-highest flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-fixed text-primary rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">add_business</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-on-surface">¿Tienes un negocio?</p>
              <p className="text-secondary text-xs mt-0.5 leading-normal">
                Crea tu carta digital o catálogo en Boga gratis.
              </p>
            </div>
            <Link
              href="/negocios"
              className="bg-primary text-white hover:bg-primary-container transition-all font-bold text-xs py-2 px-4 rounded-xl active:scale-95 shrink-0"
            >
              Saber más
            </Link>
          </div>
        )}

        {/* Section Nav Tabs */}
        <div className="flex gap-1 bg-surface-container p-1 rounded-xl border border-surface-container-highest shadow-inner">
          {navTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex-1 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                activeSection === tab.key 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-secondary opacity-60 hover:opacity-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
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

        {/* SECTION: Ajustes */}
        {activeSection === 'ajustes' && (
          <div className="flex flex-col gap-4">

            {/* Notificaciones */}
            <div className="bg-white rounded-2xl p-5 border border-surface-container-highest shadow-[0_15px_15px_rgba(0,0,0,0.04)]">
              <h3 className="font-bold text-sm text-on-surface mb-4">Notificaciones</h3>
              {[
                { label: 'Estado de mis pedidos', desc: 'Confirmación, en camino, entregado', value: notifOrders, onToggle: () => setNotifOrders(v => !v) },
                { label: 'Promos de mis tiendas', desc: 'Descuentos y lanzamientos nuevos', value: notifPromos, onToggle: () => setNotifPromos(v => !v) },
              ].map(({ label, desc, value, onToggle }) => (
                <div key={label} className="flex justify-between items-center py-3 border-b border-surface-container-low last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold text-xs text-on-surface">{label}</p>
                    <p className="text-[10px] text-secondary/60 mt-0.5 leading-normal">{desc}</p>
                  </div>
                  <button 
                    onClick={onToggle} 
                    className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-primary' : 'bg-surface-container-high'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${value ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
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
              {[
                { icon: 'lock', label: 'Cambiar contraseña', action: '#' },
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

      </main>
    </>
  );
}
