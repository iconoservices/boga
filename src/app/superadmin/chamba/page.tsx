'use client';

// Panel de Chamba y oficios — subruta propia, guard con useEsSuperadmin() como
// /superadmin/eventos. Administra dos tablas en UNA lista con filtros:
//   - job_listings   (empleos: puesto, negocio, tipo, zona, pago, WhatsApp)
//   - service_providers (oficios: nombre, oficio, zona, foto, WhatsApp)
// Formularios en ventana flotante, foto subible, buscador y filtros.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { refrescarPublico } from '@/lib/refrescar';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';
import CampoFoto from '@/components/superadmin/CampoFoto';
import { esImagenExterna, mirrorImage } from '@/lib/uploadClient';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

const VERDE = '#00875A';
const TIPOS_EMPLEO = ['Tiempo completo', 'Medio tiempo', 'Turno tarde', 'Turno noche', 'Por día', 'Por horas', 'Temporal'];

type Fila = Record<string, any>;

const EMPLEO_VACIO = {
  id: null as string | null,
  puesto: '', negocio: '', tipo: 'Tiempo completo', zona: '', pago: '', wsp: '', link: '', link_orig: '', img: '', img_orig: '', descripcion: '', descripcion_orig: '', email: '', email_orig: '',
  ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type FichaEmpleo = typeof EMPLEO_VACIO;

const OFICIO_VACIO = {
  id: null as string | null,
  nombre: '', oficio: '', zona: '', img: '', wsp: '',
  ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type FichaOficio = typeof OFICIO_VACIO;

// Búsqueda simple, sin tildes ni mayúsculas, sobre varios campos.
function coincide(q: string, ...campos: unknown[]) {
  const norm = (t: unknown) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const n = norm(q).trim();
  return !n || campos.some((c) => norm(c).includes(n));
}

// Miniatura de la foto (o ícono si no hay / falla).
function Miniatura({ src, icono }: { src?: string; icono: string }) {
  const [falla, setFalla] = useState(false);
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0 flex items-center justify-center border border-surface-container-highest">
      {src && !falla ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalla(true)} className="w-full h-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-secondary/40 text-[22px]">{icono}</span>
      )}
    </div>
  );
}

