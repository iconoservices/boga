'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { stores } from '@/lib/stores.config';
import { useDemo } from '@/context/DemoContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { supabase } from '@/lib/supabase';

const META: Record<string, { emoji: string; cat: string }> = {
  sunset:   { emoji: '🥂', cat: 'Bar & Café' },
  delva:    { emoji: '🌿', cat: 'Mercado' },
  natura:   { emoji: '🪴', cat: 'Salud' },
  amazonia: { emoji: '🏺', cat: 'Artesanía' },
};

const INITIAL_CATEGORIES = [
  { id: 1, name: 'Restaurantes y Bares', subs: ['Cocina', 'Bar', 'Café', 'Postres', 'Bebidas'], storeSlugs: ['sunset'] },
  { id: 2, name: 'Mercado y Abastos',    subs: ['Frutas', 'Verduras', 'Carnes', 'Lácteos', 'Abarrotes'], storeSlugs: ['delva'] },
  { id: 3, name: 'Salud y Bienestar',    subs: ['Suplementos', 'Cuidado Personal', 'Vitaminas', 'Orgánico'], storeSlugs: ['natura'] },
  { id: 4, name: 'Artesanía y Hogar',   subs: ['Decoración', 'Muebles', 'Textiles', 'Cerámica'], storeSlugs: ['amazonia'] },
];

const NAV = [
  { id: 'tiendas',         icon: 'storefront',    label: 'Tiendas' },
  { id: 'categorias',      icon: 'category',      label: 'Categorías' },
  { id: 'usuarios',        icon: 'group',         label: 'Usuarios' },
  { id: 'personalizacion', icon: 'tune',          label: 'Personalización' },
  { id: 'facturacion',     icon: 'payments',      label: 'Facturación' },
] as const;

