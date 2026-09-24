'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `usuarios`): quién tiene acceso al panel
// y a qué tiendas. La lógica (invitar, asignar, quitar acceso) vive en ./useUsuariosAdmin y la comparte
// el dashboard, que la usa para el modal "Asignar administrador" de Gestión de Tiendas.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import { useUsuariosAdmin } from './useUsuariosAdmin';

export default function UsuariosAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const { user: authUser } = useAuth();
  const router = useRouter();

  // Solo hace falta slug y nombre de cada tienda, más quién es su dueño.
  const [stores, setStores] = useState<Record<string, { slug: string; name: string }>>({});

  const {
    setStoreOwners, inviteStore, inviteRole, inviteSent, editingUser, setEditingUser, editingUserOriginalStore, editingUserStores, setEditingUserStores, derivedUsers, groupedUsers, expandedUserIds, toggleExpandedUser, abrirEditorUsuarioMulti, handleSaveUser, handleRevokeAccess, camposInvitacion, avisoInvitacionEnviada,
  } = useUsuariosAdmin({ stores, authUser });

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/usuarios');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => {
    if (!esSuperadmin) return;
    supabase.from('stores').select('slug,name,user_id').order('name', { ascending: true }).then(({ data }) => {
      const tiendas: Record<string, { slug: string; name: string }> = {};
      const duenos: Record<string, string | null> = {};
      (data ?? []).forEach((s: any) => { tiendas[s.slug] = { slug: s.slug, name: s.name }; duenos[s.slug] = s.user_id || null; });
      setStores(tiendas);
      setStoreOwners(duenos);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esSuperadmin]);

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <SuperadminSubheader title="Usuarios" icon="group" />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start animate-fade-in">
              {/* Left: User Table */}
              <div className="flex-1 w-full min-w-0 space-y-3">
                <p className="text-xs text-[#424754] font-semibold">
                  {derivedUsers.length} usuario{derivedUsers.length !== 1 ? 's' : ''} con acceso al panel
                </p>
                <div className="bg-white rounded-md border border-[#c2c6d6] shadow-sm overflow-hidden">
                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }} className="px-4 py-2 bg-[#f2f3fd] border-b border-[#c2c6d6]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Nombre</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Email</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Tienda</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Acceso / Estado</span>
                    <span />
                  </div>
                  {/* Rows — agrupadas por persona: quien administra varias tiendas
                      (vos, el superadmin, o cualquier dueño de multiples locales)
                      sale una sola vez, con la lista de tiendas plegable. */}
                  {groupedUsers.length === 0 && (
                    <div className="px-4 py-8 text-center text-xs text-[#727785] font-semibold italic">
                      Todavía no hay perfiles registrados.
                    </div>
                  )}
                  {groupedUsers.map((g) => {
                    // La fila "super_admin" (store: '') es la cuenta en si, no
                    // una tienda mas — no cuenta para "N tiendas" ni se lista
                    // aparte al expandir.
                    const tiendas = g.filas.filter((f) => f.store);
                    const multi = tiendas.length > 1;
                    const isExpanded = expandedUserIds.has(g.id);
                    const unica = tiendas[0] || g.filas[0];
                    return (
                      <React.Fragment key={g.id}>
                        <div
                          onClick={multi ? () => toggleExpandedUser(g.id) : undefined}
                          style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }}
                          className={`items-center px-4 py-3.5 border-b border-[#ecedf7] last:border-0 transition-colors group ${multi ? 'cursor-pointer' : 'cursor-default'} ${
                            editingUser?.id === g.id && !multi ? 'bg-[#ecedf7]/30' : 'hover:bg-[#f2f3fd]/20'
                          }`}
                        >
                          <p className="font-bold text-xs text-[#191b23] truncate">{g.name}</p>
                          <p className="text-xs text-[#424754] font-semibold truncate">{g.email}</p>
                          <span className="text-xs font-semibold text-[#424754] truncate flex items-center gap-1">
                            {multi ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] text-[#727785]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                {tiendas.length} tiendas
                              </>
                            ) : unica.store ? (
                              stores[unica.store]?.name || unica.store
                            ) : g.role === 'super_admin' ? (
                              <span className="text-[#c2c6d6] italic">Todas (Super)</span>
                            ) : (
                              <span className="text-[#c2c6d6] italic">Sin tienda</span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                              g.role === 'super_admin' ? 'bg-[#0058be] text-white border-[#0058be]' : 'bg-[#e6e7f2] text-[#424754] border-[#c2c6d6]'
                            }`}>
                              {g.role === 'super_admin' ? 'Super' : 'Tienda'}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                              g.status === 'activo'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                            }`}>
                              {g.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!multi && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); abrirEditorUsuarioMulti(unica); }}
                                  className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                  title="Editar usuario"
                                >
                                  <span className="material-symbols-outlined text-[15px]">edit</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRevokeAccess(unica); }}
                                  className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#ba1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                  title="Revocar acceso"
                                >
                                  <span className="material-symbols-outlined text-[15px]">person_remove</span>
                                </button>
                              </>
                            )}
                            {multi && (
                              <button
                                onClick={(e) => { e.stopPropagation(); abrirEditorUsuarioMulti(g.filas[0]); }}
                                className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                title="Editar tiendas asignadas"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {multi && isExpanded && tiendas.map((u) => (
                          <div
                            key={`${u.id}-${u.store}`}
                            style={{ display: 'grid', gridTemplateColumns: '160px 1fr 130px 160px 72px', gap: '12px' }}
                            className={`items-center px-4 py-2.5 border-b border-[#ecedf7] last:border-0 bg-[#f9f9ff] transition-colors group ${
                              editingUser?.id === u.id && editingUserOriginalStore === u.store ? 'bg-[#ecedf7]/30' : 'hover:bg-[#f2f3fd]/40'
                            }`}
                          >
                            <span />
                            <span />
                            <span className="text-xs font-semibold text-[#545f73] truncate pl-1">↳ {stores[u.store]?.name || u.store}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap w-fit ${
                              u.status === 'activo'
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                            }`}>
                              {u.status}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => abrirEditorUsuarioMulti(u)}
                                className="w-7 h-7 flex items-center justify-center text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded-lg transition-colors"
                                title="Editar usuario"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleRevokeAccess(u)}
                                className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#ba1a1a] hover:bg-red-50 rounded-lg transition-colors"
                                title="Revocar acceso"
                              >
                                <span className="material-symbols-outlined text-[15px]">person_remove</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Info strip */}
                <div className="flex items-start gap-3 bg-[#d5e0f8]/30 border border-[#adc6ff] rounded-md p-4">
                  <span className="material-symbols-outlined text-[#0058be] text-[18px] shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-[#004395] font-semibold leading-relaxed">
                    Los <strong>Admin de Tienda</strong> solo ven y modifican los productos y la personalización de su tienda asignada. Los <strong>Super Admins</strong> tienen control absoluto sobre todo el ecosistema.
                  </p>
                </div>
              </div>

              {/* Right Panel (Edit / Invite Form) */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white rounded-md border border-[#c2c6d6] shadow-sm overflow-hidden">
                  
                  {/* EDIT USER */}
                  {editingUser ? (
                    <>
                      <div className="px-5 py-4 border-b border-[#c2c6d6] bg-amber-50/50 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-[#191b23] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px] text-amber-600">manage_accounts</span>
                            Editar Usuario
                          </h3>
                          <p className="text-[10px] text-[#424754] font-semibold mt-0.5 truncate">{editingUser.email}</p>
                        </div>
                        <button onClick={() => setEditingUser(null)} className="w-7 h-7 flex items-center justify-center text-[#c2c6d6] hover:text-[#424754] hover:bg-[#ecedf7] rounded-lg transition-colors shrink-0">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre</label>
                          <input
                            type="text" value={editingUser.name}
                            onChange={(e) => setEditingUser(prev => prev ? {...prev, name: e.target.value} : prev)}
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] focus:bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Rol</label>
                          <select value={editingUser.role} onChange={(e) => setEditingUser(prev => prev ? {...prev, role: e.target.value as any, store: e.target.value === 'super_admin' ? '' : prev.store} : prev)}
                            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                            <option value="store_admin">Admin de Tienda</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                        {editingUser.role === 'store_admin' && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">
                              Tiendas Asignadas {editingUserStores.size > 0 && `(${editingUserStores.size})`}
                            </label>
                            <div className="max-h-40 overflow-y-auto bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg divide-y divide-[#e6e7f2]">
                              {Object.values(stores).length === 0 && (
                                <p className="px-3 py-2 text-xs text-[#727785] italic">No hay tiendas creadas todavía.</p>
                              )}
                              {Object.values(stores).map(s => (
                                <label key={s.slug} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#191b23] cursor-pointer hover:bg-white/60 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={editingUserStores.has(s.slug)}
                                    onChange={(e) => setEditingUserStores(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(s.slug); else next.delete(s.slug);
                                      return next;
                                    })}
                                    className="w-3.5 h-3.5 accent-[#0058be]"
                                  />
                                  {s.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setEditingUser(null)}
                            className="flex-1 py-2 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors">
                            Cancelar
                          </button>
                          <button onClick={handleSaveUser}
                            className="flex-1 py-2 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-md transition-all">
                            <span className="material-symbols-outlined text-[14px]">save</span>
                            Guardar
                          </button>
                        </div>
                      </div>
                    </>
                  ) : inviteSent ? (
                    avisoInvitacionEnviada(
                      inviteRole === 'store_admin' && inviteStore
                        ? `Ya le asignamos "${stores[inviteStore]?.name || inviteStore}". Recibió un correo con un link para entrar directo, sin contraseña.`
                        : 'Recibió un correo con un link para entrar directo, sin contraseña.'
                    )
                  ) : (
                    /* INVITE USER */
                    <>
                      <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd]">
                        <h3 className="font-bold text-xs text-[#191b23] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-[#424754]">person_add</span>
                          Invitar Usuario
                        </h3>
                        <p className="text-[10px] text-[#424754] font-semibold mt-0.5">Otorga credenciales de acceso al dashboard.</p>
                      </div>
                      {camposInvitacion(true)}
                    </>
                  )}

                </div>
              </div>
            </div>
      </main>
    </div>
  );
}
