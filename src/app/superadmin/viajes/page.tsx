'use client';

// Panel de Viajes & Transportes — subruta propia, guard con useEsSuperadmin()
// como /superadmin/eventos. Administra `travel_routes` (las rutas de /viajes):
// crear, editar, ocultar, borrar. Formulario en ventana flotante, filtros por
// medio (fluvial / terrestre / aéreo) y buscador.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { refrescarPublico } from '@/lib/refrescar';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';
import { ICONO_MEDIO, type MedioViaje } from '@/lib/viajes';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

const VERDE = '#00875A';

const MEDIOS: { id: MedioViaje; label: string }[] = [
  { id: 'fluvial', label: 'Fluvial (rápidos, lanchas)' },
  { id: 'terrestre', label: 'Terrestre (buses, colectivos)' },
  { id: 'aereo', label: 'Aéreo (vuelos)' },
];

type Fila = Record<string, any>;

const FICHA_VACIA = {
  id: null as string | null,
  medio: 'terrestre' as MedioViaje,
  destino: '', via: '', agencia: '', duracion: '', frecuencia: '', precio: '', wsp: '', notas: '',
  ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type Ficha = typeof FICHA_VACIA;

// Búsqueda simple, sin tildes ni mayúsculas, sobre varios campos.
function coincide(q: string, ...campos: unknown[]) {
  const norm = (t: unknown) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const n = norm(q).trim();
  return !n || campos.some((c) => norm(c).includes(n));
}

export default function ViajesAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'todos' | MedioViaje>('todos');

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase
      .from('travel_routes')
      .select('id,medio,destino,via,agencia,duracion,frecuencia,precio,wsp,notas,ciudad,orden,status')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setFilas(data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/viajes');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (!esSuperadmin) return null;

  // Guardar / ocultar / borrar: refresca la vista pública y recarga la lista.
  const publicar = async () => { await refrescarPublico(['/api/viajes']); recargar(); };


  const cerrar = () => { setModal(false); setFicha(FICHA_VACIA); setMsg(''); };

  const editar = (r: Fila) => {
    setFicha({
      id: r.id, medio: (r.medio ?? 'terrestre') as MedioViaje,
      destino: r.destino ?? '', via: r.via ?? '', agencia: r.agencia ?? '', duracion: r.duracion ?? '',
      frecuencia: r.frecuencia ?? '', precio: r.precio ?? '', wsp: r.wsp ?? '', notas: r.notas ?? '',
      ciudad: r.ciudad ?? 'pucallpa', orden: r.orden ?? 0, status: r.status ?? 'activo',
    });
    setMsg('');
    setModal(true);
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGuardando(true);
    setMsg('');

    const payload = {
      medio: ficha.medio, destino: ficha.destino, via: ficha.via || null, agencia: ficha.agencia || null,
      duracion: ficha.duracion || null, frecuencia: ficha.frecuencia || null, precio: ficha.precio || null,
      // Solo dígitos: el enlace de WhatsApp se arma con 51 + número.
      wsp: ficha.wsp.replace(/\D/g, '') || null,
      notas: ficha.notas || null, ciudad: ficha.ciudad, orden: Number(ficha.orden) || 0, status: ficha.status,
    };

    const res = ficha.id
      ? await supabase.from('travel_routes').update(payload).eq('id', ficha.id)
      : await supabase.from('travel_routes').insert(payload);

    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    const editando = Boolean(ficha.id);
    setFicha(FICHA_VACIA);
    setModal(false);
    setMsg(editando ? 'Ruta actualizada.' : 'Ruta agregada.');
    publicar();
  };

  const toggleStatus = async (r: Fila) => {
    await supabase.from('travel_routes').update({ status: r.status === 'activo' ? 'oculto' : 'activo' }).eq('id', r.id);
    publicar();
  };

  const borrar = async (r: Fila) => {
    if (!confirm(`¿Borrar la ruta a "${r.destino}"? No se puede deshacer.`)) return;
    await supabase.from('travel_routes').delete().eq('id', r.id);
    publicar();
  };

  const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';
  const contar = (m: MedioViaje) => filas.filter((f) => f.medio === m).length;
  const visibles = filas
    .filter((f) => vista === 'todos' || f.medio === vista)
    .filter((f) => coincide(busqueda, f.destino, f.via, f.agencia, f.medio, f.ciudad));

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
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Viajes y Transportes</span>
            </div>
            <Link href="/viajes" className="text-sm text-primary shrink-0">Ver la página →</Link>
          </div>
        </header>

        <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-6">
          {/* Buscador */}
          <div className="sticky top-2 z-30 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={campo + ' pl-10 pr-10 shadow-sm'}
              placeholder="Buscar por destino, vía o agencia…"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="font-headline-md text-lg text-on-surface mr-auto">Rutas</h2>
              <button type="button" onClick={() => { setFicha(FICHA_VACIA); setMsg(''); setModal(true); }} className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">add</span> Agregar ruta
              </button>
            </div>

            <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {([
                ['todos', 'Todos', filas.length, 'travel_explore'],
                ['fluvial', 'Fluvial', contar('fluvial'), 'directions_boat'],
                ['terrestre', 'Terrestre', contar('terrestre'), 'directions_bus'],
                ['aereo', 'Aéreo', contar('aereo'), 'flight'],
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

            {msg && !modal && <p className="text-xs font-bold text-primary mb-2">{msg}</p>}

            {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
              visibles.length === 0 ? (
                <p className="text-secondary text-sm">
                  {busqueda ? 'Nada coincide con la búsqueda.' : 'Todavía no hay rutas cargadas. La página /viajes muestra rutas de muestra hasta que agregues al menos una.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {visibles.map((r) => (
                    <div key={r.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                      <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{ICONO_MEDIO[(r.medio as MedioViaje)] ?? 'directions_bus'}</span>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <p className="font-bold text-sm text-on-surface">
                          {r.destino} <span className="text-secondary font-normal">· {r.agencia || 'Sin agencia'} · {r.ciudad}</span>
                        </p>
                        <p className="text-xs text-secondary">{[r.via, r.duracion, r.frecuencia, r.precio].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button onClick={() => editar(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                      <button onClick={() => toggleStatus(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                        {r.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button onClick={() => borrar(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
                    </div>
                  ))}
                </div>
              )}
          </section>
        </main>
      </div>

      {/* Formulario — ventana flotante */}
      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={cerrar}>
          <div
            style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties}
            className="bg-white w-full sm:max-w-[760px] max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline-md text-lg text-on-surface">{ficha.id ? 'Editar ruta' : 'Agregar ruta'}</h2>
              <button type="button" aria-label="Cerrar" onClick={cerrar} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Medio de transporte
                <select value={ficha.medio} onChange={(e) => setFicha({ ...ficha, medio: e.target.value as MedioViaje })} className={campo}>
                  {MEDIOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Destino
                <input required value={ficha.destino} onChange={(e) => setFicha({ ...ficha, destino: e.target.value })} className={campo} placeholder="Contamana" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Vía / ruta
                <input value={ficha.via} onChange={(e) => setFicha({ ...ficha, via: e.target.value })} className={campo} placeholder="Río Ucayali · Puerto Henry / La Hoyada" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Agencia o empresa
                <input value={ficha.agencia} onChange={(e) => setFicha({ ...ficha, agencia: e.target.value })} className={campo} placeholder="Rápidos Eduardo" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Duración
                <input value={ficha.duracion} onChange={(e) => setFicha({ ...ficha, duracion: e.target.value })} className={campo} placeholder="~10–12 h" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Frecuencia
                <input value={ficha.frecuencia} onChange={(e) => setFicha({ ...ficha, frecuencia: e.target.value })} className={campo} placeholder="Diario, 5:00 AM" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio
                <input value={ficha.precio} onChange={(e) => setFicha({ ...ficha, precio: e.target.value })} className={campo} placeholder="S/ 80–120" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp (con 51)
                <input value={ficha.wsp} onChange={(e) => setFicha({ ...ficha, wsp: e.target.value })} className={campo} placeholder="51963000000" inputMode="numeric" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Notas (opcional)
                <textarea value={ficha.notas} onChange={(e) => setFicha({ ...ficha, notas: e.target.value })} rows={3} className={campo} placeholder="Llevar agua y comida. Chaleco incluido…" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
                <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                  {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
                <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
                <select value={ficha.status} onChange={(e) => setFicha({ ...ficha, status: e.target.value })} className={campo}>
                  <option value="activo">Activo (visible)</option>
                  <option value="oculto">Oculto</option></select></label>
              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                  {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Agregar ruta'}
                </button>
                <button type="button" onClick={cerrar} className="text-sm text-secondary underline">Cancelar</button>
                {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
