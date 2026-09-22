'use client';

// Panel de Sorteos — subruta propia, guard con useEsSuperadmin() como
// /superadmin/eventos. Crea sorteos patrocinados (premio, patrocinador, meta de
// tickets), registra tickets a nombre de cada participante y muestra el contador.
// Cuando los tickets llegan a la meta, el sorteo se hace SOLO (en el servidor, al
// azar) y queda guardado el ganador. También se puede sortear antes con "Sortear ahora".

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { refrescarPublico } from '@/lib/refrescar';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';
import CampoFoto from '@/components/superadmin/CampoFoto';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

const VERDE = '#00875A';

type Fila = Record<string, any>;

const VACIA = {
  id: null as string | null,
  titulo: '', descripcion: '', img: '', patrocinador: '', como_participar: '', precio_ticket: '',
  meta_tickets: 100 as number | string | null, cierra_el: '', ciudad: 'pucallpa', orden: 0, status: 'borrador',
};
type Ficha = typeof VACIA;

// El estado se muestra como Activo / Desactivado (interruptor). "borrador" y "oculto"
// cuentan como Desactivado; "sorteado" es el final y no se puede cambiar.
const ESTADOS: Record<string, { label: string; clase: string }> = {
  borrador: { label: 'Desactivado', clase: 'bg-surface-container text-secondary' },
  abierto: { label: 'Activo', clase: 'bg-emerald-100 text-emerald-700' },
  sorteado: { label: 'Sorteado', clase: 'bg-amber-100 text-amber-800' },
  oculto: { label: 'Desactivado', clase: 'bg-surface-container text-secondary' },
};

