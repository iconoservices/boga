'use client';

// Panel de Choferes (Taxi Seguro) — subruta propia, NO metida en el page.tsx
// gigante de /superadmin. Guard con useEsSuperadmin() como /superadmin/revista.
//
//   - driver_requests (postulaciones del formulario público): aprobar / rechazar.
//     Aprobar precarga la ficha con lo que dejó el chofer.
//   - drivers (el directorio de /transporte): crear, editar, ocultar, borrar.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/uploadClient';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
import SelectorHorario from '@/components/SelectorHorario';
import { coordenadasDeTexto } from '@/lib/ubicacion';
import { disponibleAhora, normalizarHorario, resumenHorario, tieneHorario, type Horario } from '@/lib/horario';

const VERDE = '#00875A';
const TIPOS = ['Mototaxi', 'Auto', 'Moto'];

type DriverRow = Record<string, any>;

// El horario de una postulación o de un chofer: el armado con el selector, o el texto libre de las postulaciones viejas.
const horarioDe = (r: DriverRow): string => resumenHorario(normalizarHorario(r.horario_semana)) || (r.horario ?? '');

const FICHA_VACIA = {
  id: null as string | null,
  nombre: '', dni: '', tipo: 'Mototaxi', comite: '', experiencia: '', placa: '', modelo: '',
  sellos: '[\n  { "label": "DNI Validado", "icon": "badge", "fuerte": true },\n  { "label": "SOAT Vigente", "icon": "health_and_safety", "fuerte": true }\n]',
  ruta: '', precio: '', paradero: '', resena: '', resena_autor: '',
  tel: '', img: '', veh_img: '', ciudad: 'pucallpa', orden: 0, status: 'activo',
  horario: {} as Horario,
  // Lo que escribió el chofer en una postulación vieja (solo de ayuda para armar el horario; no se guarda).
  horario_texto: '',
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
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingVeh, setUploadingVeh] = useState(false);
  const [detalle, setDetalle] = useState<DriverRow | null>(null);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  // Taxi en vivo: enlace privado de cada chofer, sus celulares con avisos y los pedidos recientes.
  const [accesos, setAccesos] = useState<Record<string, DriverRow>>({});
  const [celulares, setCelulares] = useState<Record<string, number>>({});
  const [pedidos, setPedidos] = useState<DriverRow[]>([]);
  const [sinTablasTaxi, setSinTablasTaxi] = useState(false);
  const [appAbierta, setAppAbierta] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [pegado, setPegado] = useState('');
  const imgRef = useRef<HTMLInputElement>(null);
  const vehRef = useRef<HTMLInputElement>(null);

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const [req, drv, acc, pus, ped] = await Promise.all([
      supabase.from('driver_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*').order('orden', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('driver_acceso').select('*'),
      supabase.from('driver_push').select('driver_id'),
      supabase.from('ride_requests').select('*').order('created_at', { ascending: false }).limit(15),
    ]);
    setPostulaciones(req.data ?? []);
    setChoferes(drv.data ?? []);
    setSinTablasTaxi(!!(acc.error || pus.error || ped.error));
    setAccesos(Object.fromEntries((acc.data ?? []).map((a: DriverRow) => [a.driver_id, a])));
    const porChofer: Record<string, number> = {};
    (pus.data ?? []).forEach((r: DriverRow) => { porChofer[r.driver_id] = (porChofer[r.driver_id] ?? 0) + 1; });
    setCelulares(porChofer);
    setPedidos(ped.data ?? []);
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
      id: d.id, nombre: d.nombre ?? '', dni: d.dni ?? '', tipo: d.tipo ?? 'Mototaxi', comite: d.comite ?? '',
      experiencia: d.experiencia ?? '', placa: d.placa ?? '', modelo: d.modelo ?? '',
      sellos: JSON.stringify(d.sellos ?? [], null, 2),
      ruta: d.ruta ?? '', precio: d.precio ?? '', paradero: d.paradero ?? '',
      resena: d.resena ?? '', resena_autor: d.resena_autor ?? '', tel: d.tel ?? '',
      img: d.img ?? '', veh_img: d.veh_img ?? '', ciudad: d.ciudad ?? 'pucallpa',
      orden: d.orden ?? 0, status: d.status ?? 'activo',
      horario: normalizarHorario(d.horario_semana) ?? {}, horario_texto: '',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const desdePostulacion = async (p: DriverRow) => {
    setFicha({
      ...FICHA_VACIA,
      nombre: p.nombre ?? '', dni: p.dni ?? '', tipo: p.tipo || 'Mototaxi', placa: p.placa ?? '',
      comite: p.zona ?? '', experiencia: p.experiencia ?? '', tel: p.whatsapp ?? '',
      ciudad: p.ciudad || 'pucallpa',
      img: p.foto_perfil ?? '',
      veh_img: p.foto_vehiculo ?? '',
      horario: normalizarHorario(p.horario_semana) ?? {},
      horario_texto: normalizarHorario(p.horario_semana) ? '' : (p.horario ?? ''),
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
      nombre: ficha.nombre, dni: ficha.dni || null, tipo: ficha.tipo, comite: ficha.comite || null,
      experiencia: ficha.experiencia || null, placa: ficha.placa || null, modelo: ficha.modelo || null,
      sellos, ruta: ficha.ruta || null, precio: ficha.precio || null, paradero: ficha.paradero || null,
      resena: ficha.resena || null, resena_autor: ficha.resena_autor || null, tel: ficha.tel || null,
      img: ficha.img || null, veh_img: ficha.veh_img || null, ciudad: ficha.ciudad,
      orden: Number(ficha.orden) || 0, status: ficha.status,
      horario_semana: tieneHorario(ficha.horario) ? ficha.horario : null,
    };

    const guardarFila = (fila: Record<string, unknown>) =>
      ficha.id ? supabase.from('drivers').update(fila).eq('id', ficha.id) : supabase.from('drivers').insert(fila);

    let res = await guardarFila(payload);
    // Si todavía no se corrió el SQL del horario, se guarda el resto de la ficha y se avisa.
    let sinColumna = false;
    if (res.error && /horario_semana/.test(res.error.message)) {
      const { horario_semana: _omitido, ...sinHorario } = payload;
      void _omitido;
      res = await guardarFila(sinHorario);
      sinColumna = !res.error;
    }

    setGuardando(false);
    if (res.error) { setMsg(`Error: ${res.error.message}`); return; }
    setFicha(FICHA_VACIA);
    setMsg(sinColumna
      ? 'Guardado, pero el horario NO se guardó: falta correr el SQL de «Horario semanal de los choferes» (supabase_setup.sql).'
      : ficha.id ? 'Ficha actualizada.' : 'Chofer agregado.');
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

  // Crea (si no existe) el acceso privado de un chofer y abre su panel con el enlace.
  const abrirApp = async (d: DriverRow) => {
    if (appAbierta === d.id) { setAppAbierta(null); return; }
    if (!accesos[d.id]) {
      const { error } = await supabase.from('driver_acceso').insert({ driver_id: d.id });
      if (error) { setMsg(`No se pudo crear el acceso: ${error.message}`); return; }
      await recargar();
    }
    setAppAbierta(d.id);
  };

  const enlaceDe = (a: DriverRow) => `${window.location.origin}/transporte/chofer?t=${a.token}`;

  const copiarEnlace = async (a: DriverRow) => {
    try { await navigator.clipboard.writeText(enlaceDe(a)); setCopiado(a.driver_id); setTimeout(() => setCopiado(null), 1800); }
    catch { setMsg('No se pudo copiar. Selecciona el enlace y cópialo a mano.'); }
  };

  // Un enlace nuevo deja sin efecto el anterior (por si se lo pasaron a otra persona o perdió el celular).
  const regenerarEnlace = async (d: DriverRow) => {
    if (!confirm(`¿Generar un enlace nuevo para ${d.nombre}? El anterior dejará de funcionar y tendrá que abrir el nuevo.`)) return;
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const { error } = await supabase.from('driver_acceso').update({ token }).eq('driver_id', d.id);
    if (error) { setMsg(`No se pudo regenerar: ${error.message}`); return; }
    recargar();
  };

  // Guarda el paradero de un chofer desde lo que se pega (link largo de Google Maps o "lat, lng"): así los pedidos ya
  // se ordenan por cercanía aunque él todavía no haya abierto su app.
  const guardarParadero = async (d: DriverRow) => {
    const c = coordenadasDeTexto(pegado);
    if (!c) { setMsg('No encontré coordenadas. Pega el enlace LARGO de Google Maps o las coordenadas (ej. -8.3791, -74.5539). Los enlaces cortos (maps.app.goo.gl) no sirven: ábrelos y copia el enlace de la barra.'); return; }
    const { error } = await supabase.from('driver_acceso').update({ base_lat: c.lat, base_lng: c.lng }).eq('driver_id', d.id);
    if (error) { setMsg(`No se pudo guardar el paradero: ${error.message}`); return; }
    setPegado('');
    setMsg(`Paradero de ${d.nombre} guardado.`);
    recargar();
  };

  const subirFoto = async (e: React.ChangeEvent<HTMLInputElement>, campo: 'img' | 'veh_img') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setUploading = campo === 'img' ? setUploadingImg : setUploadingVeh;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'drivers');
      setFicha((f) => ({ ...f, [campo]: url }));
    } catch (err: any) {
      setMsg(`Error al subir foto: ${err.message}`);
    } finally {
      setUploading(false);
    }
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
            <span className="font-headline-sm text-headline-sm text-on-surface">Choferes · Taxi Seguro</span>
          </div>
          <Link href="/transporte" className="text-sm text-primary">Ver la página →</Link>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-10">

        {/* Formulario ficha */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">
            {ficha.id ? 'Editar chofer' : 'Agregar chofer'}
          </h2>
          <form onSubmit={guardar} className="flex flex-col gap-5">
            {/* Bloque 1: Datos del chofer */}
            <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-surface-container-highest">
                <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Datos del chofer y vehículo</h3>
                  <p className="text-[11px] text-secondary">Información pública que corresponde al conductor y su unidad</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Nombre completo *
                  <input required value={ficha.nombre} onChange={(e) => setFicha({ ...ficha, nombre: e.target.value })} className={campo} placeholder="Ej. Juan Pérez" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">DNI (8 dígitos)
                  <input maxLength={8} value={ficha.dni} onChange={(e) => setFicha({ ...ficha, dni: e.target.value.replace(/\D/g, '') })} className={campo} placeholder="72345678" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp / Teléfono (E.164 sin +) *
                  <input required value={ficha.tel} onChange={(e) => setFicha({ ...ficha, tel: e.target.value })} className={campo} placeholder="51962000001" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tipo de vehículo
                  <select value={ficha.tipo} onChange={(e) => setFicha({ ...ficha, tipo: e.target.value })} className={campo}>
                    {TIPOS.map((t) => <option key={t}>{t}</option>)}</select></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Placa
                  <input value={ficha.placa} onChange={(e) => setFicha({ ...ficha, placa: e.target.value })} className={campo} placeholder="Ej. 1234-5B" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Modelo del vehículo
                  <input value={ficha.modelo} onChange={(e) => setFicha({ ...ficha, modelo: e.target.value })} className={campo} placeholder="Ej. Mototaxi Bajaj Torito 2022" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Comité / N° de Unidad
                  <input value={ficha.comite} onChange={(e) => setFicha({ ...ficha, comite: e.target.value })} className={campo} placeholder="Ej. Comité Los Pinos - Unidad 42" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Años de experiencia
                  <input value={ficha.experiencia} onChange={(e) => setFicha({ ...ficha, experiencia: e.target.value })} className={campo} placeholder="Ej. 5 años" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
                  <select value={ficha.ciudad} onChange={(e) => setFicha({ ...ficha, ciudad: e.target.value })} className={campo}>
                    {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
                <div className="flex flex-col gap-2 text-xs font-bold text-secondary sm:col-span-2">
                  Horario del chofer <span className="font-normal text-[11px]">— con esto el directorio muestra solo quién está disponible ahora</span>
                  {ficha.horario_texto && (
                    <p className="font-medium text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      El chofer escribió: «{ficha.horario_texto}». Arma su horario aquí abajo.
                    </p>
                  )}
                  <SelectorHorario value={ficha.horario} onChange={(h) => setFicha((f) => ({ ...f, horario: h }))} />
                </div>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Foto del chofer (perfil)
                  <div className="flex items-center gap-3 pt-1">
                    {ficha.img && <img src={ficha.img} alt="chofer" className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 shrink-0" />}
                    <button type="button" onClick={() => imgRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-container-highest text-xs font-bold text-on-surface bg-surface-container-low hover:bg-surface-container disabled:opacity-50"
                      disabled={uploadingImg}>
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      {uploadingImg ? 'Subiendo a R2…' : ficha.img ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    {ficha.img && <button type="button" onClick={() => setFicha(f => ({ ...f, img: '' }))} className="text-xs text-red-500 hover:underline">Quitar</button>}
                    <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e, 'img')} />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Foto del vehículo
                  <div className="flex items-center gap-3 pt-1">
                    {ficha.veh_img && <img src={ficha.veh_img} alt="vehículo" className="w-16 h-12 rounded-lg object-cover border border-surface-container-highest shrink-0" />}
                    <button type="button" onClick={() => vehRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-container-highest text-xs font-bold text-on-surface bg-surface-container-low hover:bg-surface-container disabled:opacity-50"
                      disabled={uploadingVeh}>
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      {uploadingVeh ? 'Subiendo a R2…' : ficha.veh_img ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    {ficha.veh_img && <button type="button" onClick={() => setFicha(f => ({ ...f, veh_img: '' }))} className="text-xs text-red-500 hover:underline">Quitar</button>}
                    <input ref={vehRef} type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e, 'veh_img')} />
                  </div>
                </label>
              </div>
            </div>

            {/* Bloque 2: Solo tú / Editorial */}
            <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-200/60 dark:border-blue-900/40">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">admin_panel_settings</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Solo tú — Control Editorial & Curación</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 uppercase tracking-wider">Admin</span>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">Estos campos los configuras tú para posicionar, destacar o enriquecer la ficha en la web pública</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200">Ruta habitual / Zona
                  <input value={ficha.ruta} onChange={(e) => setFicha({ ...ficha, ruta: e.target.value })} className={campo} placeholder="Ej. Mercado Central - Urb. Santa Rosa" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200">Tarifa referencial
                  <input value={ficha.precio} onChange={(e) => setFicha({ ...ficha, precio: e.target.value })} className={campo} placeholder="Ej. S/ 4.00 – S/ 6.00" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200">Paradero habitual
                  <input value={ficha.paradero} onChange={(e) => setFicha({ ...ficha, paradero: e.target.value })} className={campo} placeholder="Ej. Esquina Jr. Comercio con Grau" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200">Orden en lista (menor = sale primero)
                  <input type="number" value={ficha.orden} onChange={(e) => setFicha({ ...ficha, orden: Number(e.target.value) })} className={campo} placeholder="0" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200 sm:col-span-2">Reseña o testimonio de recomendación
                  <input value={ficha.resena} onChange={(e) => setFicha({ ...ficha, resena: e.target.value })} className={campo} placeholder="Ej. Siempre puntual y maneja con mucho cuidado para compras del mercado." /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200 sm:col-span-2">Autor de la reseña / referencia
                  <input value={ficha.resena_autor} onChange={(e) => setFicha({ ...ficha, resena_autor: e.target.value })} className={campo} placeholder="Ej. Carmen Soto, vecina de Bellavista (5.0 ★)" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200 sm:col-span-2">Sellos de confianza (JSON badges)
                  <textarea value={ficha.sellos} onChange={(e) => setFicha({ ...ficha, sellos: e.target.value })} rows={4} className={`${campo} font-mono text-xs`} placeholder='[{"icon":"verified","label":"Conocido"},{"icon":"shield","label":"Brevete A-IIa","fuerte":true}]' /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-blue-950 dark:text-blue-200">Estado de publicación
                  <select value={ficha.status} onChange={(e) => setFicha({ ...ficha, status: e.target.value })} className={campo}>
                    <option value="activo">✅ Activo (visible al público)</option>
                    <option value="oculto">⛔ Oculto (no sale en la lista)</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardando} className="bg-primary text-on-primary font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-60 shadow-sm hover:opacity-95 transition-opacity">
                {guardando ? 'Guardando…' : ficha.id ? 'Guardar cambios' : 'Agregar chofer'}
              </button>
              {ficha.id && (
                <button type="button" onClick={() => { setFicha(FICHA_VACIA); setMsg(''); }} className="text-sm text-secondary underline hover:text-on-surface">
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
                <div key={p.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-4 flex flex-wrap items-center gap-4">
                  {/* Miniaturas de fotos con clic para zoom */}
                  <div className="flex items-center gap-2 shrink-0">
                    {p.foto_perfil ? (
                      <button type="button" onClick={() => setFotoZoom(p.foto_perfil)} title="Clic para ampliar foto de perfil" className="relative group cursor-pointer">
                        <img src={p.foto_perfil} alt="perfil" className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 group-hover:scale-105 transition-transform" />
                        <span className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                          <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                        </span>
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary text-xs font-bold">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                    )}
                    {p.foto_vehiculo && (
                      <button type="button" onClick={() => setFotoZoom(p.foto_vehiculo)} title="Clic para ampliar foto de vehículo" className="relative group cursor-pointer">
                        <img src={p.foto_vehiculo} alt="vehículo" className="w-14 h-12 rounded-lg object-cover border border-surface-container-highest group-hover:scale-105 transition-transform" />
                        <span className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                          <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-sm text-on-surface">
                      {p.nombre} · <span className="text-secondary font-normal">{p.tipo}</span>
                      {p.dni && <span className="ml-2 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface">🪪 DNI: {p.dni}</span>}
                    </p>
                    <p className="text-xs text-secondary">{[p.zona, p.ciudad, p.placa, p.experiencia].filter(Boolean).join(' · ')}</p>
                    {horarioDe(p) && <p className="text-xs text-primary font-medium mt-0.5">🕒 {horarioDe(p)}</p>}
                    {p.mensaje && <p className="text-xs text-secondary mt-1 italic">“{p.mensaje}”</p>}
                    <p className="text-xs text-secondary mt-1">WhatsApp: <a href={`https://wa.me/${p.whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">{p.whatsapp}</a></p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => setDetalle(p)} className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg border border-surface-container-highest text-on-surface hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-[15px]">zoom_in</span>
                      Ver detalle
                    </button>
                    <button onClick={() => desdePostulacion(p)} className="bg-primary text-on-primary text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm hover:opacity-95 transition-opacity">Aprobar → ficha</button>
                    <button onClick={() => rechazar(p)} className="text-xs font-bold px-3 py-2 rounded-lg border border-surface-container-highest text-secondary hover:text-red-600 transition-colors">Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Directorio */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">Directorio ({choferes.length})</h2>
          {cargandoDatos ? <p className="text-secondary text-sm">Cargando…</p> :
            choferes.length === 0 ? <p className="text-secondary text-sm">Todavía no hay choferes en el directorio. Agrega el primero con el formulario de arriba o aprobando una postulación pendiente.</p> : (
            <div className="flex flex-col gap-2">
              {choferes.map((d) => (
                <div key={d.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">
                      {d.nombre} <span className="text-secondary font-normal">· {d.tipo} · {d.ciudad}</span>
                      {d.dni && <span className="text-[11px] font-mono text-secondary ml-2">(DNI: {d.dni})</span>}
                    </p>
                    <p className="text-xs text-secondary">{[d.comite, d.placa, d.ruta].filter(Boolean).join(' · ')}</p>
                    {(() => {
                      const h = normalizarHorario(d.horario_semana);
                      if (!h) return <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Sin horario cargado (no se marca disponible ni fuera de horario)</p>;
                      const ahora = disponibleAhora(h);
                      return (
                        <p className="text-[11px] font-semibold mt-0.5" style={{ color: ahora ? VERDE : '#6b7280' }}>
                          {ahora ? '🟢 Disponible ahora' : '⚪ Fuera de horario'} · {resumenHorario(h)}
                        </p>
                      );
                    })()}
                  </div>
                  <button onClick={() => abrirApp(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest" style={{ color: VERDE }}>
                    {accesos[d.id] ? (celulares[d.id] ? '📲 App ✓' : '📲 App') : '📲 Dar app'}
                  </button>
                  <button onClick={() => editar(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatus(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {d.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrar(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>

                  {appAbierta === d.id && accesos[d.id] && (() => {
                    const a = accesos[d.id];
                    const hace = (iso: string | null) => {
                      if (!iso) return 'nunca';
                      const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
                      return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
                    };
                    const wa = `https://wa.me/${(d.tel || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${String(d.nombre).split(' ')[0]}, este es tu enlace PERSONAL de la app de choferes de BogaHub Taxi Seguro. Ábrelo desde tu celular, toca "Activar avisos" y así te llegan los pedidos de pasajeros cerca de ti. No lo compartas:\n\n${enlaceDe(a)}`)}`;
                    return (
                      <div className="basis-full mt-2 rounded-xl border border-surface-container-highest bg-surface-container-low p-3 flex flex-col gap-2">
                        <p className="text-[11px] font-bold text-secondary uppercase tracking-wider">App del chofer · enlace privado</p>
                        <input readOnly value={enlaceDe(a)} onFocus={(e) => e.currentTarget.select()} className="w-full text-[11px] font-mono bg-white border border-surface-container-highest rounded-lg px-2.5 py-2" />
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => copiarEnlace(a)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest bg-white">{copiado === d.id ? '✓ Copiado' : 'Copiar enlace'}</button>
                          {d.tel && <a href={wa} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: VERDE }}>Enviar por WhatsApp</a>}
                          <button onClick={() => regenerarEnlace(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Generar enlace nuevo</button>
                        </div>
                        <div className="flex gap-2">
                          <input value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder="Paradero: pega el link largo de Google Maps o las coordenadas" className="flex-1 min-w-0 text-[11px] bg-white border border-surface-container-highest rounded-lg px-2.5 py-2" />
                          <button onClick={() => guardarParadero(d)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest bg-white">Guardar paradero</button>
                        </div>
                        <p className="text-[11px] text-secondary font-medium">
                          Avisos: {celulares[d.id] ? `✓ ${celulares[d.id]} celular${celulares[d.id] === 1 ? '' : 'es'}` : '— todavía no los activó'}
                          {' · '}Paradero: {a.base_lat != null ? '✓ guardado' : '— sin guardar'}
                          {' · '}Vio la app: {hace(a.visto_at)}
                          {' · '}Última ubicación: {hace(a.ubicado_at)}
                          {a.pausado ? ' · ⏸ En pausa' : ''}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pedidos de taxi recientes */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">Pedidos de taxi recientes</h2>
          {sinTablasTaxi && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              Falta correr el SQL de «Taxi en vivo» de supabase_setup.sql para activar los pedidos y las apps de los choferes.
            </p>
          )}
          {pedidos.length === 0 ? (
            <p className="text-secondary text-sm">Todavía no hay pedidos.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pedidos.map((r) => {
                const chofer = choferes.find((c) => c.id === r.driver_id);
                const color = r.estado === 'asignado' || r.estado === 'completado' ? VERDE : r.estado === 'buscando' ? '#b45309' : '#6b7280';
                return (
                  <div key={r.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                    <span className="text-[11px] font-extrabold uppercase px-2 py-1 rounded-full border" style={{ color, borderColor: color }}>{r.estado}</span>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-bold text-on-surface">{r.pasajero_nombre} <span className="text-secondary font-normal">· {r.pasajero_tel}</span></p>
                      <p className="text-xs text-secondary">{r.origen_texto || 'ubicación en el mapa'} → {r.destino_texto}{r.oferta ? ` · ofrece S/ ${r.oferta}` : ''}{r.tipo ? ` · ${r.tipo}` : ''}</p>
                      {chofer && <p className="text-xs font-semibold" style={{ color: VERDE }}>Chofer: {chofer.nombre}</p>}
                    </div>
                    <span className="text-[11px] text-secondary font-medium">{new Date(r.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Detalle completo de la Postulación */}
      {detalle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-surface-container-highest pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Postulación Taxi Seguro</span>
                <h3 className="font-headline-md text-xl text-on-surface">{detalle.nombre}</h3>
                <p className="text-xs text-secondary">{detalle.tipo} · {detalle.ciudad}</p>
              </div>
              <button type="button" onClick={() => setDetalle(null)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Fotos grandes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-xl p-3 text-center border border-surface-container-highest">
                <p className="text-[11px] font-bold text-secondary mb-2">Foto de perfil</p>
                {detalle.foto_perfil ? (
                  <img
                    src={detalle.foto_perfil}
                    alt="perfil"
                    onClick={() => setFotoZoom(detalle.foto_perfil)}
                    className="w-full h-36 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity border border-surface-container-highest"
                    title="Clic para ver en pantalla completa"
                  />
                ) : (
                  <div className="h-36 flex items-center justify-center text-secondary text-xs">Sin foto</div>
                )}
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 text-center border border-surface-container-highest">
                <p className="text-[11px] font-bold text-secondary mb-2">Foto del vehículo</p>
                {detalle.foto_vehiculo ? (
                  <img
                    src={detalle.foto_vehiculo}
                    alt="vehículo"
                    onClick={() => setFotoZoom(detalle.foto_vehiculo)}
                    className="w-full h-36 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity border border-surface-container-highest"
                    title="Clic para ver en pantalla completa"
                  />
                ) : (
                  <div className="h-36 flex items-center justify-center text-secondary text-xs">Sin foto</div>
                )}
              </div>
            </div>

            {/* Datos detallados */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-container-low p-2.5 rounded-lg">
                <span className="text-[10px] text-secondary font-bold uppercase block">🪪 DNI</span>
                <span className="font-mono font-bold text-sm text-on-surface">{detalle.dni || 'No registrado'}</span>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-lg">
                <span className="text-[10px] text-secondary font-bold uppercase block">🚘 Placa</span>
                <span className="font-mono font-bold text-sm text-on-surface">{detalle.placa || 'Sin placa'}</span>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-lg">
                <span className="text-[10px] text-secondary font-bold uppercase block">📱 WhatsApp</span>
                <a href={`https://wa.me/${detalle.whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">
                  {detalle.whatsapp} ↗
                </a>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-lg">
                <span className="text-[10px] text-secondary font-bold uppercase block">🕒 Horario habitual</span>
                <span className="font-medium text-on-surface">{horarioDe(detalle) || 'No especificado'}</span>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-lg col-span-2">
                <span className="text-[10px] text-secondary font-bold uppercase block">🏢 Unidad / Comité / Zona</span>
                <span className="font-medium text-on-surface">{detalle.zona || 'Ninguno'}</span>
              </div>
              {detalle.mensaje && (
                <div className="bg-surface-container-low p-2.5 rounded-lg col-span-2">
                  <span className="text-[10px] text-secondary font-bold uppercase block">💬 Mensaje del chofer</span>
                  <p className="font-medium text-on-surface italic mt-0.5">“{detalle.mensaje}”</p>
                </div>
              )}
              {detalle.created_at && (
                <div className="text-[10px] text-secondary col-span-2 pt-1">
                  Enviado el: {new Date(detalle.created_at).toLocaleString('es-PE')}
                </div>
              )}
            </div>

            {/* Acciones del modal */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-highest">
              <button
                type="button"
                onClick={() => { const p = detalle; setDetalle(null); rechazar(p); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                onClick={() => { const p = detalle; setDetalle(null); desdePostulacion(p); }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary shadow-sm hover:opacity-95"
              >
                Aprobar y cargar a formulario →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para ampliar cualquier foto a pantalla completa */}
      {fotoZoom && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFotoZoom(null)}>
          <div className="relative max-w-3xl max-h-[85vh]">
            <img src={fotoZoom} alt="Zoom" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              type="button"
              onClick={() => setFotoZoom(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-black shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
