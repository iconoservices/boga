'use client';

// Productos de DEMO de una plantilla (/superadmin/plantillas/<id>). Es lo que se ve en
// /preview/<id> y en las tarjetas de /productos. Se guardan en `products` bajo la "tienda"
// reservada __demo_<id> (ver lib/demoPlantilla.ts): no hace falta crear una tienda ni tocar
// la base de datos. Si no hay ninguno, la demo usa los de ejemplo que trae el código.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { refrescarTienda } from '@/lib/refrescar';
import { useEsSuperadmin } from '@/lib/superadmin';
import { uploadFile } from '@/lib/uploadClient';
import { getTemplate, getDemoProducts } from '@/lib/templates.config';
import { demoSlug } from '@/lib/demoPlantilla';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';

type Fila = Record<string, any>;

// Enlace de Google Maps dentro de la descripción de un terreno (mismo criterio que templates/terrenos).
const RE_MAPS = /https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s)]*/i;

const VACIO = { id: null as string | null, name: '', price: '', category: '', area: '', ubicacion: '', desc: '', image: '' };
type Ficha = typeof VACIO;

export default function ProductosDemoPlantilla() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const tpl = getTemplate(id);
  const slug = demoSlug(id);
  const esTerreno = id === 'terreno1' || id === 'terreno2';

  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [ficha, setFicha] = useState<Ficha>(VACIO);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase
      .from('products')
      .select('id,name,price,category,subcategory,image,description')
      .eq('store', slug)
      .order('created_at', { ascending: true });
    setFilas(data ?? []);
    setCargandoDatos(false);
  }, [slug]);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace(`/login?redirect=/superadmin/plantillas/${id}`);
  }, [cargando, esSuperadmin, router, id]);
  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (!esSuperadmin) return null;
  if (!tpl) {
    return <div className="p-8 text-sm">Esa plantilla no existe. <Link href="/superadmin/plantillas" className="text-primary underline">Volver</Link></div>;
  }

  const publicar = async () => { await refrescarTienda(slug); recargar(); };
  const campo = 'w-full bg-surface-container-low border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';

  const cerrar = () => { setModal(false); setFicha(VACIO); setArchivo(null); setMsg(''); };

  const nuevo = () => { setFicha({ ...VACIO, category: tpl.categories[0]?.name ?? '' }); setArchivo(null); setMsg(''); setModal(true); };

  const editar = (r: Fila) => {
    const desc = String(r.description ?? '');
    setFicha({
      id: r.id, name: r.name ?? '', price: String(r.price ?? ''), category: r.category ?? '',
      area: r.subcategory ?? '',
      ubicacion: desc.match(RE_MAPS)?.[0] ?? '',
      desc: desc.replace(RE_MAPS, '').trim(),
      image: r.image ?? '',
    });
    setArchivo(null); setMsg(''); setModal(true);
  };

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!archivo && !ficha.image) { setMsg('Falta la foto del producto.'); return; }
    setGuardando(true);
    setMsg('');
    try {
      const imagen = archivo ? await uploadFile(archivo, `product-images/demo-${id}`) : ficha.image;
      const payload = {
        name: ficha.name.trim(),
        store: slug,
        price: parseFloat(ficha.price) || 0,
        category: ficha.category,
        subcategory: ficha.area.trim() || null,
        image: imagen,
        // El enlace de ubicación de un terreno va al final de la descripción (la plantilla lo detecta).
        description: (esTerreno && ficha.ubicacion.trim() ? `${ficha.desc.trim()}\n${ficha.ubicacion.trim()}` : ficha.desc).trim() || null,
        stock: null,
        status: 'Activo',
      };
      const res = ficha.id
        ? await supabase.from('products').update(payload).eq('id', ficha.id)
        : await supabase.from('products').insert(payload);
      if (res.error) throw res.error;
      const editando = Boolean(ficha.id);
      cerrar();
      setMsg(editando ? 'Producto actualizado.' : 'Producto agregado.');
      publicar();
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? e}`);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (r: Fila) => {
    if (!confirm(`¿Borrar "${r.name}" de la demo?`)) return;
    await supabase.from('products').delete().eq('id', r.id);
    publicar();
  };

  // Copia los productos de ejemplo del código a la base, para poder editarlos uno por uno.
  const cargarEjemplos = async () => {
    const demo = getDemoProducts(id);
    if (demo.length === 0) return;
    setGuardando(true);
    const { error } = await supabase.from('products').insert(demo.map((p) => ({
      name: p.name, store: slug, price: p.price, category: p.category, subcategory: p.subcategory || null,
      image: p.image, description: p.description || null, stock: null, status: 'Activo',
    })));
    setGuardando(false);
    setMsg(error ? `Error: ${error.message}` : 'Ejemplos cargados: ya puedes editarlos.');
    if (!error) publicar();
  };

  // Vuelve a los de ejemplo del código (borra los guardados).
  const restaurar = async () => {
    if (!confirm('¿Borrar los productos guardados y volver a los de ejemplo del código?')) return;
    await supabase.from('products').delete().eq('store', slug);
    setMsg('Listo: la demo vuelve a usar los ejemplos del código.');
    publicar();
  };

  const vistaPrevia = archivo ? URL.createObjectURL(archivo) : ficha.image;

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>
      <div className="flex-1 min-w-0 bg-background text-on-background font-body-md">
        <header className="border-b border-surface-container-highest bg-surface">
          <div className="max-w-[900px] mx-auto px-container-margin py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/superadmin/plantillas" className="text-secondary hover:text-primary text-sm flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Plantillas
              </Link>
              <span className="text-secondary">/</span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">Productos de demo · {tpl.name}</span>
            </div>
            <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary shrink-0">Ver la demo →</a>
          </div>
        </header>

        <main className="max-w-[900px] mx-auto px-container-margin py-8 flex flex-col gap-5">
          <p className="text-sm text-secondary">
            Estos son los productos que se ven en la demo de <b>{tpl.name}</b> (y en su tarjeta de Productos). Cámbialos con tus propias fotos y datos.
            Si no guardas ninguno, la demo usa los ejemplos del código.
          </p>

          <div className="flex flex-wrap gap-2">
            <button onClick={nuevo} className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">add</span> Agregar producto
            </button>
            {filas.length === 0 && getDemoProducts(id).length > 0 && (
              <button onClick={cargarEjemplos} disabled={guardando} className="px-4 py-2 rounded-full border border-surface-container-highest text-sm font-bold text-secondary disabled:opacity-60">
                Cargar los ejemplos para editarlos
              </button>
            )}
            {filas.length > 0 && (
              <button onClick={restaurar} className="px-4 py-2 rounded-full border border-surface-container-highest text-sm font-bold text-secondary">
                Volver a los ejemplos del código
              </button>
            )}
          </div>

          {msg && !modal && <p className="text-sm font-semibold text-primary">{msg}</p>}

          {cargandoDatos ? (
            <p className="text-sm text-secondary">Cargando…</p>
          ) : filas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-container-highest p-8 text-center text-sm text-secondary">
              Todavía no hay productos guardados: la demo muestra los {getDemoProducts(id).length} ejemplos del código.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filas.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-surface-container-highest p-3 flex gap-3">
                  <img src={r.image} alt="" className="w-24 h-20 rounded-lg object-cover shrink-0 bg-surface-container-low" />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <p className="font-headline-sm text-sm text-on-surface line-clamp-2 leading-tight">{r.name}</p>
                    <p className="text-xs text-secondary mt-0.5">{r.category}{r.subcategory ? ` · ${r.subcategory}` : ''}</p>
                    <p className="text-sm font-bold text-primary mt-auto">S/ {Number(r.price).toLocaleString('en-US')}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => editar(r)} className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center" title="Editar"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onClick={() => borrar(r)} className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-red-600" title="Borrar"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-3" onClick={cerrar}>
          <form onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-[520px] max-h-[92vh] overflow-y-auto p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-base">{ficha.id ? 'Editar producto de demo' : 'Nuevo producto de demo'}</h2>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>

            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Nombre
              <input required value={ficha.name} onChange={(e) => setFicha({ ...ficha, name: e.target.value })} className={campo} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Precio (S/)
                <input required type="number" min="0" step="0.01" value={ficha.price} onChange={(e) => setFicha({ ...ficha, price: e.target.value })} className={campo} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">{esTerreno ? 'Zona' : 'Categoría'}
                <select required value={ficha.category} onChange={(e) => setFicha({ ...ficha, category: e.target.value })} className={campo}>
                  {tpl.categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">{esTerreno ? 'Área del terreno' : 'Sección (opcional)'}
              <input value={ficha.area} onChange={(e) => setFicha({ ...ficha, area: e.target.value })} placeholder={esTerreno ? 'Ej. 200 m² o 1 hectárea' : 'Título separador…'} className={campo} />
            </label>
            {esTerreno && (
              <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Ubicación (enlace de Google Maps)
                <input value={ficha.ubicacion} onChange={(e) => setFicha({ ...ficha, ubicacion: e.target.value })} placeholder="https://maps.app.goo.gl/…" className={campo} />
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs font-bold text-secondary">Descripción
              <textarea rows={3} value={ficha.desc} onChange={(e) => setFicha({ ...ficha, desc: e.target.value })} className={campo} />
            </label>
            <div className="flex flex-col gap-1 text-xs font-bold text-secondary">Foto
              {/* Zona de foto: clic, arrastrar o pegar */}
              <label
                tabIndex={0}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.type.startsWith('image/')) setArchivo(f);
                }}
                onPaste={(e) => {
                  const f = Array.from(e.clipboardData.files)[0]
                    || Array.from(e.clipboardData.items).find((it) => it.type.startsWith('image/'))?.getAsFile();
                  if (f) setArchivo(f);
                }}
                className="group relative w-full h-44 rounded-lg border-2 border-dashed border-surface-container-highest bg-surface-container-low flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden hover:bg-surface-container focus:outline-none focus:border-primary transition-colors"
              >
                {vistaPrevia ? (
                  <>
                    <img src={vistaPrevia} alt="" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">Cambiar foto</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[32px] text-secondary">add_a_photo</span>
                    <span className="text-xs font-bold text-secondary">Clic, arrastra o pega la foto</span>
                    <span className="text-[10px] font-normal text-secondary/70">Recomendado cuadrada (1:1)</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="sr-only" />
              </label>
            </div>

            {msg && <p className="text-xs font-semibold text-red-600">{msg}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={cerrar} className="px-4 py-2.5 rounded-full border border-surface-container-highest text-sm font-bold text-secondary">Cancelar</button>
              <button type="submit" disabled={guardando} className="flex-1 px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold disabled:opacity-60">{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