export default function ChambaAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [empleos, setEmpleos] = useState<Fila[]>([]);
  const [oficios, setOficios] = useState<Fila[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [fichaE, setFichaE] = useState<FichaEmpleo>(EMPLEO_VACIO);
  const [modalE, setModalE] = useState(false);
  const [fichaO, setFichaO] = useState<FichaOficio>(OFICIO_VACIO);
  const [modalO, setModalO] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'todos' | 'empleos' | 'oficios'>('todos');

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const colsE = 'id,puesto,negocio,tipo,zona,pago,wsp,ciudad,orden,status';
    const pedirEmpleos = (cols: string) => supabase.from('job_listings').select(cols)
      .order('orden', { ascending: true }).order('created_at', { ascending: false });
    // `expira_el` y `link` son columnas nuevas: si todavía no existen, se pide con menos.
    let e: { data: any[] | null } = await pedirEmpleos(colsE + ',expira_el,link,img,descripcion,email') as any;
    if (!e.data) e = await pedirEmpleos(colsE + ',expira_el,link,img') as any;
    if (!e.data) e = await pedirEmpleos(colsE + ',expira_el,link') as any;
    if (!e.data) e = await pedirEmpleos(colsE + ',expira_el') as any;
    if (!e.data) e = await pedirEmpleos(colsE) as any;
    const o = await supabase.from('service_providers').select('id,nombre,oficio,zona,img,wsp,ciudad,orden,status')
      .order('orden', { ascending: true }).order('created_at', { ascending: false });
    setEmpleos(e.data ?? []);
    setOficios(o.data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/chamba');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (!esSuperadmin) return null;

  // Guardar / ocultar / borrar: refresca la vista pública y recarga la lista.
  const publicar = async () => { await refrescarPublico(['/api/chamba']); recargar(); };


  const cerrarE = () => { setModalE(false); setFichaE(EMPLEO_VACIO); setMsg(''); };
  const cerrarO = () => { setModalO(false); setFichaO(OFICIO_VACIO); setMsg(''); };

  const editarE = (r: Fila) => {
    setFichaE({
      id: r.id, puesto: r.puesto ?? '', negocio: r.negocio ?? '', tipo: r.tipo ?? 'Tiempo completo', zona: r.zona ?? '',
      pago: r.pago ?? '', wsp: r.wsp ?? '', link: r.link ?? '', link_orig: r.link ?? '', img: r.img ?? '', img_orig: r.img ?? '', descripcion: r.descripcion ?? '', descripcion_orig: r.descripcion ?? '', email: r.email ?? '', email_orig: r.email ?? '',
      ciudad: r.ciudad ?? 'pucallpa', orden: r.orden ?? 0, status: r.status ?? 'activo',
    });
    setMsg(''); setModalE(true);
  };
  const editarO = (r: Fila) => {
    setFichaO({
      id: r.id, nombre: r.nombre ?? '', oficio: r.oficio ?? '', zona: r.zona ?? '', img: r.img ?? '', wsp: r.wsp ?? '',
      ciudad: r.ciudad ?? 'pucallpa', orden: r.orden ?? 0, status: r.status ?? 'activo',
    });
    setMsg(''); setModalO(true);
  };

  const guardarE = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true); setMsg('');
    const payload = {
      puesto: fichaE.puesto, negocio: fichaE.negocio || null, tipo: fichaE.tipo || null, zona: fichaE.zona || null,
      pago: fichaE.pago || null, wsp: fichaE.wsp.replace(/\D/g, '') || null,
      ciudad: fichaE.ciudad, orden: Number(fichaE.orden) || 0, status: fichaE.status,
      // Solo se manda si hay enlace (o había uno y se está borrando): así guardar sigue
      // andando aunque la columna `link` todavía no exista.
      ...(fichaE.link || fichaE.link_orig ? { link: fichaE.link.trim() || null } : {}),
      ...(fichaE.img || fichaE.img_orig ? { img: fichaE.img || null } : {}),
      ...(fichaE.descripcion || fichaE.descripcion_orig ? { descripcion: fichaE.descripcion.trim() || null } : {}),
      ...(fichaE.email || fichaE.email_orig ? { email: fichaE.email.trim() || null } : {}),
    };
    const res = fichaE.id
      ? await supabase.from('job_listings').update(payload).eq('id', fichaE.id)
      : await supabase.from('job_listings').insert(payload);
    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    const editando = Boolean(fichaE.id);
    setFichaE(EMPLEO_VACIO); setModalE(false);
    setMsg(editando ? 'Empleo actualizado.' : 'Empleo agregado.');
    publicar();
  };

  const guardarO = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true); setMsg('');
    const payload = {
      nombre: fichaO.nombre, oficio: fichaO.oficio, zona: fichaO.zona || null, img: fichaO.img || null,
      wsp: fichaO.wsp.replace(/\D/g, '') || null,
      ciudad: fichaO.ciudad, orden: Number(fichaO.orden) || 0, status: fichaO.status,
    };
    const res = fichaO.id
      ? await supabase.from('service_providers').update(payload).eq('id', fichaO.id)
      : await supabase.from('service_providers').insert(payload);
    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    const editando = Boolean(fichaO.id);
    setFichaO(OFICIO_VACIO); setModalO(false);
    setMsg(editando ? 'Oficio actualizado.' : 'Oficio agregado.');
    publicar();
  };

  const toggleE = async (r: Fila) => { await supabase.from('job_listings').update({ status: r.status === 'activo' ? 'oculto' : 'activo' }).eq('id', r.id); publicar(); };
  const toggleO = async (r: Fila) => { await supabase.from('service_providers').update({ status: r.status === 'activo' ? 'oculto' : 'activo' }).eq('id', r.id); publicar(); };
  // Imagen de otra web (Facebook): guarda una copia en nuestro almacén y la usa.
  const copiarImagenE = async (r: Fila) => {
    setMsg('Guardando copia de la imagen…');
    try {
      const nueva = await mirrorImage(r.img, 'empleos');
      const { error } = await supabase.from('job_listings').update({ img: nueva }).eq('id', r.id);
      setMsg(error ? `Error: ${error.message}` : 'Imagen guardada en BogaHub.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo guardar la copia.');
    }
    publicar();
  };

  // Renovar: el aviso vuelve a durar 30 días desde hoy.
  const renovarE = async (r: Fila) => {
    const nueva = new Date(); nueva.setDate(nueva.getDate() + 30);
    const { error } = await supabase.from('job_listings').update({ expira_el: nueva.toISOString().slice(0, 10), status: 'activo' }).eq('id', r.id);
    setMsg(error ? `Error: ${error.message}` : 'Empleo renovado por 30 días.');
    publicar();
  };
  const borrarE = async (r: Fila) => {
    if (!confirm(`¿Borrar el empleo "${r.puesto}"? No se puede deshacer.`)) return;
    await supabase.from('job_listings').delete().eq('id', r.id); publicar();
  };
  const borrarO = async (r: Fila) => {
    if (!confirm(`¿Borrar a "${r.nombre}"? No se puede deshacer.`)) return;
    await supabase.from('service_providers').delete().eq('id', r.id); publicar();
  };

  const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';
  const evs = vista === 'oficios' ? [] : empleos.filter((r) => coincide(busqueda, r.puesto, r.negocio, r.tipo, r.zona, r.ciudad));
  const ofs = vista === 'empleos' ? [] : oficios.filter((r) => coincide(busqueda, r.nombre, r.oficio, r.zona, r.ciudad));

  const botones = 'text-xs font-bold px-3 py-1.5 rounded-lg';
  const hoyClave = new Date().toISOString().slice(0, 10);
  // "Vence en N días" / "Vencido" a partir de expira_el (YYYY-MM-DD). Sin fecha, no vence.
  const vencimiento = (r: Fila) => {
    if (!r.expira_el) return null;
    const dias = Math.ceil((new Date(r.expira_el + 'T23:59:59').getTime() - Date.now()) / 86400000);
    return { vencido: r.expira_el < hoyClave, dias };
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>
      <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="flex-1 min-w-0 bg-background text-on-background font-body-md">
        <header className="border-b border-surface-container-highest bg-surface">
          <div className="max-w-[900px] mx-auto px-container-margin py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/superadmin" className="text-secondary hover:text-primary text-sm flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Superadmin
              </Link>
              <span className="text-secondary">/</span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Chamba y oficios</span>
            </div>
            <Link href="/servicios" className="text-sm text-primary shrink-0">Ver la página →</Link>
          </div>
        </header>

        <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-6">
          {/* Buscador único */}
          <div className="sticky top-2 z-30 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={campo + ' pl-10 pr-10 shadow-sm'}
              placeholder="Buscar en empleos y oficios…"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="font-headline-md text-lg text-on-surface mr-auto">Contenido</h2>
              <button type="button" onClick={() => { setFichaE(EMPLEO_VACIO); setMsg(''); setModalE(true); }} className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">add</span> Agregar empleo
              </button>
              <button type="button" onClick={() => { setFichaO(OFICIO_VACIO); setMsg(''); setModalO(true); }} className="bg-surface-container text-on-surface font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1 border border-surface-container-highest active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">add</span> Agregar oficio
              </button>
            </div>

            <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {([
                ['todos', 'Todos', empleos.length + oficios.length, 'apps'],
                ['empleos', 'Empleos', empleos.length, 'work'],
                ['oficios', 'Oficios', oficios.length, 'construction'],
              ] as const).map(([id, label, n, icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVista(id)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    vista === id ? 'bg-primary text-white shadow-sm' : 'bg-white border border-surface-container-highest text-secondary hover:shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{icon}</span>
                  {label} <span className="opacity-70 font-normal">({n})</span>
                </button>
              ))}
            </div>

            {msg && !modalE && !modalO && <p className="text-xs font-bold text-primary mb-2">{msg}</p>}

            {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
              evs.length + ofs.length === 0 ? (
                <p className="text-secondary text-sm">
                  {busqueda ? 'Nada coincide con la búsqueda.' : 'Todavía no hay nada cargado. La página /servicios muestra ejemplos hasta que agregues al menos un empleo u oficio.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {evs.map((r) => {
                    const v = vencimiento(r);
                    return (
                    <div key={`e-${r.id}`} className={`bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3 ${v?.vencido ? 'opacity-60' : ''}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                      <Miniatura src={r.img} icono="work" />
                      <div className="flex-1 min-w-[180px]">
                        <p className="font-bold text-sm text-on-surface">
                          <span className="mr-1.5 bg-primary-fixed text-primary text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle">Empleo</span>
                          {r.puesto} <span className="text-secondary font-normal">· {r.negocio || 'Sin negocio'} · {r.ciudad}</span>
                          {v && (v.vencido
                            ? <span className="ml-1.5 bg-red-100 text-red-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle">Vencido</span>
                            : <span className="ml-1.5 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle">Vence en {v.dias} {v.dias === 1 ? 'día' : 'días'}</span>)}
                        </p>
                        <p className="text-xs text-secondary">{[r.tipo, r.zona, r.pago].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button onClick={() => editarE(r)} className={`${botones} border border-surface-container-highest text-on-surface`}>Editar</button>
                      {esImagenExterna(r.img) && <button onClick={() => copiarImagenE(r)} title="La imagen es de otra web y puede caducar" className={`${botones} border border-amber-400 text-amber-700`}>Guardar imagen</button>}
                      {v && <button onClick={() => renovarE(r)} className={`${botones} border border-primary/40 text-primary`}>Renovar 30 días</button>}
                      <button onClick={() => toggleE(r)} className={`${botones} border border-surface-container-highest text-secondary`}>{r.status === 'activo' ? 'Ocultar' : 'Mostrar'}</button>
                      <button onClick={() => borrarE(r)} className={`${botones} text-red-600`}>Borrar</button>
                    </div>
                    );
                  })}
                  {ofs.map((r) => (
                    <div key={`o-${r.id}`} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                      <Miniatura src={r.img} icono="construction" />
                      <div className="flex-1 min-w-[180px]">
                        <p className="font-bold text-sm text-on-surface">
                          <span className="mr-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle">Oficio</span>
                          {r.nombre} <span className="text-secondary font-normal">· {r.ciudad}</span>
                        </p>
                        <p className="text-xs text-secondary">{[r.oficio, r.zona].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button onClick={() => editarO(r)} className={`${botones} border border-surface-container-highest text-on-surface`}>Editar</button>
                      <button onClick={() => toggleO(r)} className={`${botones} border border-surface-container-highest text-secondary`}>{r.status === 'activo' ? 'Ocultar' : 'Mostrar'}</button>
                      <button onClick={() => borrarO(r)} className={`${botones} text-red-600`}>Borrar</button>
                    </div>
                  ))}
                </div>
              )}
          </section>
        </main>
      </div>

      {/* Formulario de empleo — ventana flotante */}
      {modalE && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={cerrarE}>
          <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="bg-white w-full sm:max-w-[760px] max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline-md text-lg text-on-surface">{fichaE.id ? 'Editar empleo' : 'Agregar empleo'}</h2>
              <button type="button" aria-label="Cerrar" onClick={cerrarE} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardarE} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Puesto
                <input required value={fichaE.puesto} onChange={(e) => setFichaE({ ...fichaE, puesto: e.target.value })} className={campo} placeholder="Mozo / Moza" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Negocio
                <input value={fichaE.negocio} onChange={(e) => setFichaE({ ...fichaE, negocio: e.target.value })} className={campo} placeholder="La Anaconda Parrillas" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tipo de jornada
                <select value={fichaE.tipo} onChange={(e) => setFichaE({ ...fichaE, tipo: e.target.value })} className={campo}>
                  {TIPOS_EMPLEO.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Zona
                <input value={fichaE.zona} onChange={(e) => setFichaE({ ...fichaE, zona: e.target.value })} className={campo} placeholder="Yarinacocha" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Pago
                <input value={fichaE.pago} onChange={(e) => setFichaE({ ...fichaE, pago: e.target.value })} className={campo} placeholder="S/ 1200 + propinas, o A convenir" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp para postular (con 51)
                <input value={fichaE.wsp} onChange={(e) => setFichaE({ ...fichaE, wsp: e.target.value })} className={campo} placeholder="51961000000" inputMode="numeric" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Enlace del aviso (opcional)
                <input value={fichaE.link} onChange={(e) => setFichaE({ ...fichaE, link: e.target.value })} className={campo} placeholder="https://… publicación, post o formulario" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Descripción y requisitos (opcional)
                <textarea value={fichaE.descripcion} onChange={(e) => setFichaE({ ...fichaE, descripcion: e.target.value })} rows={6} className={campo} placeholder={"Funciones, requisitos, beneficios, horario…\n• Secundaria completa\n• Experiencia mínima de 6 meses"} /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Correo para enviar el CV (opcional)
                <input type="email" value={fichaE.email} onChange={(e) => setFichaE({ ...fichaE, email: e.target.value })} className={campo} placeholder="rrhh@empresa.com" /></label>
              <CampoFoto value={fichaE.img} onChange={(url) => setFichaE({ ...fichaE, img: url })} carpeta="empleos" inputClass={campo} />
              <p className="sm:col-span-2 text-[11px] text-secondary -mt-1">Si pones un enlace, el botón dice «Ver aviso» y lleva ahí. Si no, dice «Postular» y abre WhatsApp.</p>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
                <select value={fichaE.ciudad} onChange={(e) => setFichaE({ ...fichaE, ciudad: e.target.value })} className={campo}>
                  {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
                <input type="number" value={fichaE.orden} onChange={(e) => setFichaE({ ...fichaE, orden: Number(e.target.value) })} className={campo} /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
                <select value={fichaE.status} onChange={(e) => setFichaE({ ...fichaE, status: e.target.value })} className={campo}>
                  <option value="activo">Activo (visible)</option>
                  <option value="oculto">Oculto</option></select></label>
              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                  {guardando ? 'Guardando…' : fichaE.id ? 'Guardar cambios' : 'Agregar empleo'}
                </button>
                <button type="button" onClick={cerrarE} className="text-sm text-secondary underline">Cancelar</button>
                {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario de oficio — ventana flotante */}
      {modalO && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={cerrarO}>
          <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="bg-white w-full sm:max-w-[760px] max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline-md text-lg text-on-surface">{fichaO.id ? 'Editar oficio' : 'Agregar oficio'}</h2>
              <button type="button" aria-label="Cerrar" onClick={cerrarO} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardarO} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Nombre
                <input required value={fichaO.nombre} onChange={(e) => setFichaO({ ...fichaO, nombre: e.target.value })} className={campo} placeholder="Marco Ríos" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Oficio
                <input required value={fichaO.oficio} onChange={(e) => setFichaO({ ...fichaO, oficio: e.target.value })} className={campo} placeholder="Electricista domiciliario" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Zona
                <input value={fichaO.zona} onChange={(e) => setFichaO({ ...fichaO, zona: e.target.value })} className={campo} placeholder="Yarinacocha" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp (con 51)
                <input value={fichaO.wsp} onChange={(e) => setFichaO({ ...fichaO, wsp: e.target.value })} className={campo} placeholder="51961000000" inputMode="numeric" /></label>
              <CampoFoto value={fichaO.img} onChange={(url) => setFichaO({ ...fichaO, img: url })} carpeta="oficios" inputClass={campo} />
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
                <select value={fichaO.ciudad} onChange={(e) => setFichaO({ ...fichaO, ciudad: e.target.value })} className={campo}>
                  {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
                <input type="number" value={fichaO.orden} onChange={(e) => setFichaO({ ...fichaO, orden: Number(e.target.value) })} className={campo} /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
                <select value={fichaO.status} onChange={(e) => setFichaO({ ...fichaO, status: e.target.value })} className={campo}>
                  <option value="activo">Activo (visible)</option>
                  <option value="oculto">Oculto</option></select></label>
              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                  {guardando ? 'Guardando…' : fichaO.id ? 'Guardar cambios' : 'Agregar oficio'}
                </button>
                <button type="button" onClick={cerrarO} className="text-sm text-secondary underline">Cancelar</button>
                {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
