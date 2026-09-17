'use client';

// Panel de Eventos (agenda de Pucallpa) — subruta propia, guard con
// useEsSuperadmin() como /superadmin/alquileres.
//
//   - events (la agenda de /eventos): crear, editar, ocultar, borrar.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

const VERDE = '#00875A';
const CATEGORIAS = [
  'Conciertos', 'Arte & Cultura', 'Ferias', 'Deporte',
  'Cine', 'Cursos y talleres', 'Comidas & Bebidas', 'Familia', 'Fiestas',
];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

type EventRow = Record<string, any>;

const FICHA_VACIA = {
  id: null as string | null,
  titulo: '', categoria: 'Fiestas', lugar: '', dia: '', mes: 'SEP',
  precio: 'Libre', organiza: '', img: '', destacado: false,
  ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type Ficha = typeof FICHA_VACIA;

export default function EventosAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [eventos, setEventos] = useState<EventRow[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setEventos(data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/eventos');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (cargando) return <div className="p-10 text-center text-secondary font-body-md">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const editar = (e: EventRow) => {
    setFicha({
      id: e.id, titulo: e.titulo ?? '', categoria: e.categoria ?? 'Fiestas', lugar: e.lugar ?? '',
      dia: e.dia ?? '', mes: e.mes ?? 'SEP', precio: e.precio ?? 'Libre', organiza: e.organiza ?? '',
      img: e.img ?? '', destacado: Boolean(e.destacado),
      ciudad: e.ciudad ?? 'pucallpa', orden: e.orden ?? 0, status: e.status ?? 'activo',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true);
    setMsg('');

    const payload = {
      titulo: ficha.titulo, categoria: ficha.categoria, lugar: ficha.lugar || null,
      dia: ficha.dia || null, mes: ficha.mes || null, precio: ficha.precio || null,
      organiza: ficha.organiza || null, img: ficha.img || null, destacado: ficha.destacado,
      ciudad: ficha.ciudad, orden: Number(ficha.orden) || 0, status: ficha.status,
    };

    const res = ficha.id
      ? await supabase.from('events').update(payload).eq('id', ficha.id)
      : await supabase.from('events').insert(payload);

    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    setFicha(FICHA_VACIA);
    setMsg(ficha.id ? 'Evento actualizado.' : 'Evento agregado.');
    recargar();
  };

  const toggleStatus = async (e: EventRow) => {
    await supabase.from('events').update({ status: e.status === 'activo' ? 'oculto' : 'activo' }).eq('id', e.id);
    recargar();
  };

  const borrar = async (e: EventRow) => {
    if (!confirm(`¿Borrar el evento "${e.titulo}"? No se puede deshacer.`)) return;
    await supabase.from('events').delete().eq('id', e.id);
    recargar();
  };

  const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>
      <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="flex-1 min-w-0 bg-background text-on-background font-body-md">
      <header className="border-b border-surface-container-highest bg-surface">
        <div className="max-w-[900px] mx-auto px-container-margin py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/superadmin" className="text-secondary hover:text-primary text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Superadmin
            </Link>
            <span className="text-secondary">/</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Eventos · Agenda</span>
          </div>
          <Link href="/eventos" className="text-sm text-primary">Ver la página →</Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-10">

        {/* Formulario ficha */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">
            {ficha.id ? 'Editar evento' : 'Agregar evento'}
          </h2>
          <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5">
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Título
              <input required value={ficha.titulo} onChange={(e) => setFicha({ ...ficha, titulo: e.target.value })} className={campo} placeholder="Noche de Cumbia Amazónica" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Categoría
              <select value={ficha.categoria} onChange={(e) => setFicha({ ...ficha, categoria: e.target.value })} className={campo}>
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Lugar
              <input value={ficha.lugar} onChange={(e) => setFicha({ ...ficha, lugar: e.target.value })} className={campo} placeholder="Complejo La Cabaña" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Día (número)
              <input value={ficha.dia} onChange={(e) => setFicha({ ...ficha, dia: e.target.value })} className={campo} placeholder="12" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Mes
              <select value={ficha.mes} onChange={(e) => setFicha({ ...ficha, mes: e.target.value })} className={campo}>
                {MESES.map((m) => <option key={m}>{m}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio
              <input value={ficha.precio} onChange={(e) => setFicha({ ...ficha, precio: e.target.value })} className={campo} placeholder="S/ 30 o Libre" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Organiza
              <input value={ficha.organiza} onChange={(e) => setFicha({ ...ficha, organiza: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Foto (URL)
              <input value={ficha.img} onChange={(e) => setFicha({ ...ficha, img: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
              <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
              <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} /></label>
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <input type="checkbox" checked={ficha.destacado} onChange={(e) => setFicha({ ...ficha, destacado: e.target.checked })} />
                Destacado (aparece en el carrusel de arriba)
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
              <select value={ficha.status} onChange={(e) => setFicha({ ...ficha, status: e.target.value })} className={campo}>
                <option value="activo">Activo (visible)</option>
                <option value="oculto">Oculto</option></select></label>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Agregar evento'}
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

        {/* Agenda */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">Agenda ({eventos.length})</h2>
          {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
            eventos.length === 0 ? <p className="text-secondary text-sm">Todavía no hay eventos en la tabla. La página usa el seed hardcodeado hasta que agregues al menos uno.</p> : (
            <div className="flex flex-col gap-2">
              {eventos.map((e) => (
                <div key={e.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${e.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">{e.titulo} <span className="text-secondary font-normal">· {e.categoria} · {e.ciudad}</span></p>
                    <p className="text-xs text-secondary">{[e.lugar, `${e.dia} ${e.mes}`, e.precio].filter(Boolean).join(' · ')}{e.destacado ? ' · ⭐ destacado' : ''}</p>
                  </div>
                  <button onClick={() => editar(e)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatus(e)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {e.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrar(e)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
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
