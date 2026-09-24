'use client';

// Lógica de usuarios y dueños de tienda del superadmin, compartida por el dashboard (Gestión de
// Tiendas: modal "Asignar administrador") y por /superadmin/usuarios. Salió tal cual del page.tsx
// gigante: mismos nombres, mismo comportamiento.

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const ROLES = ['super_admin', 'store_admin'] as const;
export type UserRole = typeof ROLES[number];
export interface UserRow { id: string; email: string; name: string; role: UserRole; store: string; status: 'activo' | 'pendiente' }

export function useUsuariosAdmin({ stores, authUser }: {
  stores: Record<string, { slug: string; name: string }>;
  authUser: { id?: string; email?: string | null } | null | undefined;
}) {
  // Usuarios state — se arma de datos reales (perfiles + dueños de tienda), no
  // de una lista inventada: ver `derivedUsers` mas abajo.
  const [profiles, setProfiles] = useState<{ id: string; email: string; name: string | null }[]>([]);
  const [storeOwners, setStoreOwners] = useState<Record<string, string | null>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStore, setInviteStore] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('store_admin');
  const [inviteSent, setInviteSent] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editingUserOriginalStore, setEditingUserOriginalStore] = useState('');
  // Solo se usa en el panel de Usuarios (no en el modal de "administrador de
  // esta tienda puntual", que sigue siendo de una sola por diseño): las
  // tiendas que va a terminar administrando esta persona al guardar.
  const [editingUserStores, setEditingUserStores] = useState<Set<string>>(new Set());
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  // Slug de la tienda cuyo modal de "Asignar/Editar Administrador" está
  // abierto (se abre desde la fila en Gestión de Tiendas, sin cambiar de
  // pestaña). Reutiliza el mismo estado de invitación/edición que Usuarios.
  const [assignStoreSlug, setAssignStoreSlug] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.from('profiles').select('*').then(({ data, error }) => {
      if (error) { console.error('Error fetching profiles:', error); return; }
      setProfiles(data || []);
    });
  }, []);

  // Un usuario real (con cuenta) por fila: primero vos como superadmin,
  // despues una fila por cada tienda que administra cada quien, y por ultimo
  // quien ya tiene cuenta pero todavia no administra ninguna tienda (se
  // registro solo, o vos lo invitaste y ya entro).
  //
  // Solo aparece TU fila de superadmin: quien manda es public.is_superadmin()
  // en la base, y esa funcion contesta por el usuario actual, no devuelve la
  // lista. Es el precio de no tener los correos escritos en el navegador. Si
  // algun dia hay mas de un superadmin, conviene moverlos a una tabla.
  const derivedUsers = React.useMemo<UserRow[]>(() => {
    const rows: UserRow[] = [];
    const idsConFila = new Set<string>();

    if (authUser?.id && authUser.email) {
      const p = profiles.find((pr) => pr.id === authUser.id);
      rows.push({ id: authUser.id, email: authUser.email, name: p?.name || 'Super Admin', role: 'super_admin', store: '', status: 'activo' });
      idsConFila.add(authUser.id);
    }

    // Una fila por cada tienda asignada, incluidas las que te asignaste a vos
    // mismo como superadmin: si no, la tienda parece sin dueño de nuevo (el
    // botón vuelve a decir "Asignar" en vez de "Editar") apenas te la asignás.
    Object.entries(storeOwners).forEach(([slug, ownerId]) => {
      if (!ownerId) return;
      const p = profiles.find((pr) => pr.id === ownerId);
      rows.push({ id: ownerId, email: p?.email || ownerId, name: p?.name || p?.email || '(sin perfil todavía)', role: 'store_admin', store: slug, status: 'activo' });
      idsConFila.add(ownerId);
    });

    // Tiene cuenta pero ninguna tienda todavia: aca es donde vos lo "ascendes"
    // con Editar, sin mandarle nada de nuevo.
    profiles.forEach((p) => {
      if (idsConFila.has(p.id)) return;
      rows.push({ id: p.id, email: p.email, name: p.name || p.email, role: 'store_admin', store: '', status: 'activo' });
    });

    return rows;
  }, [profiles, storeOwners, authUser]);

  // Agrupa las filas de derivedUsers por persona: antes un dueño de varias
  // tiendas (ej. vos, el superadmin) aparecia como el mismo correo repetido
  // una vez por tienda, como si fueran cuentas distintas.
  const groupedUsers = React.useMemo(() => {
    const porId = new Map<string, { id: string; email: string; name: string; role: UserRole; status: UserRow['status']; filas: UserRow[] }>();
    derivedUsers.forEach((u) => {
      const g = porId.get(u.id);
      if (g) g.filas.push(u);
      else porId.set(u.id, { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, filas: [u] });
    });
    return Array.from(porId.values());
  }, [derivedUsers]);
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const toggleExpandedUser = (id: string) => setExpandedUserIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Cuentas que ya existen (se registraron solo, o vos las invitaste y ya
  // entraron) pero todavía no administran ninguna tienda. Sirve para poder
  // asignarle una tienda a alguien que ya tiene cuenta, en vez de mandarle
  // siempre una invitación nueva por correo.
  // Incluye también al superadmin: puede querer administrar una tienda
  // puntual desde el /admin normal, aparte de su acceso total en /superadmin.
  const usuariosSinTienda = React.useMemo(
    () => derivedUsers.filter((u) => !u.store),
    [derivedUsers]
  );

  const [asignandoExistente, setAsignandoExistente] = useState(false);
  const handleAsignarExistente = async (usuarioId: string) => {
    if (!assignStoreSlug || !usuarioId) return;
    setAsignandoExistente(true);
    const { error } = await supabase.from('stores').update({ user_id: usuarioId }).eq('slug', assignStoreSlug);
    setAsignandoExistente(false);
    if (error) { alert('No se pudo asignar: ' + error.message); return; }
    setStoreOwners((prev) => ({ ...prev, [assignStoreSlug]: usuarioId }));
    setAssignStoreSlug(null);
  };


  // Ademas de mandar/copiar el link, si se eligio tienda le asigna el user_id
  // ya mismo: generateLink (con la service_role key, solo en /api) resuelve o
  // crea la cuenta y devuelve su id de una, sin esperar a que la persona
  // toque el link. Antes esto quedaba pendiente ("vuelve a mano despues").
  const asignarTiendaInvitada = async (userId: string | null | undefined) => {
    if (!userId || inviteRole !== 'store_admin' || !inviteStore) return;
    const { error } = await supabase.from('stores').update({ user_id: userId }).eq('slug', inviteStore);
    if (error) { alert(`Se invitó, pero no se pudo asignar la tienda: ${error.message}`); return; }
    setStoreOwners(prev => ({ ...prev, [inviteStore]: userId }));
  };

  // Manda un link de acceso real por correo (magic link: si el correo no
  // tiene cuenta, Supabase la crea sola al tocarlo).
  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setIsSendingInvite(true);
    const redirectTo = `${window.location.origin}${inviteRole === 'super_admin' ? '/superadmin' : '/admin'}`;
    const { error } = await supabase.auth.signInWithOtp({ email: inviteEmail, options: { emailRedirectTo: redirectTo } });
    if (error) {
      setIsSendingInvite(false);
      alert('No se pudo enviar la invitación: ' + error.message);
      return;
    }
    // signInWithOtp no devuelve el id del usuario (a proposito, para no poder
    // enumerar correos desde el cliente): se resuelve aparte por /api con la
    // service_role key, solo para asignar la tienda ya mismo.
    if (inviteRole === 'store_admin' && inviteStore) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/generate-invite-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ email: inviteEmail, redirectTo }),
        });
        const data = await res.json();
        if (res.ok) await asignarTiendaInvitada(data.userId);
      } catch { /* la invitacion ya se mando; la asignacion se puede hacer a mano despues */ }
    }
    setIsSendingInvite(false);
    setInviteSent(true);
    setTimeout(() => {
      setInviteEmail(''); setInviteStore(''); setInviteRole('store_admin'); setInviteSent(false);
    }, 2600);
  };

  // Alternativa a mandar el correo: genera el mismo link de acceso y lo
  // copia, para poder mandarlo vos por WhatsApp. Pasa por /api porque hace
  // falta la service_role key, que nunca debe tocar el navegador.
  const handleCopyInviteLink = async (linkType: 'login' | 'password' = 'login') => {
    if (!inviteEmail) return;
    setIsCopyingLink(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // 'login': entra directo, sin contraseña. 'password': cae en
      // /reset-password para que la persona elija su propia contraseña (y
      // de ahi en mas pueda entrar por /login con correo + clave, sin
      // depender de un link nuevo cada vez).
      const redirectTo = linkType === 'password'
        ? `${window.location.origin}/reset-password`
        : `${window.location.origin}${inviteRole === 'super_admin' ? '/superadmin' : '/admin'}`;
      const res = await fetch('/api/generate-invite-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: inviteEmail, redirectTo, linkType }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'No se pudo generar el link'); return; }
      await asignarTiendaInvitada(data.userId);
      await navigator.clipboard.writeText(data.link);
      alert(linkType === 'password'
        ? 'Link copiado — al tocarlo va a poder crear su propia contraseña.'
        : 'Link copiado — mándalo por WhatsApp o donde prefieras.');
    } catch (err: any) {
      alert('No se pudo copiar el link: ' + err.message);
    } finally {
      setIsCopyingLink(false);
    }
  };

  // Abre el panel de Usuarios (no el modal de una tienda puntual) precargando
  // TODAS las tiendas que esta persona ya administra, para el checklist de
  // "Tiendas Asignadas".
  const abrirEditorUsuarioMulti = (u: UserRow) => {
    // Fuerza 'store_admin' aca: esto solo edita que tiendas administra, no el
    // rol — si dejara 'super_admin' (la fila del superadmin mismo), el guard
    // de handleSaveUser bloquearia el guardado por completo.
    setEditingUser({ ...u, role: 'store_admin' });
    setEditingUserOriginalStore(u.store);
    setEditingUserStores(new Set(
      Object.entries(storeOwners).filter(([, id]) => id === u.id).map(([slug]) => slug)
    ));
    setInviteSent(false);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (editingUser.role === 'super_admin') {
      alert(
        'El acceso de Super Admin sale de la función is_superadmin() en la base de datos, no de esta tabla.\n\n' +
        'Para dar acceso total a otra persona hay que editar esa función en el SQL editor de Supabase — avísame y lo hago.'
      );
      return;
    }
    await supabase.from('profiles').update({ name: editingUser.name }).eq('id', editingUser.id);

    if (assignStoreSlug) {
      // Modal de "administrador de esta tienda puntual": una sola, como siempre.
      if (editingUserOriginalStore && editingUserOriginalStore !== editingUser.store) {
        await supabase.from('stores').update({ user_id: null }).eq('slug', editingUserOriginalStore);
      }
      if (editingUser.store) {
        const { error } = await supabase.from('stores').update({ user_id: editingUser.id }).eq('slug', editingUser.store);
        if (error) { alert('No se pudo guardar: ' + error.message); return; }
      }
      setStoreOwners(prev => {
        const next = { ...prev };
        if (editingUserOriginalStore) next[editingUserOriginalStore] = null;
        if (editingUser.store) next[editingUser.store] = editingUser.id;
        return next;
      });
    } else {
      // Panel de Usuarios: puede quedar administrando varias tiendas a la vez.
      const actuales = new Set(
        Object.entries(storeOwners).filter(([, id]) => id === editingUser.id).map(([slug]) => slug)
      );
      const aAsignar = [...editingUserStores].filter((slug) => !actuales.has(slug));
      const aQuitar = [...actuales].filter((slug) => !editingUserStores.has(slug));
      for (const slug of aAsignar) {
        const { error } = await supabase.from('stores').update({ user_id: editingUser.id }).eq('slug', slug);
        if (error) { alert(`No se pudo asignar "${stores[slug]?.name || slug}": ${error.message}`); return; }
      }
      for (const slug of aQuitar) {
        const { error } = await supabase.from('stores').update({ user_id: null }).eq('slug', slug);
        if (error) { alert(`No se pudo quitar "${stores[slug]?.name || slug}": ${error.message}`); return; }
      }
      setStoreOwners(prev => {
        const next = { ...prev };
        aAsignar.forEach((slug) => { next[slug] = editingUser.id; });
        aQuitar.forEach((slug) => { next[slug] = null; });
        return next;
      });
    }

    setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, name: editingUser.name } : p));
    setEditingUser(null);
  };

  // "Revocar" acá significa quitarle la tienda asignada — no se puede borrar
  // la cuenta de auth.users desde el navegador sin la service_role key.
  const handleRevokeAccess = async (u: UserRow) => {
    if (u.role === 'super_admin') {
      alert('El acceso de Super Admin sale de is_superadmin() en la base de datos, no se puede revocar desde acá.');
      return;
    }
    if (!confirm(`¿Quitarle a ${u.email} el acceso a "${stores[u.store]?.name || u.store}"?`)) return;
    const { error } = await supabase.from('stores').update({ user_id: null }).eq('slug', u.store);
    if (error) { alert('No se pudo revocar: ' + error.message); return; }
    setStoreOwners(prev => ({ ...prev, [u.store]: null }));
    if (editingUser?.id === u.id) setEditingUser(null);
  };

  // Los campos de invitación se usan en dos lados: el panel de la pestaña
  // Usuarios y el modal que se abre desde Gestión de Tiendas. La única
  // diferencia real es que el panel deja elegir rol y tienda, y el modal ya
  // sabe de qué tienda se trata. Es una función y no un componente a propósito:
  // así el JSX queda inline y el input no pierde el foco al re-renderizar.
  const camposInvitacion = (conSelectores: boolean) => {
    const faltaTienda = conSelectores && inviteRole === 'store_admin' && !inviteStore;
    return (
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Correo Electrónico</label>
          <input
            type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="admin@sutienda.com"
            className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] focus:bg-white transition-colors"
          />
        </div>
        {conSelectores && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Rol</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                <option value="store_admin">Admin de Tienda</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            {inviteRole === 'store_admin' && (
              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Asignar Comercio</label>
                <select value={inviteStore} onChange={(e) => setInviteStore(e.target.value)}
                  className="w-full bg-[#f2f3fd] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#0058be] focus:bg-white transition-colors">
                  <option value="">Seleccionar tienda...</option>
                  {Object.values(stores).map(s => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <div className={`flex gap-2 ${conSelectores ? 'mt-2' : ''}`}>
          <button
            onClick={handleSendInvite}
            disabled={isSendingInvite || !inviteEmail || faltaTienda}
            className="flex-1 py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSendingInvite ? 'animate-spin' : ''}`}>{isSendingInvite ? 'progress_activity' : 'send'}</span>
            {isSendingInvite ? 'Enviando...' : 'Enviar por correo'}
          </button>
          <button
            onClick={() => handleCopyInviteLink('login')}
            disabled={isCopyingLink || !inviteEmail || faltaTienda}
            title="Copiar link de acceso directo, sin contraseña (para mandar por WhatsApp)"
            className="w-11 shrink-0 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs flex items-center justify-center hover:bg-[#e6e7f2] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${isCopyingLink ? 'animate-spin' : ''}`}>{isCopyingLink ? 'progress_activity' : 'content_copy'}</span>
          </button>
          <button
            onClick={() => handleCopyInviteLink('password')}
            disabled={isCopyingLink || !inviteEmail || faltaTienda}
            title="Copiar link para que elija su propia contraseña (para mandar por WhatsApp)"
            className="w-11 shrink-0 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs flex items-center justify-center hover:bg-[#e6e7f2] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-[16px] ${isCopyingLink ? 'animate-spin' : ''}`}>{isCopyingLink ? 'progress_activity' : 'key'}</span>
          </button>
        </div>
      </div>
    );
  };

  // Mismo aviso de "ya salió el link" para los dos lados; cambia el texto y, en
  // el modal, un botón para cerrarlo.
  const avisoInvitacionEnviada = (mensaje: string, alCerrar?: () => void) => (
    <div className="p-6 text-center">
      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
        <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
      </div>
      <h3 className="text-sm font-bold text-[#191b23] mb-1">¡Link enviado!</h3>
      <p className="text-xs text-[#424754] font-semibold">{mensaje}</p>
      {alCerrar && (
        <button
          onClick={alCerrar}
          className="mt-4 w-full py-2 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors"
        >
          Cerrar
        </button>
      )}
    </div>
  );

  return {
    profiles, setProfiles, storeOwners, setStoreOwners, inviteEmail, setInviteEmail, inviteStore, setInviteStore, inviteRole, setInviteRole, inviteSent, setInviteSent, isSendingInvite, setIsSendingInvite, editingUser, setEditingUser, editingUserOriginalStore, setEditingUserOriginalStore, editingUserStores, setEditingUserStores, isCopyingLink, setIsCopyingLink, assignStoreSlug, setAssignStoreSlug, derivedUsers, groupedUsers, expandedUserIds, setExpandedUserIds, toggleExpandedUser, usuariosSinTienda, asignandoExistente, setAsignandoExistente, handleAsignarExistente, asignarTiendaInvitada, handleSendInvite, handleCopyInviteLink, abrirEditorUsuarioMulti, handleSaveUser, handleRevokeAccess, camposInvitacion, avisoInvitacionEnviada,
  };
}
