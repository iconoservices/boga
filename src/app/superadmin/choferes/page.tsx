'use client';

// Panel de Choferes (Taxi Seguro) — subruta propia, NO metida en el page.tsx
// gigante de /superadmin. Guard con useEsSuperadmin() como /superadmin/revista.
//
//   - driver_requests (postulaciones del formulario público): aprobar / rechazar.
//     Aprobar precarga la ficha con lo que dejó el chofer.
//   - drivers (el directorio de /taxi-seguro): crear, editar, ocultar, borrar.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';

const VERDE = '#00875A';
const TIPOS = ['Mototaxi', 'Auto', 'Moto'];

type DriverRow = Record<string, any>;

const FICHA_VACIA = {
  id: null as string | null,
  nombre: '', tipo: 'Mototaxi', comite: '', experiencia: '', placa: '', modelo: '',
  sellos: '[\n  { "label": "DNI Validado", "icon": "badge", "fuerte": true },\n  { "label": "SOAT Vigente", "icon": "health_and_safety", "fuerte": true }\n]',
  ruta: '', precio: '', paradero: '', resena: '', resena_autor: '',
  tel: '', img: '', veh_img: '', ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type Ficha = typeof FICHA_VACIA;

export default function ChoferesAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [postulaciones, setPostulaciones] = useState<DriverRow[]>([]);
  const [choferes, setChoferes] = useState<DriverRow[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const [req, drv] = await Promise.all([
      supabase.from('driver_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*').order('orden', { ascending: true }).order('created_at', { ascending: true }),
    ]);
    setPostulaciones(req.data ?? []);
    setChoferes(drv.data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/choferes');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (cargando) return <div className="p-10 text-center text-secondary font-body-md">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const editar = (d: DriverRow) => {
    setFicha({
      id: d.id, nombre: d.nombre ?? '', tipo: d.tipo ?? 'Mototaxi', comite: d.comite ?? '',
      experiencia: d.experiencia ?? '', placa: d.placa ?? '', modelo: d.modelo ?? '',
      sellos: JSON.stringify(d.sellos ?? [], null, 2),
      ruta: d.ruta ?? '', precio: d.precio ?? '', paradero: d.paradero ?? '',
      resena: d.resena ?? '', resena_autor: d.resena_autor ?? '', tel: d.tel ?? '',
      img: d.img ?? '', veh_img: d.veh_img ?? '', ciudad: d.ciudad ?? 'pucallpa',
      orden: d.orden ?? 0, status: d.status ?? 'activo',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const desdePostulacion = async (p: DriverRow) => {
    setFicha({
      ...FICHA_VACIA,
      nombre: p.nombre ?? '', tipo: p.tipo || 'Mototaxi', placa: p.placa ?? '',
      comite: p.zona ?? '', experiencia: p.experiencia ?? '', tel: p.whatsapp ?? '',
      ciudad: p.ciudad || 'pucallpa',
    });
    await supabase.from('driver_requests').update({ status: 'approved' }).eq('id', p.id);
    setPostulaciones((prev) => prev.filter((x) => x.id !== p.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rechazar = async (p: DriverRow) => {
    if (!confirm(`¿Rechazar la postulación de "${p.nombre}"?`)) return;
    await supabase.from('driver_requests').update({ status: 'rejected' }).eq('id', p.id);
    setPostulaciones((prev) => prev.filter((x) => x.id !== p.id));
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMsg('');
    let sellos: unknown = [];
    try { sellos = JSON.parse(ficha.sellos || '[]'); }
    catch { setGuardando(false); setMsg('El campo "sellos" no es JSON válido.'); return; }

    const payload = {
      nombre: ficha.nombre, tipo: ficha.tipo, comite: ficha.comite || null,
      experiencia: ficha.experiencia || null, placa: ficha.placa || null, modelo: ficha.modelo || null,
      sellos, ruta: ficha.ruta || null, precio: ficha.precio || null, paradero: ficha.paradero || null,
      resena: ficha.resena || null, resena_autor: ficha.resena_autor || null, tel: ficha.tel || null,
      img: ficha.img || null, veh_img: ficha.veh_img || null, ciudad: ficha.ciudad,
      orden: Number(ficha.orden) || 0, status: ficha.status,
    };

    const res = ficha.id
      ? await supabase.from('drivers').update(payload).eq('id', ficha.id)
      : await supabase.from('drivers').insert(payload);

    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    setFicha(FICHA_VACIA);
    setMsg(ficha.id ? 'Ficha actualizada.' : 'Chofer agregado.');
    recargar();
  };

  const toggleStatus = async (d: DriverRow) => {
    await supabase.from('drivers').update({ status: d.status === 'activo' ? 'oculto' : 'activo' }).eq('id', d.id);
    recargar();
  };

  const borrar = async (d: DriverRow) => {
    if (!confirm(`¿Borrar a "${d.nombre}" del directorio? No se puede deshacer.`)) return;
    await supabase.from('drivers').delete().eq('id', d.id);
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
            <span className="font-headline-sm text-headline-sm text-on-surface">Choferes · Taxi Seguro</span>
          </div>
          <Link href="/taxi-seguro" className="text-sm text-primary">Ver la página →</Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-10">

        {/* Formulario ficha */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">
            {ficha.id ? 'Editar chofer' : 'Agregar chofer'}
          </h2>
          <form onSubmit={guardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5">
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Nombre
              <input required value={ficha.nombre} onChange={(e) => setFicha({ ...ficha, nombre: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tipo
              <select value={ficha.tipo} onChange={(e) => setFicha({ ...ficha, tipo: e.target.value })} className={campo}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Comité / unidad
              <input value={ficha.comite} onChange={(e) => setFicha({ ...ficha, comite: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Experiencia
              <input value={ficha.experiencia} onChange={(e) => setFicha({ ...ficha, experiencia: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Placa
              <input value={ficha.placa} onChange={(e) => setFicha({ ...ficha, placa: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Modelo
              <input value={ficha.modelo} onChange={(e) => setFicha({ ...ficha, modelo: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ruta habitual
              <input value={ficha.ruta} onChange={(e) => setFicha({ ...ficha, ruta: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tarifa referencial
              <input value={ficha.precio} onChange={(e) => setFicha({ ...ficha, precio: e.target.value })} className={campo} placeholder="S/ 4.00 – S/ 5.00" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Paradero
              <input value={ficha.paradero} onChange={(e) => setFicha({ ...ficha, paradero: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp / tel (E.164 sin +)
              <input value={ficha.tel} onChange={(e) => setFicha({ ...ficha, tel: e.target.value })} className={campo} placeholder="51962000001" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Foto del chofer (URL)
              <input value={ficha.img} onChange={(e) => setFicha({ ...ficha, img: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Foto del vehículo (URL)
              <input value={ficha.veh_img} onChange={(e) => setFicha({ ...ficha, veh_img: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
              <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
              <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Reseña de un vecino
              <input value={ficha.resena} onChange={(e) => setFicha({ ...ficha, resena: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Autor de la reseña
              <input value={ficha.resena_autor} onChange={(e) => setFicha({ ...ficha, resena_autor: e.target.value })} className={campo} placeholder="Carmen Soto, comerciante Mercado 2 (5.0 ★)" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Sellos de confianza (JSON: {'{label, icon, fuerte?}'})
              <textarea value={ficha.sellos} onChange={(e) => setFicha({ ...ficha, sellos: e.target.value })} rows={5} className={`${campo} font-mono text-xs`} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
              <select value={ficha.status} onChange={(e) => setFicha({ ...ficha, status: e.target.value })} className={campo}>
                <option value="activo">Activo (visible)</option>
                <option value="oculto">Oculto</option></select></label>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Agregar chofer'}
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

        {/* Postulaciones */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">
            Postulaciones pendientes {postulaciones.length > 0 && <span className="text-primary">({postulaciones.length})</span>}
          </h2>
          {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
            postulaciones.length === 0 ? <p className="text-secondary text-sm">No hay postulaciones pendientes.</p> : (
            <div className="flex flex-col gap-2">
              {postulaciones.map((p) => (
                <div key={p.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-sm text-on-surface">{p.nombre} · <span className="text-secondary font-normal">{p.tipo}</span></p>
                    <p className="text-xs text-secondary">{[p.zona, p.ciudad, p.placa, p.experiencia].filter(Boolean).join(' · ')}</p>
                    {p.mensaje && <p className="text-xs text-secondary mt-1 italic">“{p.mensaje}”</p>}
                    <p className="text-xs text-secondary mt-1">WhatsApp: {p.whatsapp}</p>
                  </div>
                  <button onClick={() => desdePostulacion(p)} className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg">Aprobar → ficha</button>
                  <button onClick={() => rechazar(p)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">Rechazar</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Directorio */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">Directorio ({choferes.length})</h2>
          {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
            choferes.length === 0 ? <p className="text-secondary text-sm">Todavía no hay choferes en la tabla. La página usa el seed hardcodeado hasta que agregues al menos uno.</p> : (
            <div className="flex flex-col gap-2">
              {choferes.map((d) => (
                <div key={d.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">{d.nombre} <span className="text-secondary font-normal">· {d.tipo} · {d.ciudad}</span></p>
                    <p className="text-xs text-secondary">{[d.comite, d.placa, d.ruta].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => editar(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatus(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {d.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrar(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