function Interruptor({ activo, onChange, disabled }: { activo: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={onChange}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${activo ? 'bg-primary' : 'bg-surface-container-highest'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// Mensaje de WhatsApp para entregarle sus tickets a un participante.
function mensajeTickets(rifa: Record<string, any>, nombre: string, numeros: number[]) {
  const lista = numeros.length === 1 ? `el ticket N.º ${numeros[0]}` : `los tickets N.º ${numeros.join(', ')}`;
  const cuando = rifa.meta_tickets
    ? 'El sorteo se hace solo cuando se llenen todos los tickets.'
    : rifa.cierra_el ? `El sorteo será el ${rifa.cierra_el.split('-').reverse().join('/')}.` : '';
  return `¡Hola ${nombre.split(' ')[0]}! Ya registramos ${lista} a tu nombre en el sorteo «${rifa.titulo}»${rifa.patrocinador ? ` (patrocina ${rifa.patrocinador})` : ''}. ${cuando} ¡Mucha suerte! 🍀 — BogaHub`.replace(/\s+/g, ' ').trim();
}
function enlaceWhatsapp(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}


function coincide(q: string, ...campos: unknown[]) {
  const norm = (t: unknown) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const n = norm(q).trim();
  return !n || campos.some((c) => norm(c).includes(n));
}

export default function SorteosAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [rifas, setRifas] = useState<Fila[]>([]);
  const [conteo, setConteo] = useState<Record<string, number>>({});
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(VACIA);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Ventana de tickets de un sorteo
  const [ver, setVer] = useState<Fila | null>(null);
  const [tickets, setTickets] = useState<Fila[]>([]);
  const [nuevo, setNuevo] = useState({ nombre: '', whatsapp: '', nota: '', cantidad: 1 });
  const [trabajando, setTrabajando] = useState(false);
  const [msgTickets, setMsgTickets] = useState('');
  const [ultimoLote, setUltimoLote] = useState<{ nombre: string; whatsapp: string; numeros: number[] } | null>(null);

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase.from('raffles').select('*').order('orden', { ascending: true }).order('created_at', { ascending: false });
    setRifas(data ?? []);
    const { data: filas } = await supabase.from('raffle_tickets').select('raffle_id');
    const c: Record<string, number> = {};
    (filas ?? []).forEach((f: Fila) => { c[f.raffle_id] = (c[f.raffle_id] || 0) + 1; });
    setConteo(c);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/sorteos');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (!esSuperadmin) return null;

  const publicar = async () => { await refrescarPublico(['/api/sorteos']); recargar(); };

  // Acciones que necesitan el servidor (tickets, sorteo): /api/sorteos/admin
  const accion = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/sorteos/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción');
    return data;
  };

  const cargarTickets = async (rifaId: string) => {
    const { data } = await supabase.from('raffle_tickets').select('*').eq('raffle_id', rifaId).order('numero', { ascending: true });
    setTickets(data ?? []);
  };

  const cerrar = () => { setModal(false); setFicha(VACIA); setMsg(''); };

  const editar = (r: Fila) => {
    setFicha({
      id: r.id, titulo: r.titulo ?? '', descripcion: r.descripcion ?? '', img: r.img ?? '', patrocinador: r.patrocinador ?? '',
      como_participar: r.como_participar ?? '', precio_ticket: r.precio_ticket ?? '', meta_tickets: r.meta_tickets ?? '',
      cierra_el: r.cierra_el ?? '', ciudad: r.ciudad ?? 'pucallpa', orden: r.orden ?? 0, status: r.status ?? 'borrador',
    });
    setMsg(''); setModal(true);
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // Meta vacía = sin límite de tickets (se sortea a mano).
    const vacia = ficha.meta_tickets === '' || ficha.meta_tickets === null;
    const meta = vacia ? null : Number(ficha.meta_tickets);
    if (meta === null && !ficha.cierra_el) { setMsg('Pon una meta de tickets (se sortea al llenarse) o una fecha (se sortea ese día). Necesita al menos una.'); return; }
    if (meta !== null && (!Number.isFinite(meta) || meta < 1)) { setMsg('La meta de tickets debe ser 1 o más, o déjala vacía si no hay límite.'); return; }
    if (meta !== null && ficha.id && meta < (conteo[ficha.id] || 0)) { setMsg(`Ya hay ${conteo[ficha.id]} tickets: la meta no puede ser menor.`); return; }
    setGuardando(true); setMsg('');
    const payload = {
      titulo: ficha.titulo, descripcion: ficha.descripcion || null, img: ficha.img || null, patrocinador: ficha.patrocinador || null,
      como_participar: ficha.como_participar || null, precio_ticket: ficha.precio_ticket || null, meta_tickets: meta,
      cierra_el: ficha.cierra_el || null, ciudad: ficha.ciudad, orden: Number(ficha.orden) || 0,
      // "sorteado" solo lo pone el sorteo; desde el formulario no se puede escoger.
      ...(ficha.status !== 'sorteado' ? { status: ficha.status } : {}),
    };
    const res = ficha.id
      ? await supabase.from('raffles').update(payload).eq('id', ficha.id)
      : await supabase.from('raffles').insert(payload);
    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    const editando = Boolean(ficha.id);
    setFicha(VACIA); setModal(false);
    setMsg(editando ? 'Sorteo actualizado.' : 'Sorteo creado. Cuando esté listo, ábrelo para que se vea en la página.');
    publicar();
  };

  const cambiarEstado = async (r: Fila, status: string) => {
    await supabase.from('raffles').update({ status }).eq('id', r.id);
    publicar();
  };

  const borrar = async (r: Fila) => {
    const n = conteo[r.id] || 0;
    if (!confirm(`¿Borrar el sorteo "${r.titulo}"${n ? ` y sus ${n} tickets` : ''}? No se puede deshacer.`)) return;
    await supabase.from('raffles').delete().eq('id', r.id);
    publicar();
  };

  const abrirTickets = async (r: Fila) => {
    setVer(r); setMsgTickets(''); setUltimoLote(null); setNuevo({ nombre: '', whatsapp: '', nota: '', cantidad: 1 });
    await cargarTickets(r.id);
  };

  const agregarTicket = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!ver) return;
    setTrabajando(true); setMsgTickets('');
    try {
      const r = await accion({ accion: 'ticket', raffle_id: ver.id, ...nuevo });
      setMsgTickets(
        r.sorteado
          ? `🎉 ¡Se llenó! Sorteo hecho: ganó el ticket N.º ${r.ganador?.numero} (${r.ganador?.nombre}).`
          : `Listo: ${r.agregados} ticket(s) — N.º ${r.numeros.join(', ')}.`,
      );
      setUltimoLote(nuevo.whatsapp.replace(/\D/g, '') ? { nombre: nuevo.nombre, whatsapp: nuevo.whatsapp.replace(/\D/g, ''), numeros: r.numeros } : null);
      setNuevo({ nombre: '', whatsapp: '', nota: '', cantidad: 1 });
      await cargarTickets(ver.id);
      const { data } = await supabase.from('raffles').select('*').eq('id', ver.id).single();
      if (data) setVer(data);
      publicar();
    } catch (e) {
      setMsgTickets(e instanceof Error ? e.message : 'Error');
    }
    setTrabajando(false);
  };

  const borrarTicket = async (t: Fila) => {
    if (!confirm(`¿Borrar el ticket N.º ${t.numero} de ${t.nombre}?`)) return;
    try { await accion({ accion: 'borrar_ticket', ticket_id: t.id }); await cargarTickets(t.raffle_id); publicar(); }
    catch (e) { setMsgTickets(e instanceof Error ? e.message : 'Error'); }
  };

  const sortearAhora = async () => {
    if (!ver) return;
    const n = tickets.length;
    if (!confirm(`¿Sortear ahora con ${n} ticket(s)? Solo se hace una vez y no se puede deshacer.`)) return;
    setTrabajando(true); setMsgTickets('');
    try {
      const r = await accion({ accion: 'sortear', raffle_id: ver.id });
      setMsgTickets(`🎉 Ganó el ticket N.º ${r.ganador.numero} (${r.ganador.nombre}).`);
      const { data } = await supabase.from('raffles').select('*').eq('id', ver.id).single();
      if (data) setVer(data);
      publicar();
    } catch (e) {
      setMsgTickets(e instanceof Error ? e.message : 'Error');
    }
    setTrabajando(false);
  };

  const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';
  const visibles = rifas.filter((r) => coincide(busqueda, r.titulo, r.patrocinador, r.status));
  const ganadorDe = (r: Fila) => tickets.find((t) => t.id === r.ganador_ticket_id);

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
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Sorteos</span>
            </div>
            <Link href="/sorteos" className="text-sm text-primary shrink-0">Ver la página →</Link>
          </div>
        </header>

        <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-6">
          <div className="sticky top-2 z-30 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={campo + ' pl-10 pr-10 shadow-sm'} placeholder="Buscar sorteo por título o patrocinador…" />
            {busqueda && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <section>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="font-headline-md text-lg text-on-surface mr-auto">Sorteos ({rifas.length})</h2>
              <button type="button" onClick={() => { setFicha(VACIA); setMsg(''); setModal(true); }} className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">add</span> Nuevo sorteo
              </button>
            </div>

            <p className="text-[11px] text-secondary mb-3 leading-relaxed">
              Cada sorteo puede tener una <b>meta de tickets</b>: registras los tickets de cada participante y, al llegar a la meta, el sorteo se hace solo, al azar. Si en cambio pones una <b>fecha</b> y no meta, el sorteo se hace ese día (sin contador a la vista). Necesita meta, fecha o las dos.
              <span className="block mt-0.5 text-amber-700 font-semibold">Ojo: en Perú las rifas y sorteos entre el público pueden requerir autorización. Confírmalo con un abogado antes de vender tickets.</span>
            </p>

            {msg && !modal && <p className="text-xs font-bold text-primary mb-2">{msg}</p>}

            {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
              visibles.length === 0 ? (
                <p className="text-secondary text-sm">{busqueda ? 'Nada coincide con la búsqueda.' : 'Todavía no hay sorteos. Crea el primero con «Nuevo sorteo».'}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {visibles.map((r) => {
                    const n = conteo[r.id] || 0;
                    const pct = r.meta_tickets ? Math.min(100, Math.round((n / r.meta_tickets) * 100)) : 0;
                    const est = ESTADOS[r.status] ?? ESTADOS.borrador;
                    return (
                      <div key={r.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-col gap-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container shrink-0 flex items-center justify-center border border-surface-container-highest">
                            {r.img
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={r.img} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              : <span className="material-symbols-outlined text-secondary/40">casino</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-on-surface leading-tight">
                              <span className={`mr-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full align-middle ${est.clase}`}>{est.label}</span>
                              {r.titulo}
                            </p>
                            <p className="text-xs text-secondary mt-0.5">{[r.patrocinador && `Patrocina ${r.patrocinador}`, r.precio_ticket && `Ticket: ${String(r.precio_ticket).startsWith('S/') ? r.precio_ticket : `S/ ${r.precio_ticket}`}`, r.cierra_el && `Cierra ${r.cierra_el}`].filter(Boolean).join(' · ') || 'Sin más datos'}</p>
                          </div>
                        </div>
                        {r.meta_tickets ? (
                          <div>
                            <div className="h-2 rounded-full bg-surface-container overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                            <p className="text-[11px] text-secondary mt-1"><b className="text-on-surface">{n}</b> de {r.meta_tickets} tickets ({pct}%)</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-secondary"><b className="text-on-surface">{n}</b> tickets · se sortea el día de la fecha</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => abrirTickets(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-on-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">confirmation_number</span>Tickets
                          </button>
                          <button onClick={() => editar(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                          {r.status !== 'sorteado' && (
                            <label className="flex items-center gap-2 text-xs font-bold text-secondary cursor-pointer">
                              <Interruptor activo={r.status === 'abierto'} onChange={() => cambiarEstado(r, r.status === 'abierto' ? 'oculto' : 'abierto')} />
                              {r.status === 'abierto' ? 'Activo' : 'Desactivado'}
                            </label>
                          )}
                          <button onClick={() => borrar(r)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600 ml-auto">Borrar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </section>
        </main>
      </div>

      {/* Formulario del sorteo — ventana flotante */}
      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={cerrar}>
          <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="bg-white w-full sm:max-w-[760px] max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline-md text-lg text-on-surface">{ficha.id ? 'Editar sorteo' : 'Nuevo sorteo'}</h2>
              <button type="button" aria-label="Cerrar" onClick={cerrar} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Premio (título del sorteo)
                <input required value={ficha.titulo} onChange={(e) => setFicha({ ...ficha, titulo: e.target.value })} className={campo} placeholder="Reloj Poedagar 613 — Marrón" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Patrocinador
                <input value={ficha.patrocinador} onChange={(e) => setFicha({ ...ficha, patrocinador: e.target.value })} className={campo} placeholder="Delva" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Meta de tickets (opcional)
                <input type="number" min={1} value={ficha.meta_tickets ?? ''} onChange={(e) => setFicha({ ...ficha, meta_tickets: e.target.value })} className={campo} placeholder="500 — vacío = sin límite" />
                <span className="font-normal text-[11px]">Con meta, el sorteo se hace solo al llenarse. Sin meta, pon una fecha: se sortea ese día.</span></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">¿Cómo se consigue un ticket?
                <input value={ficha.como_participar} onChange={(e) => setFicha({ ...ficha, como_participar: e.target.value })} className={campo} placeholder="1 ticket por cada S/ 20 en compras en Delva" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio del ticket (informativo)
                <input value={ficha.precio_ticket} onChange={(e) => setFicha({ ...ficha, precio_ticket: e.target.value })} className={campo} placeholder="S/ 5, o Gratis con tus compras" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Fecha del sorteo / límite
                <input type="date" value={ficha.cierra_el} onChange={(e) => setFicha({ ...ficha, cierra_el: e.target.value })} className={campo} /></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Descripción (opcional)
                <textarea value={ficha.descripcion} onChange={(e) => setFicha({ ...ficha, descripcion: e.target.value })} rows={4} className={campo} placeholder="Detalles del premio, condiciones…" /></label>
              <CampoFoto value={ficha.img} onChange={(url) => setFicha({ ...ficha, img: url })} carpeta="sorteos" inputClass={campo} />
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
                <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                  {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
                <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} /></label>
              {ficha.status !== 'sorteado' && (
                <div className="sm:col-span-2 flex items-center gap-3 text-xs font-bold text-secondary">
                  <Interruptor activo={ficha.status === 'abierto'} onChange={() => setFicha({ ...ficha, status: ficha.status === 'abierto' ? 'oculto' : 'abierto' })} />
                  <span>{ficha.status === 'abierto' ? 'Activo: se ve en la página y acepta tickets' : 'Desactivado: no se ve en la página'}</span>
                </div>
              )}
              <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                  {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Crear sorteo'}
                </button>
                <button type="button" onClick={cerrar} className="text-sm text-secondary underline">Cancelar</button>
                {msg && <span className="text-xs font-bold text-primary">{msg}</span>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tickets del sorteo — ventana flotante */}
      {ver && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setVer(null)}>
          <div style={{ ['--color-primary' as string]: VERDE } as React.CSSProperties} className="bg-white w-full sm:max-w-[760px] max-h-[94dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="font-headline-md text-lg text-on-surface truncate">{ver.titulo}</h2>
                <p className="text-xs text-secondary"><b className="text-on-surface">{tickets.length}</b>{ver.meta_tickets ? ` de ${ver.meta_tickets}` : ''} tickets{ver.meta_tickets ? '' : ' · sin límite'} · {(ESTADOS[ver.status] ?? ESTADOS.borrador).label}</p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setVer(null)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {ver.meta_tickets ? (
              <div className="h-2.5 rounded-full bg-surface-container overflow-hidden mb-3">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((tickets.length / ver.meta_tickets) * 100))}%` }} />
              </div>
            ) : null}

            {ver.status === 'sorteado' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm">
                <p className="font-bold text-amber-900">🏆 Sorteo realizado</p>
                {ganadorDe(ver)
                  ? <p className="text-amber-900">Ganó el ticket N.º <b>{ganadorDe(ver)!.numero}</b>: <b>{ganadorDe(ver)!.nombre}</b>{ganadorDe(ver)!.whatsapp ? ` · WhatsApp ${ganadorDe(ver)!.whatsapp}` : ''}. Contáctalo para entregar el premio.</p>
                  : <p className="text-amber-900">El ganador se guardó (ticket borrado o no cargado).</p>}
              </div>
            )}

            {ver.status === 'abierto' && (
              <form onSubmit={agregarTicket} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 bg-surface-container-low rounded-xl p-3">
                <label className="flex flex-col gap-1 text-[11px] font-bold text-secondary sm:col-span-2">Nombre del participante
                  <input required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className={campo} placeholder="María Quispe" /></label>
                <label className="flex flex-col gap-1 text-[11px] font-bold text-secondary">WhatsApp
                  <input value={nuevo.whatsapp} onChange={(e) => setNuevo({ ...nuevo, whatsapp: e.target.value })} className={campo} placeholder="51999…" inputMode="numeric" /></label>
                <label className="flex flex-col gap-1 text-[11px] font-bold text-secondary">Cantidad
                  <input type="number" min={1} max={50} value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: Number(e.target.value) })} className={campo} /></label>
                <label className="flex flex-col gap-1 text-[11px] font-bold text-secondary sm:col-span-3">Nota (opcional: cómo pagó, n.º de operación…)
                  <input value={nuevo.nota} onChange={(e) => setNuevo({ ...nuevo, nota: e.target.value })} className={campo} /></label>
                <button type="submit" disabled={trabajando} className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-lg self-end disabled:opacity-60">{trabajando ? '…' : 'Agregar'}</button>
              </form>
            )}

            {msgTickets && <p className="text-xs font-bold text-primary mb-2">{msgTickets}</p>}

            {ultimoLote && (
              <a
                href={enlaceWhatsapp(ultimoLote.whatsapp, mensajeTickets(ver, ultimoLote.nombre, ultimoLote.numeros))}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 w-fit flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                Enviar sus tickets a {ultimoLote.nombre.split(' ')[0]} por WhatsApp
              </a>
            )}

            {ver.status === 'abierto' && tickets.length > 0 && (
              <button type="button" onClick={sortearAhora} disabled={trabajando} className="mb-3 text-xs font-bold px-3 py-2 rounded-lg border border-amber-400 text-amber-800 flex items-center gap-1 disabled:opacity-60">
                <span className="material-symbols-outlined text-[16px]">casino</span>Sortear ahora{ver.meta_tickets ? ' (sin esperar a llenar la meta)' : ''}
              </button>
            )}

            {tickets.length === 0 ? (
              <p className="text-secondary text-sm">Todavía no hay tickets.</p>
            ) : (
              <div className="flex flex-col divide-y divide-surface-container border border-surface-container-highest rounded-xl overflow-hidden">
                {tickets.map((t) => (
                  <div key={t.id} className={`px-3 py-2 flex items-center gap-3 text-sm ${t.id === ver.ganador_ticket_id ? 'bg-amber-50' : 'bg-white'}`}>
                    <span className="w-12 shrink-0 font-bold text-primary">N.º {t.numero}</span>
                    <span className="flex-1 min-w-0 truncate">{t.nombre}{t.id === ver.ganador_ticket_id ? ' 🏆' : ''} <span className="text-secondary text-xs">{[t.whatsapp, t.nota].filter(Boolean).join(' · ')}</span></span>
                    {t.whatsapp && (
                      <a
                        href={enlaceWhatsapp(t.whatsapp, mensajeTickets(ver, t.nombre, tickets.filter((x) => x.whatsapp === t.whatsapp && x.nombre === t.nombre).map((x) => x.numero)))}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Enviar tickets a ${t.nombre} por WhatsApp`}
                        title="Enviar sus tickets por WhatsApp"
                        className="shrink-0 w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                      </a>
                    )}
                    {ver.status === 'abierto' && <button onClick={() => borrarTicket(t)} className="text-xs font-bold text-red-600 shrink-0">Borrar</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