// Mini image upload input
function ImageUploadInput({ value, onChange, placeholder }: { value: string; onChange: (url: string) => void; placeholder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      alert('Error al subir: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        placeholder={placeholder || 'URL del banner...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-700 outline-none focus:border-black transition-colors"
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        title="Subir imagen"
      >
        {uploading
          ? <span className="material-symbols-outlined text-[13px] animate-spin text-gray-500">refresh</span>
          : <span className="material-symbols-outlined text-[13px] text-gray-500">photo_camera</span>
        }
      </button>
      {value && (
        <div className="w-7 h-7 rounded-lg overflow-hidden border border-gray-200 shrink-0">
          <img src={value} className="w-full h-full object-cover" alt="" />
        </div>
      )}
    </div>
  );
}

// Compact Toggle component
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${on ? 'bg-black' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${on ? 'left-4' : 'left-0.5'}`} />
    </button>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'tiendas' | 'categorias' | 'usuarios' | 'personalizacion' | 'facturacion'>('tiendas');
  const [search, setSearch] = useState('');
  const [activeStores, setActiveStores] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(stores).map((k) => [k, true]))
  );
  
  // Categorias state
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<{catId: number, index: number} | null>(null);

  // Usuarios state
  const ROLES = ['super_admin', 'store_admin'] as const;
  type UserRole = typeof ROLES[number];
  const [users, setUsers] = useState([
    { id: 1, email: 'tu@bogamarket.com',    name: 'Super Admin',      role: 'super_admin' as UserRole, store: '',       status: 'activo' },
    { id: 2, email: 'pedro@sunsetlounge.com', name: 'Pedro Ramírez',  role: 'store_admin' as UserRole, store: 'sunset', status: 'activo' },
    { id: 3, email: 'maria@delva.com',      name: 'María López',     role: 'store_admin' as UserRole, store: 'delva',  status: 'pendiente' },
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStore, setInviteStore] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('store_admin');
  const [inviteSent, setInviteSent] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    setUsers(prev => [...prev, {
      id: Date.now(), email: inviteEmail, name: '(pendiente)',
      role: inviteRole, store: inviteStore, status: 'pendiente'
    }]);
    setInviteSent(true);
    setTimeout(() => {
      setShowInviteModal(false);
      setInviteEmail(''); setInviteStore(''); setInviteRole('store_admin'); setInviteSent(false);
    }, 1800);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  const { isDemoVisible, toggleDemoProducts } = useDemo();
  const { getSettings, updateSetting } = useStoreSettings();

  const storeList = Object.values(stores);
  const filtered = storeList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStore = (slug: string) =>
    setActiveStores((prev) => ({ ...prev, [slug]: !prev[slug] }));

  const activeCount = Object.values(activeStores).filter(Boolean).length;
  const pausedCount = storeList.length - activeCount;

  return (
    <div className="min-h-screen bg-[#F4F5F7] font-['Outfit'] flex">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-48 bg-white border-r border-gray-100 flex-col h-screen sticky top-0 shrink-0">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
          <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center font-black text-xs">B</div>
          <span className="font-extrabold text-sm tracking-tight text-gray-900">Boga Admin</span>
        </div>
        <nav className="p-2 flex flex-col gap-0.5 flex-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveTab(n.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === n.id ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-900 text-xs font-semibold transition-colors rounded-lg hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Salir
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {/* Page title */}
        <div className="mb-4">
          <h1 className="text-lg font-extrabold text-gray-900">
            {activeTab === 'tiendas' && 'Tiendas'}
            {activeTab === 'categorias' && 'Taxonomía Maestra'}
            {activeTab === 'usuarios' && 'Gestión de Usuarios'}
            {activeTab === 'personalizacion' && 'Personalización de Tiendas'}
            {activeTab === 'facturacion' && 'Facturación'}
          </h1>
        </div>

        {/* ─── USUARIOS ─── */}
        {activeTab === 'usuarios' && (
          <div className="flex gap-4 items-start">

            {/* ── Left: User Table ── */}
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-xs text-gray-400 font-semibold">
                {users.length} usuario{users.length !== 1 ? 's' : ''} con acceso al panel
              </p>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 36px', gap: '12px' }} className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nombre</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tienda</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Acceso / Estado</span>
                  <span />
                </div>
                {/* Rows */}
                {users.map((u) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }} className={`items-center px-4 py-3 border-b border-gray-50 last:border-0 transition-colors group cursor-pointer ${ editingUser?.id === u.id ? 'bg-black/[0.02]' : 'hover:bg-gray-50/40'}`}>
                    <p className="font-bold text-sm text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 font-medium truncate">{u.email}</p>
                    <span className="text-xs font-semibold text-gray-400 truncate">
                      {u.store ? (stores[u.store]?.name || u.store) : <span className="text-gray-300 italic">Todas</span>}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                        u.role === 'super_admin' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'super_admin' ? 'Super' : 'Tienda'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${
                        u.status === 'activo' ? 'border-green-100 bg-green-50/50 text-green-600' : 'border-amber-100 bg-amber-50/50 text-amber-600'
                      }`}>
                        {u.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingUser({...u}); setInviteSent(false); }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar usuario"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        onClick={() => { setUsers(prev => prev.filter(x => x.id !== u.id)); if(editingUser?.id === u.id) setEditingUser(null); }}
                        className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revocar acceso"
                      >
                        <span className="material-symbols-outlined text-[15px]">person_remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info strip */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0 mt-0.5">info</span>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Los <strong>Admin de Tienda</strong> solo ven los productos de su tienda asignada. Los <strong>Super Admins</strong> tienen acceso completo. Al invitar, el usuario recibe un email para crear su contraseña.
                </p>
              </div>
            </div>

            {/* ── Right: Panel (Edit or Invite) ── */}
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

                {/* ── EDIT MODE ── */}
                {editingUser ? (
                  <>
                    <div className="px-5 py-4 border-b border-gray-50 bg-amber-50/40 flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[17px] text-amber-500">manage_accounts</span>
                          Editar Usuario
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{editingUser.email}</p>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Nombre</label>
                        <input
                          type="text" value={editingUser.name}
                          onChange={(e) => setEditingUser(prev => prev ? {...prev, name: e.target.value} : prev)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-medium outline-none focus:border-black focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Rol</label>
                        <select value={editingUser.role} onChange={(e) => setEditingUser(prev => prev ? {...prev, role: e.target.value as any, store: e.target.value === 'super_admin' ? '' : prev.store} : prev)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-black focus:bg-white transition-colors">
                          <option value="store_admin">Admin de Tienda</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                      {editingUser.role === 'store_admin' && (
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Tienda asignada</label>
                          <select value={editingUser.store} onChange={(e) => setEditingUser(prev => prev ? {...prev, store: e.target.value} : prev)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-black focus:bg-white transition-colors">
                            <option value="">Sin tienda asignada</option>
                            {Object.values(stores).map(s => (
                              <option key={s.slug} value={s.slug}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Estado</label>
                        <select value={editingUser.status} onChange={(e) => setEditingUser(prev => prev ? {...prev, status: e.target.value} : prev)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-black focus:bg-white transition-colors">
                          <option value="activo">Activo</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="suspendido">Suspendido</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditingUser(null)}
                          className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-200 transition-colors">
                          Cancelar
                        </button>
                        <button onClick={handleSaveUser}
                          className="flex-1 py-2.5 bg-black text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:-translate-y-0.5 transition-all shadow-md shadow-black/10">
                          <span className="material-symbols-outlined text-[14px]">save</span>
                          Guardar
                        </button>
                      </div>
                    </div>
                  </>

                ) : inviteSent ? (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900 mb-1">¡Invitación enviada!</h3>
                    <p className="text-xs text-gray-500 font-medium">El usuario recibirá un email para activar su acceso.</p>
                  </div>

                ) : (
                  /* ── INVITE MODE ── */
                  <>
                    <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                      <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">person_add</span>
                        Invitar Usuario
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">Envía acceso al Dashboard por email.</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
                        <input
                          type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="admin@sutienda.com"
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-medium outline-none focus:border-black focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Rol</label>
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-black focus:bg-white transition-colors">
                          <option value="store_admin">Admin de Tienda</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>
                      {inviteRole === 'store_admin' && (
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Tienda</label>
                          <select value={inviteStore} onChange={(e) => setInviteStore(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-black focus:bg-white transition-colors">
                            <option value="">Seleccionar tienda...</option>
                            {Object.values(stores).map(s => (
                              <option key={s.slug} value={s.slug}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        onClick={handleSendInvite}
                        disabled={!inviteEmail || (inviteRole === 'store_admin' && !inviteStore)}
                        className="w-full py-3 bg-black text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-md shadow-black/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 mt-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Enviar Invitación
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ─── TIENDAS ─── */}
        {activeTab === 'tiendas' && (
          <div className="space-y-3">

            {/* Stats mini */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total',    value: storeList.length, icon: 'storefront',   color: 'text-blue-600 bg-blue-50' },
                { label: 'Activas',  value: activeCount,       icon: 'check_circle', color: 'text-green-600 bg-green-50' },
                { label: 'Pausadas', value: pausedCount,        icon: 'pause_circle', color: 'text-orange-500 bg-orange-50' },
                { label: 'Clientes', value: 0,                  icon: 'group',        color: 'text-purple-600 bg-purple-50' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                    <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">{s.label}</p>
                    <p className="text-base font-extrabold text-gray-900">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-300 text-[16px]">search</span>
              <input
                placeholder="Buscar tienda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-gray-700 placeholder-gray-300"
              />
            </div>

            {/* Stores table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2 bg-gray-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 col-span-2">Tienda</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Tienda</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400"></span>
              </div>

              {filtered.map((store) => {
                const meta = META[store.slug] || { emoji: '🏪', cat: 'Tienda' };
                const storeOn = activeStores[store.slug];
                const demoOn = isDemoVisible(store.slug);
                return (
                  <div
                    key={store.slug}
                    className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-4 py-3 transition-opacity ${!storeOn ? 'opacity-40' : ''}`}
                  >
                    {/* Emoji */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ background: `${store.theme.primary}22` }}
                    >
                      {meta.emoji}
                    </div>

                    {/* Name + slug */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900 truncate">{store.name}</span>
                        {storeOn
                          ? <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full leading-none">activa</span>
                          : <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full leading-none">pausada</span>
                        }
                      </div>
                      <p className="text-[10px] text-gray-400">/{store.slug} · {meta.cat}</p>
                    </div>

                    {/* Toggle tienda */}
                    <div className="flex justify-center">
                      <Toggle on={storeOn} onChange={() => toggleStore(store.slug)} />
                    </div>

                    {/* Ver link */}
                    <Link
                      href={`/${store.slug}`}
                      target="_blank"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold hover:bg-gray-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      Ver
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-3 h-3 rounded-full bg-black inline-block" />
                Toggle tienda = activa/pausa la tienda completa del marketplace
              </div>
            </div>
          </div>
        )}

        {/* ─── CATEGORIAS ─── */}
        {/* ─── CATEGORIAS ─── */}
        {activeTab === 'categorias' && (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Taxonomía Maestra</h2>
                <p className="text-sm text-gray-500 font-medium">Gestiona las categorías globales y asigna qué tiendas pertenecen a cada una.</p>
              </div>
              <button className="bg-black text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-black/15 flex items-center gap-2 hover:-translate-y-0.5 transition-all">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nueva Categoría
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  {/* Category Header */}
                  <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">category</span>
                      </div>
                      <div className="flex-1">
                        {editingCatId === cat.id ? (
                          <input
                            autoFocus
                            value={cat.name}
                            onChange={(e) => setCategories(cats => cats.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                            onBlur={() => setEditingCatId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCatId(null)}
                            className="font-extrabold text-base text-gray-900 bg-white border border-gray-300 rounded px-2 py-0.5 outline-none focus:border-black w-full"
                          />
                        ) : (
                          <h3 className="font-extrabold text-base text-gray-900 cursor-pointer hover:underline flex items-center gap-2" onClick={() => setEditingCatId(cat.id)}>
                            {cat.name}
                            <span className="text-[10px] text-gray-400 font-bold bg-gray-200/50 px-1.5 py-0.5 rounded uppercase no-underline">ID:{cat.id}</span>
                          </h3>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setEditingCatId(cat.id)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-6">
                    {/* Subcategories */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Subcategorías (Secciones)</p>
                      <div className="flex flex-wrap gap-2">
                        {cat.subs.map((sub, idx) => (
                          <div key={idx} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-1 group transition-all">
                            {editingSubId?.catId === cat.id && editingSubId?.index === idx ? (
                               <input
                                 autoFocus
                                 value={sub}
                                 onChange={(e) => setCategories(cats => cats.map(c => {
                                   if (c.id !== cat.id) return c;
                                   const newSubs = [...c.subs];
                                   newSubs[idx] = e.target.value;
                                   return { ...c, subs: newSubs };
                                 }))}
                                 onBlur={() => setEditingSubId(null)}
                                 onKeyDown={(e) => e.key === 'Enter' && setEditingSubId(null)}
                                 className="text-xs font-semibold text-gray-900 bg-white border-b border-gray-400 outline-none w-20 px-1"
                               />
                            ) : (
                              <span className="text-xs font-semibold text-gray-700 cursor-pointer" onClick={() => setEditingSubId({catId: cat.id, index: idx})}>{sub}</span>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Estás seguro de que quieres eliminar la subcategoría "${sub}"?`)) {
                                  setCategories(cats => cats.map(c => c.id === cat.id ? { ...c, subs: c.subs.filter((_, i) => i !== idx) } : c));
                                }
                              }}
                              className="material-symbols-outlined text-[12px] text-gray-300 hover:text-red-500 rounded-full w-4 h-4 flex items-center justify-center transition-all ml-1"
                              title="Eliminar"
                            >
                              close
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            setCategories(cats => cats.map(c => {
                              if (c.id !== cat.id) return c;
                              const newSubs = [...c.subs, 'Nueva Sub'];
                              setEditingSubId({ catId: cat.id, index: newSubs.length - 1 });
                              return { ...c, subs: newSubs };
                            }));
                          }}
                          className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-500 text-xs font-semibold flex items-center gap-1 hover:border-gray-400 hover:text-gray-900 transition-all cursor-pointer bg-gray-50/50"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          Añadir
                        </button>
                      </div>
                    </div>

                    {/* Assigned Stores */}
                    <div className="mt-auto border-t border-gray-100 pt-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tiendas Asignadas</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {(cat.storeSlugs || []).length === 0 ? (
                            <span className="text-sm text-gray-400 italic">No hay tiendas en esta categoría.</span>
                          ) : (
                            (cat.storeSlugs || []).map((slug) => {
                              const storeObj = stores[slug];
                              return (
                                <div key={slug} className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/20 text-[10px]">{META[slug]?.emoji || '🏪'}</span>
                                  {storeObj?.name || slug}
                                  <button
                                    onClick={() => {
                                      setCategories(cats => cats.map(c => c.id === cat.id ? { ...c, storeSlugs: c.storeSlugs?.filter(s => s !== slug) } : c));
                                    }}
                                    className="ml-1 material-symbols-outlined text-[12px] opacity-60 hover:opacity-100 transition-opacity"
                                  >
                                    close
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <select 
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg outline-none focus:border-black flex-1"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              setCategories(cats => cats.map(c => {
                                if (c.id === cat.id) {
                                  const current = c.storeSlugs || [];
                                  if (!current.includes(val)) {
                                    return { ...c, storeSlugs: [...current, val] };
                                  }
                                }
                                return c;
                              }));
                              e.target.value = ''; // reset
                            }}
                          >
                            <option value="">+ Vincular Tienda...</option>
                            {Object.values(stores).filter(s => !(cat.storeSlugs || []).includes(s.slug)).map(s => (
                              <option key={s.slug} value={s.slug}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── PERSONALIZACION ─── */}
        {activeTab === 'personalizacion' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">
              Personaliza la apariencia y el comportamiento inicial de cada tienda.
            </p>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {storeList.map((store) => {
                const settings = getSettings(store.slug);
                const demoOn = isDemoVisible(store.slug);
                return (
                  <div key={store.slug} className="p-4 md:p-5 flex flex-col md:flex-row gap-6 md:items-start justify-between">
                    <div className="min-w-0 md:w-1/3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-gray-900">{store.name}</span>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">/{store.slug}</span>
                      </div>
                      <p className="text-xs text-gray-500">Configuración visual, contenido de prueba y comportamiento de inicio.</p>
                    </div>

                    <div className="flex-1 flex flex-col gap-3">
                      {/* Toggles compactos */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                        {[
                          { label: 'Productos Demo',   on: demoOn,                          toggle: () => toggleDemoProducts(store.slug) },
                          { label: 'Fotos Productos',  on: settings.showProductImages,       toggle: () => updateSetting(store.slug, 'showProductImages', !settings.showProductImages) },
                          { label: 'Splash',           on: settings.showSplash,             toggle: () => updateSetting(store.slug, 'showSplash', !settings.showSplash) },
                          { label: 'Foto Splash',      on: settings.showHeroImage,          toggle: () => updateSetting(store.slug, 'showHeroImage', !settings.showHeroImage), disabled: !settings.showSplash },
                          { label: 'Auto-Banner',      on: settings.useCategoryFeaturedImage, toggle: () => updateSetting(store.slug, 'useCategoryFeaturedImage', !settings.useCategoryFeaturedImage) },
                        ].map(item => (
                          <div key={item.label} className={`flex items-center gap-2 transition-opacity ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                            <Toggle on={item.on} onChange={item.toggle} />
                            <span className="text-[10px] font-semibold text-gray-600">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Banners Manuales por Categoría */}
                      {!settings.useCategoryFeaturedImage && (
                        <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Banners de Categoría</p>
                          {[{ href: 'all', name: 'Todo' }, ...store.categories].map(cat => (
                            <div key={cat.href} className="bg-white rounded-lg p-2.5 border border-gray-100 space-y-2">
                              <p className="text-[10px] font-bold text-gray-500 uppercase">{cat.name}</p>
                              <ImageUploadInput
                                value={settings.categoryBannerUrls[cat.href] || ''}
                                onChange={(url) => updateSetting(store.slug, 'categoryBannerUrls', { ...settings.categoryBannerUrls, [cat.href]: url })}
                                placeholder="Imagen del banner..."
                              />
                              <div className="grid grid-cols-3 gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Título..."
                                  value={settings.categoryBannerTitles[cat.href] || ''}
                                  onChange={(e) => updateSetting(store.slug, 'categoryBannerTitles', { ...settings.categoryBannerTitles, [cat.href]: e.target.value })}
                                  className="col-span-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-700 outline-none focus:border-black transition-colors"
                                />
                                <input
                                  type="text"
                                  placeholder="Precio..."
                                  value={settings.categoryBannerPrices[cat.href] || ''}
                                  onChange={(e) => updateSetting(store.slug, 'categoryBannerPrices', { ...settings.categoryBannerPrices, [cat.href]: e.target.value })}
                                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-700 outline-none focus:border-black transition-colors"
                                />
                                <input
                                  type="text"
                                  placeholder="Descripción..."
                                  value={settings.categoryBannerDescs[cat.href] || ''}
                                  onChange={(e) => updateSetting(store.slug, 'categoryBannerDescs', { ...settings.categoryBannerDescs, [cat.href]: e.target.value })}
                                  className="col-span-3 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-700 outline-none focus:border-black transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Splash hero URL */}
                      <div className={`transition-opacity ${(!settings.showSplash || !settings.showHeroImage) ? 'opacity-40 pointer-events-none' : ''}`}>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Imagen Splash Personalizada</label>
                        <ImageUploadInput
                          value={settings.customHeroUrl}
                          onChange={(url) => updateSetting(store.slug, 'customHeroUrl', url)}
                          placeholder="Dejar vacío para usar imagen por defecto..."
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── FACTURACION ─── */}
        {activeTab === 'facturacion' && (
          <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-gray-300">payments</span>
            </div>
            <h2 className="text-base font-extrabold text-gray-900">Módulo Financiero</h2>
            <p className="text-gray-400 text-xs text-center max-w-xs">
              Estamos configurando la pasarela de pagos para cobrar suscripciones a tus tiendas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
