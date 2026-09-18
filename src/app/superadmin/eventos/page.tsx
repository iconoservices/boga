'use client';

// Panel de Eventos (agenda de Pucallpa) — subruta propia, guard con
// useEsSuperadmin() como /superadmin/alquileres.
//
//   - events (la agenda de /eventos): crear, editar, ocultar, borrar.
//   - places ("¿A dónde ir en Pucallpa?", misma página pública): idem.

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
  titulo: '', categoria: 'Fiestas', descripcion: '', lugar: '', dia: '', mes: 'SEP', fecha: '',
  precio: 'Libre', organiza: '', img: '', destacado: false,
  ciudad: 'pucallpa', orden: 0, status: 'activo',
  reservable: false, aforo: '' as string | number,
};
type Ficha = typeof FICHA_VACIA;

type PlaceRow = Record<string, any>;
const FICHA_LUGAR_VACIA = {
  id: null as string | null,
  nombre: '', tag: '', descripcion: '', img: '', ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type FichaLugar = typeof FICHA_LUGAR_VACIA;

export default function EventosAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [eventos, setEventos] = useState<EventRow[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const [lugares, setLugares] = useState<PlaceRow[]>([]);
  const [cargandoLugares, setCargandoLugares] = useState(true);
  const [fichaLugar, setFichaLugar] = useState<FichaLugar>(FICHA_LUGAR_VACIA);
  const [guardandoLugar, setGuardandoLugar] = useState(false);
  const [msgLugar, setMsgLugar] = useState('');

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

  const recargarLugares = useCallback(async () => {
    setCargandoLugares(true);
    const { data } = await supabase
      .from('places')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setLugares(data ?? []);
    setCargandoLugares(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/eventos');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) { recargar(); recargarLugares(); } }, [esSuperadmin, recargar, recargarLugares]);

  if (cargando) return <div className="p-10 text-center text-secondary font-body-md">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const editar = (e: EventRow) => {
    setFicha({
      id: e.id, titulo: e.titulo ?? '', categoria: e.categoria ?? 'Fiestas', descripcion: e.descripcion ?? '',
      lugar: e.lugar ?? '',
      dia: e.dia ?? '', mes: e.mes ?? 'SEP', fecha: e.fecha ?? '', precio: e.precio ?? 'Libre', organiza: e.organiza ?? '',
      img: e.img ?? '', destacado: Boolean(e.destacado),
      ciudad: e.ciudad ?? 'pucallpa', orden: e.orden ?? 0, status: e.status ?? 'activo',
      reservable: Boolean(e.reservable), aforo: e.aforo ?? '',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true);
    setMsg('');

    const payload = {
      titulo: ficha.titulo, categoria: ficha.categoria, descripcion: ficha.descripcion || null,
      lugar: ficha.lugar || null,
      dia: ficha.dia || null, mes: ficha.mes || null, fecha: ficha.fecha || null, precio: ficha.precio || null,
      organiza: ficha.organiza || null, img: ficha.img || null, destacado: ficha.destacado,
      ciudad: ficha.ciudad, orden: Number(ficha.orden) || 0, status: ficha.status,
      reservable: ficha.reservable, aforo: ficha.aforo === '' ? null : Number(ficha.aforo),
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

  const editarLugar = (l: PlaceRow) => {
    setFichaLugar({
      id: l.id, nombre: l.nombre ?? '', tag: l.tag ?? '', descripcion: l.descripcion ?? '', img: l.img ?? '',
      ciudad: l.ciudad ?? 'pucallpa', orden: l.orden ?? 0, status: l.status ?? 'activo',
    });
    setMsgLugar('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardarLugar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardandoLugar(true);
    setMsgLugar('');

    const payload = {
      nombre: fichaLugar.nombre, tag: fichaLugar.tag || null, descripcion: fichaLugar.descripcion || null,
      img: fichaLugar.img || null,
      ciudad: fichaLugar.ciudad, orden: Number(fichaLugar.orden) || 0, status: fichaLugar.status,
    };

    const res = fichaLugar.id
      ? await supabase.from('places').update(payload).eq('id', fichaLugar.id)
      : await supabase.from('places').insert(payload);

    setGuardandoLugar(false);
    if (res.error) { setMsgLugar(`Error: ${res.error.message}`); return; }
    setFichaLugar(FICHA_LUGAR_VACIA);
    setMsgLugar(fichaLugar.id ? 'Lugar actualizado.' : 'Lugar agregado.');
    recargarLugares();
  };

  const toggleStatusLugar = async (l: PlaceRow) => {
    await supabase.from('places').update({ status: l.status === 'activo' ? 'oculto' : 'activo' }).eq('id', l.id);
    recargarLugares();
  };

  const borrarLugar = async (l: PlaceRow) => {
    if (!confirm(`¿Borrar el lugar "${l.nombre}"? No se puede deshacer.`)) return;
    await supabase.from('places').delete().eq('id', l.id);
    recargarLugares();
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
          <div className="flex items-center gap-4">
            <Link href="/eventos/validar" className="text-sm text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span> Validar entradas
            </Link>
            <Link href="/eventos" className="text-sm text-primary">Ver la página →</Link>
          </div>
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
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Fecha real (con año)
              <input
                type="date"
                value={ficha.fecha}
                onChange={(e) => {
                  const f = e.target.value;
                  if (!f) { setFicha({ ...ficha, fecha: '' }); return; }
                  const d = new Date(f + 'T00:00:00');
                  setFicha({ ...ficha, fecha: f, dia: String(d.getDate()), mes: MESES[d.getMonth()] });
                }}
                className={campo}
              /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Día (número)
              <input value={ficha.dia} onChange={(e) => setFicha({ ...ficha, dia: e.target.value })} className={campo} placeholder="12" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Mes
              <select value={ficha.mes} onChange={(e) => setFicha({ ...ficha, mes: e.target.value })} className={campo}>
                {MESES.map((m) => <option key={m}>{m}</option>)}</select></label>
            <p className="text-[9px] text-secondary/70 font-semibold sm:col-span-2 -mt-2">
              La fecha real oculta el evento solo después de pasar. Si la dejás vacía, no se oculta automático — lo tenés que hacer a mano con "Estado".
            </p>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio
              <input value={ficha.precio} onChange={(e) => setFicha({ ...ficha, precio: e.target.value })} className={campo} placeholder="S/ 30 o Libre" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Organiza
              <input value={ficha.organiza} onChange={(e) => setFicha({ ...ficha, organiza: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Descripción (para la ficha ampliada)
              <textarea value={ficha.descripcion} onChange={(e) => setFicha({ ...ficha, descripcion: e.target.value })} rows={4} className={campo} placeholder="Detalle del evento: qué incluye, horarios, cómo llegar…" /></label>
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
              <label className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <input type="checkbox" checked={ficha.reservable} onChange={(e) => setFicha({ ...ficha, reservable: e.target.checked })} />
                Reservable (muestra botón "Reservar" con QR)
              </label>
            </div>
            {ficha.reservable && (
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Aforo (dejar vacío = sin límite)
                <input type="number" min="0" value={ficha.aforo} onChange={(e) => setFicha({ ...ficha, aforo: e.target.value })} className={campo} placeholder="Ej. 200" /></label>
            )}
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
              {eventos.map((e) => {
                const vencido = e.fecha && e.fecha < new Date().toISOString().slice(0, 10);
                return (
                <div key={e.id} className={`bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3 ${vencido ? 'opacity-60' : ''}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${e.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">
                      {e.titulo} <span className="text-secondary font-normal">· {e.categoria} · {e.ciudad}</span>
                      {vencido && <span className="ml-1.5 bg-red-100 text-red-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle">Vencido</span>}
                      {e.reservable && <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle">Reservable{e.aforo ? ` · aforo ${e.aforo}` : ''}</span>}
                    </p>
                    <p className="text-xs text-secondary">{[e.lugar, `${e.dia} ${e.mes}`, e.precio].filter(Boolean).join(' · ')}{e.destacado ? ' · ⭐ destacado' : ''}</p>
                  </div>
                  <button onClick={() => editar(e)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatus(e)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {e.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrar(e)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
                </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Formulario lugar */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-1">
            {fichaLugar.id ? 'Editar lugar' : 'Agregar lugar'} — "¿A dónde ir en Pucallpa?"
          </h2>
          <p className="text-[11px] text-secondary/80 font-semibold mb-3">
            Destinos permanentes sin fecha (una laguna, un parque…) — no confundir con Eventos, que sí tienen fecha y desaparecen solos cuando pasan.
          </p>
          <form onSubmit={guardarLugar} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5">
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Nombre
              <input required value={fichaLugar.nombre} onChange={(e) => setFichaLugar({ ...fichaLugar, nombre: e.target.value })} className={campo} placeholder="Laguna de Yarinacocha" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tag (categoría · duración)
              <input value={fichaLugar.tag} onChange={(e) => setFichaLugar({ ...fichaLugar, tag: e.target.value })} className={campo} placeholder="Naturaleza · medio día" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Descripción (para la ficha ampliada)
              <textarea value={fichaLugar.descripcion} onChange={(e) => setFichaLugar({ ...fichaLugar, descripcion: e.target.value })} rows={4} className={campo} placeholder="Qué es, por qué visitarlo, cómo llegar…" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
              <select value={fichaLugar.ciudad} onChange={(e) => setFichaLugar({ ...fichaLugar, ciudad: e.target.value })} className={campo}>
                {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Foto (URL)
              <input value={fichaLugar.img} onChange={(e) => setFichaLugar({ ...fichaLugar, img: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
              <input type="number" value={fichaLugar.orden} onChange={(e) => setFichaLugar({ ...fichaLugar, orden: Number(e.target.value) })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
              <select value={fichaLugar.status} onChange={(e) => setFichaLugar({ ...fichaLugar, status: e.target.value })} className={campo}>
                <option value="activo">Activo (visible)</option>
                <option value="oculto">Oculto</option></select></label>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardandoLugar} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {guardandoLugar ? 'Guardando…' : fichaLugar.id ? 'Guardar cambios' : 'Agregar lugar'}
              </button>
              {fichaLugar.id && (
                <button type="button" onClick={() => { setFichaLugar(FICHA_LUGAR_VACIA); setMsgLugar(''); }} className="text-sm text-secondary underline">
                  Cancelar edición
                </button>
              )}
              {msgLugar && <span className="text-xs font-bold text-primary">{msgLugar}</span>}
            </div>
          </form>
        </section>

        {/* Lista de lugares */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">Lugares ({lugares.length})</h2>
          {cargandoLugares ? <p className="text-secondary text-sm">Cargando…</p> :
            lugares.length === 0 ? <p className="text-secondary text-sm">Todavía no hay lugares en la tabla. La página usa el seed hardcodeado hasta que agregues al menos uno.</p> : (
            <div className="flex flex-col gap-2">
              {lugares.map((l) => (
                <div key={l.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${l.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">{l.nombre} <span className="text-secondary font-normal">· {l.ciudad}</span></p>
                    <p className="text-xs text-secondary">{l.tag}</p>
                  </div>
                  <button onClick={() => editarLugar(l)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatusLugar(l)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {l.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrarLugar(l)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
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
