'use client';

// Panel de Alquileres ("Dónde quedarte") — subruta propia, guard con
// useEsSuperadmin() como /superadmin/choferes.
//
//   - rental_listings (el directorio de /alquileres): crear, editar, ocultar, borrar.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';

const VERDE = '#00875A';
const TIPOS = ['Habitación', 'Mini-dpto', 'Casa', 'Pensión'];

type ListingRow = Record<string, any>;

const FICHA_VACIA = {
  id: null as string | null,
  tipo: 'Habitación', titulo: '', zona: '', precio: '',
  extras: '["Baño propio", "Wifi"]',
  incluye_servicios: false, incluye_comidas: false, verificado: false,
  wsp: '', img: '', ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type Ficha = typeof FICHA_VACIA;

export default function AlquileresAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase
      .from('rental_listings')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setListings(data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/alquileres');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (cargando) return <div className="p-10 text-center text-secondary font-body-md">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const editar = (a: ListingRow) => {
    setFicha({
      id: a.id, tipo: a.tipo ?? 'Habitación', titulo: a.titulo ?? '', zona: a.zona ?? '',
      precio: a.precio ?? '',
      extras: JSON.stringify(a.extras ?? [], null, 2),
      incluye_servicios: Boolean(a.incluye_servicios), incluye_comidas: Boolean(a.incluye_comidas),
      verificado: Boolean(a.verificado), wsp: a.wsp ?? '', img: a.img ?? '',
      ciudad: a.ciudad ?? 'pucallpa', orden: a.orden ?? 0, status: a.status ?? 'activo',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMsg('');
    let extras: unknown = [];
    try { extras = JSON.parse(ficha.extras || '[]'); }
    catch { setGuardando(false); setMsg('El campo "extras" no es JSON válido.'); return; }

    const payload = {
      tipo: ficha.tipo, titulo: ficha.titulo, zona: ficha.zona || null,
      precio: Number(ficha.precio) || 0, extras,
      incluye_servicios: ficha.incluye_servicios, incluye_comidas: ficha.incluye_comidas,
      verificado: ficha.verificado, wsp: ficha.wsp || null, img: ficha.img || null,
      ciudad: ficha.ciudad, orden: Number(ficha.orden) || 0, status: ficha.status,
    };

    const res = ficha.id
      ? await supabase.from('rental_listings').update(payload).eq('id', ficha.id)
      : await supabase.from('rental_listings').insert(payload);

    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    setFicha(FICHA_VACIA);
    setMsg(ficha.id ? 'Aviso actualizado.' : 'Aviso agregado.');
    recargar();
  };

  const toggleStatus = async (a: ListingRow) => {
    await supabase.from('rental_listings').update({ status: a.status === 'activo' ? 'oculto' : 'activo' }).eq('id', a.id);
    recargar();
  };

  const borrar = async (a: ListingRow) => {
    if (!confirm(`¿Borrar el aviso "${a.titulo}"? No se puede deshacer.`)) return;
    await supabase.from('rental_listings').delete().eq('id', a.id);
    recargar();
  };

  const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';

  return (
    <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="min-h-screen bg-background text-on-background font-body-md">
      <header className="border-b border-surface-container-highest bg-surface">
        <div className="max-w-[900px] mx-auto px-container-margin py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/superadmin" className="text-secondary hover:text-primary text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Superadmin
            </Link>
            <span className="text-secondary">/</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Alquileres · Dónde quedarte</span>
          </div>
          <Link href="/alquileres" className="text-sm text-primary">Ver la página →</Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-10">

        {/* Formulario ficha */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">
            {ficha.id ? 'Editar aviso' : 'Agregar aviso'}
          </h2>
          <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5">
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Título
              <input required value={ficha.titulo} onChange={(e) => setFicha({ ...ficha, titulo: e.target.value })} className={campo} placeholder="Habitación amoblada con baño propio" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tipo
              <select value={ficha.tipo} onChange={(e) => setFicha({ ...ficha, tipo: e.target.value })} className={campo}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Zona
              <input value={ficha.zona} onChange={(e) => setFicha({ ...ficha, zona: e.target.value })} className={campo} placeholder="Callería" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio (S/ al mes)
              <input type="number" min="0" step="0.01" value={ficha.precio} onChange={(e) => setFicha({ ...ficha, precio: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp (E.164 sin +)
              <input value={ficha.wsp} onChange={(e) => setFicha({ ...ficha, wsp: e.target.value })} className={campo} placeholder="51963000001" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Foto (URL)
              <input value={ficha.img} onChange={(e) => setFicha({ ...ficha, img: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
              <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
              <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Extras (JSON: lista de textos)
              <textarea value={ficha.extras} onChange={(e) => setFicha({ ...ficha, extras: e.target.value })} rows={4} className={`${campo} font-mono text-xs`} /></label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <input type="checkbox" checked={ficha.incluye_servicios} onChange={(e) => setFicha({ ...ficha, incluye_servicios: e.target.checked })} />
                Incluye servicios
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <input type="checkbox" checked={ficha.incluye_comidas} onChange={(e) => setFicha({ ...ficha, incluye_comidas: e.target.checked })} />
                Incluye comidas
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <input type="checkbox" checked={ficha.verificado} onChange={(e) => setFicha({ ...ficha, verificado: e.target.checked })} />
                Verificado
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
              <select value={ficha.status} onChange={(e) => setFicha({ ...ficha, status: e.target.value })} className={campo}>
                <option value="activo">Activo (visible)</option>
                <option value="oculto">Oculto</option></select></label>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Agregar aviso'}
              </button>
              {ficha.id && (
                <button type="button" onClick={() => { setFicha(FICHA_VACIA); setMsg(''); }} className="text-sm text-secondary underline">
                  Cancelar edición
                </button>
              )}
              {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
            </div>
          </form>
        </section>

        {/* Directorio */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">Directorio ({listings.length})</h2>
          {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
            listings.length === 0 ? <p className="text-secondary text-sm">Todavía no hay avisos en la tabla. La página usa el seed hardcodeado hasta que agregues al menos uno.</p> : (
            <div className="flex flex-col gap-2">
              {listings.map((a) => (
                <div key={a.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">{a.titulo} <span className="text-secondary font-normal">· {a.tipo} · {a.ciudad}</span></p>
                    <p className="text-xs text-secondary">{[a.zona, `S/ ${a.precio}/mes`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => editar(a)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatus(a)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {a.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrar(a)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
