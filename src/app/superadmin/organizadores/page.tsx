'use client';

// Organizadores (discotecas / productoras): cada uno tiene su espacio publico
// en /org/<slug>. Fase 1: alta, edicion, ocultar y borrar. Ligar eventos,
// PINs de staff y promotores vienen despues (ver memoria eventos-ticketing).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import { uploadFile } from '@/lib/uploadClient';
import { CIUDADES } from '@/lib/ciudades';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
import SuperadminSubheader from '@/components/SuperadminSubheader';

type OrgRow = Record<string, any>;

const FICHA_VACIA = {
  id: null as string | null,
  slug: '', nombre: '', tagline: '', color: '#d4af37', logo: '',
  ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type Ficha = typeof FICHA_VACIA;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 40);

export default function OrganizadoresAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase
      .from('organizers')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setOrgs(data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/organizadores');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const editar = (o: OrgRow) => {
    setFicha({
      id: o.id, slug: o.slug ?? '', nombre: o.nombre ?? '', tagline: o.tagline ?? '',
      color: o.color ?? '#d4af37', logo: o.logo ?? '', ciudad: o.ciudad ?? 'pucallpa',
      orden: o.orden ?? 0, status: o.status ?? 'activo',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const subirLogo = async (file: File) => {
    setSubiendo(true);
    try {
      const url = await uploadFile(file, 'organizers');
      setFicha((f) => ({ ...f, logo: url }));
    } catch (err: any) {
      setMsg(`No se pudo subir el logo: ${err.message}`);
    }
    setSubiendo(false);
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true);
    setMsg('');

    const payload = {
      slug: ficha.slug, nombre: ficha.nombre, tagline: ficha.tagline || null,
      color: ficha.color, logo: ficha.logo || null, ciudad: ficha.ciudad,
      orden: Number(ficha.orden) || 0, status: ficha.status,
    };

    const res = ficha.id
      ? await supabase.from('organizers').update(payload).eq('id', ficha.id)
      : await supabase.from('organizers').insert(payload);

    setGuardando(false);
    if (res.error) {
      setMsg(res.error.code === '23505' ? 'Ese slug ya existe, elige otro.' : `Error: ${res.error.message}`);
      return;
    }
    setFicha(FICHA_VACIA);
    setMsg(ficha.id ? 'Organizador actualizado.' : 'Organizador agregado.');
    recargar();
  };

  const toggleStatus = async (o: OrgRow) => {
    await supabase.from('organizers').update({ status: o.status === 'activo' ? 'oculto' : 'activo' }).eq('id', o.id);
    recargar();
  };

  const borrar = async (o: OrgRow) => {
    if (!confirm(`¿Borrar "${o.nombre}"? No se puede deshacer.`)) return;
    await supabase.from('organizers').delete().eq('id', o.id);
    recargar();
  };

  const campo = 'w-full bg-white border border-[#c2c6d6] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0058be]';

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>
      <div className="flex-1 min-w-0">
        <SuperadminSubheader title="Organizadores · Discotecas" icon="nightlife" />
        <main className="max-w-[900px] mx-auto px-4 py-8 flex flex-col gap-8">

          <section>
            <h2 className="font-bold text-lg mb-1">{ficha.id ? 'Editar organizador' : 'Agregar organizador'}</h2>
            <p className="text-[11px] text-[#424754] mb-3">
              Cada organizador tiene su espacio público en <span className="font-mono">/org/&lt;slug&gt;</span>.
            </p>
            <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white border border-[#c2c6d6] rounded-2xl p-5">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754]">Nombre
                <input
                  required value={ficha.nombre} className={campo} placeholder="Elite"
                  onChange={(e) => setFicha({ ...ficha, nombre: e.target.value, slug: ficha.id ? ficha.slug : slugify(e.target.value) })}
                /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754]">Slug (/org/…)
                <input required value={ficha.slug} onChange={(e) => setFicha({ ...ficha, slug: slugify(e.target.value) })} className={`${campo} font-mono`} placeholder="elite" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754] sm:col-span-2">Descripción corta
                <input value={ficha.tagline} onChange={(e) => setFicha({ ...ficha, tagline: e.target.value })} className={campo} placeholder="Discoteca · Av. San Martín, Pucallpa" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754]">Color de acento
                <div className="flex items-center gap-2">
                  <input type="color" value={ficha.color} onChange={(e) => setFicha({ ...ficha, color: e.target.value })} className="h-9 w-12 rounded border border-[#c2c6d6]" />
                  <input value={ficha.color} onChange={(e) => setFicha({ ...ficha, color: e.target.value })} className={`${campo} font-mono`} />
                </div></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754]">Ciudad
                <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                  {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
              <div className="flex flex-col gap-1 text-xs font-bold text-[#424754] sm:col-span-2">Logo
                <div className="flex items-center gap-3">
                  {ficha.logo
                    ? <img src={ficha.logo} alt="" className="w-14 h-14 rounded-full object-cover border border-[#c2c6d6]" />
                    : <span className="w-14 h-14 rounded-full border border-dashed border-[#c2c6d6] flex items-center justify-center text-[#c2c6d6] material-symbols-outlined">image</span>}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && subirLogo(e.target.files[0])} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo} className="text-xs font-bold px-3 py-2 rounded-lg border border-[#c2c6d6] disabled:opacity-60">
                    {subiendo ? 'Subiendo…' : 'Subir logo'}
                  </button>
                  <input value={ficha.logo} onChange={(e) => setFicha({ ...ficha, logo: e.target.value })} className={campo} placeholder="…o pega una URL" />
                </div></div>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754]">Orden (menor = primero)
                <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#424754]">Estado
                <select value={ficha.status} onChange={(e) => setFicha({ ...ficha, status: e.target.value })} className={campo}>
                  <option value="activo">Activo (visible)</option>
                  <option value="oculto">Oculto</option></select></label>
              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <button type="submit" disabled={guardando} className="bg-[#0058be] text-white font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                  {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Agregar organizador'}
                </button>
                {ficha.id && (
                  <button type="button" onClick={() => { setFicha(FICHA_VACIA); setMsg(''); }} className="text-sm text-[#424754] underline">
                    Cancelar edición
                  </button>
                )}
                {msg && <span className="text-xs font-bold text-[#0058be]">{msg}</span>}
              </div>
            </form>
          </section>

          <section>
            <h2 className="font-bold text-lg mb-3">Organizadores ({orgs.length})</h2>
            {cargandoDatos ? <p className="text-sm text-[#424754]">Cargando…</p> :
              orgs.length === 0 ? <p className="text-sm text-[#424754]">Todavía no hay organizadores.</p> : (
              <div className="flex flex-col gap-2">
                {orgs.map((o) => (
                  <div key={o.id} className="bg-white border border-[#c2c6d6] rounded-xl p-3 flex flex-wrap items-center gap-3">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border-2 shrink-0 overflow-hidden"
                      style={{ borderColor: o.color, color: o.color }}>
                      {o.logo ? <img src={o.logo} alt="" className="w-full h-full object-cover" /> : (o.nombre ?? '?').slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-bold text-sm">
                        {o.nombre} <span className="text-[#424754] font-normal">· {o.ciudad}</span>
                        {o.status !== 'activo' && <span className="ml-1.5 bg-neutral-200 text-neutral-600 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full align-middle">Oculto</span>}
                      </p>
                      <p className="text-xs text-[#424754]"><span className="font-mono">/org/{o.slug}</span>{o.tagline ? ` · ${o.tagline}` : ''}</p>
                    </div>
                    <a href={`/org/${o.slug}`} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c2c6d6]">Ver</a>
                    <button onClick={() => editar(o)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c2c6d6]">Editar</button>
                    <button onClick={() => toggleStatus(o)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c2c6d6] text-[#424754]">
                      {o.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button onClick={() => borrar(o)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
