'use client';

// Panel de Alquileres ("Dónde quedarte") — subruta propia, guard con
// useEsSuperadmin() como /superadmin/choferes.
//
//   - rental_listings (pestaña "En Alquiler" de /inmuebles): crear, editar, ocultar, borrar.
//   - sale_listings (pestaña "En Venta" de /inmuebles): idem.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CIUDADES } from '@/lib/ciudades';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

const VERDE = '#00875A';
const TIPOS = ['Habitación', 'Mini-dpto', 'Casa', 'Pensión'];
const TIPOS_VENTA = ['Terreno', 'Lote', 'Casa', 'Chacra'];

type ListingRow = Record<string, any>;

const FICHA_VACIA = {
  id: null as string | null,
  tipo: 'Habitación', titulo: '', descripcion: '', zona: '', precio: '',
  extras: '["Baño propio", "Wifi"]',
  incluye_servicios: false, incluye_comidas: false, verificado: false,
  wsp: '', img: '', ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type Ficha = typeof FICHA_VACIA;

type SaleRow = Record<string, any>;
const FICHA_VENTA_VACIA = {
  id: null as string | null,
  tipo: 'Terreno', titulo: '', descripcion: '', zona: '', precio: '', moneda: 'PEN', area: '',
  extras: '["Título saneado"]',
  wsp: '', img: '', ciudad: 'pucallpa', orden: 0, status: 'activo',
};
type FichaVenta = typeof FICHA_VENTA_VACIA;

export default function AlquileresAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const [ventas, setVentas] = useState<SaleRow[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [fichaVenta, setFichaVenta] = useState<FichaVenta>(FICHA_VENTA_VACIA);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [msgVenta, setMsgVenta] = useState('');

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

  const recargarVentas = useCallback(async () => {
    setCargandoVentas(true);
    const { data } = await supabase
      .from('sale_listings')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });
    setVentas(data ?? []);
    setCargandoVentas(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/alquileres');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => { if (esSuperadmin) { recargar(); recargarVentas(); } }, [esSuperadmin, recargar, recargarVentas]);

  if (cargando) return <div className="p-10 text-center text-secondary font-body-md">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const editar = (a: ListingRow) => {
    setFicha({
      id: a.id, tipo: a.tipo ?? 'Habitación', titulo: a.titulo ?? '', descripcion: a.descripcion ?? '', zona: a.zona ?? '',
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
      tipo: ficha.tipo, titulo: ficha.titulo, descripcion: ficha.descripcion || null, zona: ficha.zona || null,
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

  const editarVenta = (v: SaleRow) => {
    setFichaVenta({
      id: v.id, tipo: v.tipo ?? 'Terreno', titulo: v.titulo ?? '', descripcion: v.descripcion ?? '',
      zona: v.zona ?? '', precio: v.precio ?? '', moneda: v.moneda ?? 'PEN', area: v.area ?? '',
      extras: JSON.stringify(v.extras ?? [], null, 2),
      wsp: v.wsp ?? '', img: v.img ?? '',
      ciudad: v.ciudad ?? 'pucallpa', orden: v.orden ?? 0, status: v.status ?? 'activo',
    });
    setMsgVenta('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoVenta(true);
    setMsgVenta('');
    let extras: unknown = [];
    try { extras = JSON.parse(fichaVenta.extras || '[]'); }
    catch { setGuardandoVenta(false); setMsgVenta('El campo "extras" no es JSON válido.'); return; }

    const payload = {
      tipo: fichaVenta.tipo, titulo: fichaVenta.titulo, descripcion: fichaVenta.descripcion || null,
      zona: fichaVenta.zona || null, precio: Number(fichaVenta.precio) || 0, moneda: fichaVenta.moneda,
      area: fichaVenta.area || null, extras,
      wsp: fichaVenta.wsp || null, img: fichaVenta.img || null,
      ciudad: fichaVenta.ciudad, orden: Number(fichaVenta.orden) || 0, status: fichaVenta.status,
    };

    const res = fichaVenta.id
      ? await supabase.from('sale_listings').update(payload).eq('id', fichaVenta.id)
      : await supabase.from('sale_listings').insert(payload);

    setGuardandoVenta(false);
    if (res.error) { setMsgVenta(`Error: ${res.error.message}`); return; }
    setFichaVenta(FICHA_VENTA_VACIA);
    setMsgVenta(fichaVenta.id ? 'Aviso actualizado.' : 'Aviso agregado.');
    recargarVentas();
  };

  const toggleStatusVenta = async (v: SaleRow) => {
    await supabase.from('sale_listings').update({ status: v.status === 'activo' ? 'oculto' : 'activo' }).eq('id', v.id);
    recargarVentas();
  };

  const borrarVenta = async (v: SaleRow) => {
    if (!confirm(`¿Borrar el aviso "${v.titulo}"? No se puede deshacer.`)) return;
    await supabase.from('sale_listings').delete().eq('id', v.id);
    recargarVentas();
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
            <span className="font-headline-sm text-headline-sm text-on-surface">Alquileres · Dónde quedarte</span>
          </div>
          <Link href="/inmuebles" className="text-sm text-primary">Ver la página →</Link>
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
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Descripción (para la ficha ampliada)
              <textarea value={ficha.descripcion} onChange={(e) => setFicha({ ...ficha, descripcion: e.target.value })} rows={4} className={campo} placeholder="Detalle del lugar: comodidades, reglas, cómo llegar…" /></label>
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
          <h2 className="font-headline-md text-lg text-on-surface mb-3">En Alquiler ({listings.length})</h2>
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

        {/* Formulario venta */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">
            {fichaVenta.id ? 'Editar aviso de venta' : 'Agregar aviso de venta'}
          </h2>
          <form onSubmit={guardarVenta} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5">
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Título
              <input required value={fichaVenta.titulo} onChange={(e) => setFichaVenta({ ...fichaVenta, titulo: e.target.value })} className={campo} placeholder="Terreno 200 m² con título de propiedad" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Tipo
              <select value={fichaVenta.tipo} onChange={(e) => setFichaVenta({ ...fichaVenta, tipo: e.target.value })} className={campo}>
                {TIPOS_VENTA.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Zona
              <input value={fichaVenta.zona} onChange={(e) => setFichaVenta({ ...fichaVenta, zona: e.target.value })} className={campo} placeholder="Campo Verde" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Descripción (para la ficha ampliada)
              <textarea value={fichaVenta.descripcion} onChange={(e) => setFichaVenta({ ...fichaVenta, descripcion: e.target.value })} rows={4} className={campo} placeholder="Detalle del inmueble: documentación, servicios, cómo llegar…" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio
              <input type="number" min="0" step="0.01" value={fichaVenta.precio} onChange={(e) => setFichaVenta({ ...fichaVenta, precio: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Moneda
              <select value={fichaVenta.moneda} onChange={(e) => setFichaVenta({ ...fichaVenta, moneda: e.target.value })} className={campo}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option></select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Área
              <input value={fichaVenta.area} onChange={(e) => setFichaVenta({ ...fichaVenta, area: e.target.value })} className={campo} placeholder="200 m² o 5 ha" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">WhatsApp (E.164 sin +)
              <input value={fichaVenta.wsp} onChange={(e) => setFichaVenta({ ...fichaVenta, wsp: e.target.value })} className={campo} placeholder="51963000001" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Foto (URL)
              <input value={fichaVenta.img} onChange={(e) => setFichaVenta({ ...fichaVenta, img: e.target.value })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ciudad
              <select value={fichaVenta.ciudad} onChange={(e) => setFichaVenta({ ...fichaVenta, ciudad: e.target.value })} className={campo}>
                {CIUDADES.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Orden (menor = primero)
              <input type="number" value={fichaVenta.orden} onChange={(e) => setFichaVenta({ ...fichaVenta, orden: Number(e.target.value) })} className={campo} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary sm:col-span-2">Extras (JSON: lista de textos)
              <textarea value={fichaVenta.extras} onChange={(e) => setFichaVenta({ ...fichaVenta, extras: e.target.value })} rows={4} className={`${campo} font-mono text-xs`} /></label>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Estado
              <select value={fichaVenta.status} onChange={(e) => setFichaVenta({ ...fichaVenta, status: e.target.value })} className={campo}>
                <option value="activo">Activo (visible)</option>
                <option value="oculto">Oculto</option></select></label>
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <button type="submit" disabled={guardandoVenta} className="bg-primary text-on-primary font-bold text-sm px-5 py-2.5 rounded-xl disabled:opacity-60">
                {guardandoVenta ? 'Guardando…' : fichaVenta.id ? 'Guardar cambios' : 'Agregar aviso'}
              </button>
              {fichaVenta.id && (
                <button type="button" onClick={() => { setFichaVenta(FICHA_VENTA_VACIA); setMsgVenta(''); }} className="text-sm text-secondary underline">
                  Cancelar edición
                </button>
              )}
              {msgVenta && <span className="text-xs font-bold text-primary">{msgVenta}</span>}
            </div>
          </form>
        </section>

        {/* Directorio de ventas */}
        <section>
          <h2 className="font-headline-md text-lg text-on-surface mb-3">En Venta ({ventas.length})</h2>
          {cargandoVentas ? <p className="text-secondary text-sm">Cargando…</p> :
            ventas.length === 0 ? <p className="text-secondary text-sm">Todavía no hay avisos en la tabla. La página usa el seed hardcodeado hasta que agregues al menos uno.</p> : (
            <div className="flex flex-col gap-2">
              {ventas.map((v) => (
                <div key={v.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${v.status === 'activo' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-sm text-on-surface">{v.titulo} <span className="text-secondary font-normal">· {v.tipo} · {v.ciudad}</span></p>
                    <p className="text-xs text-secondary">{[v.zona, `${v.moneda === 'USD' ? 'US$' : 'S/'} ${v.precio}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => editarVenta(v)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-on-surface">Editar</button>
                  <button onClick={() => toggleStatusVenta(v)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-surface-container-highest text-secondary">
                    {v.status === 'activo' ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => borrarVenta(v)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-red-600">Borrar</button>
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
