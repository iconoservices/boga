'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useEsSuperadmin, usePuedeEditarRevista } from '@/lib/superadmin';
import { uploadFile } from '@/lib/uploadClient';
import { SECCIONES, slugify } from '@/lib/revista';
import type { NotaFila } from '@/lib/revista.data';

// Panel de gestión de la Revista ("Yo Soy de la Selva").
// - Redactores: crean y editan notas, las dejan en borrador / "en revisión".
// - Superadmin: además publica/despublica y administra la lista de redactores.
// Las fotos van a Cloudflare R2 vía /api/upload (carpeta "revista/").

type Estado = 'borrador' | 'en_revision' | 'publicada';

type Form = {
  id: string | null;
  slug: string;
  kicker: string;
  titulo: string;
  dek: string;
  autor_nombre: string;
  fecha: string;        // yyyy-mm-dd
  lectura: string;
  img: string;
  img_credito: string;
  cuerpo: string;       // párrafos separados por línea en blanco
  cita_texto: string;
  cita_autor: string;
  ubicacion_maps: string;
  fuente_nombre: string;
  fuente_url: string;
  destacado: boolean;
  portada: boolean;
  estado: Estado;
};

const HOY = () => new Date().toISOString().slice(0, 10);

const FORM_VACIO: Form = {
  id: null, slug: '', kicker: 'Actualidad', titulo: '', dek: '', autor_nombre: 'Redacción Boga',
  fecha: HOY(), lectura: '3 min', img: '', img_credito: '', cuerpo: '',
  cita_texto: '', cita_autor: '', ubicacion_maps: '', fuente_nombre: '', fuente_url: '',
  destacado: false, portada: false, estado: 'borrador',
};

function filaAForm(f: NotaFila): Form {
  return {
    id: f.id, slug: f.slug, kicker: f.kicker, titulo: f.titulo, dek: f.dek,
    autor_nombre: f.autor_nombre, fecha: (f.fecha || '').slice(0, 10), lectura: f.lectura,
    img: f.img, img_credito: f.img_credito,
    cuerpo: (Array.isArray(f.cuerpo) ? f.cuerpo : []).join('\n\n'),
    cita_texto: f.cita?.texto ?? '', cita_autor: f.cita?.autor ?? '',
    ubicacion_maps: f.ubicacion_maps ?? '',
    fuente_nombre: f.fuente?.nombre ?? '', fuente_url: f.fuente?.url ?? '',
    destacado: f.destacado, portada: f.portada, estado: f.estado,
  };
}

function formAFila(form: Form, autorId: string | null) {
  const cuerpo = form.cuerpo.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return {
    slug: form.slug.trim(),
    kicker: form.kicker,
    titulo: form.titulo.trim(),
    dek: form.dek.trim(),
    autor_id: autorId,
    autor_nombre: form.autor_nombre.trim() || 'Redacción Boga',
    fecha: form.fecha || HOY(),
    lectura: form.lectura.trim() || '3 min',
    img: form.img.trim(),
    img_credito: form.img_credito.trim(),
    cuerpo,
    cita: form.cita_texto.trim() ? { texto: form.cita_texto.trim(), autor: form.cita_autor.trim() } : null,
    ubicacion_maps: form.ubicacion_maps.trim() || null,
    fuente: form.fuente_nombre.trim() ? { nombre: form.fuente_nombre.trim(), url: form.fuente_url.trim() || undefined } : null,
    destacado: form.destacado,
    portada: form.portada,
  };
}

const CHIP: Record<Estado, string> = {
  borrador: 'bg-white/10 text-white/60',
  en_revision: 'bg-amber-500/20 text-amber-300',
  publicada: 'bg-emerald-500/20 text-emerald-300',
};
const CHIP_TXT: Record<Estado, string> = {
  borrador: 'Borrador', en_revision: 'En revisión', publicada: 'Publicada',
};

const inp = 'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40';
const lbl = 'text-white/60 text-xs font-semibold uppercase tracking-wide';

export default function AdminRevista() {
  const { user, session } = useAuth();
  const { esSuperadmin } = useEsSuperadmin();
  const { puede, cargando } = usePuedeEditarRevista();
  const router = useRouter();

  const [notas, setNotas] = React.useState<NotaFila[]>([]);
  const [cargandoLista, setCargandoLista] = React.useState(true);
  const [filtro, setFiltro] = React.useState<'todas' | Estado>('todas');
  const [form, setForm] = React.useState<Form | null>(null);
  const [slugTocado, setSlugTocado] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [subiendo, setSubiendo] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const [redactores, setRedactores] = React.useState<{ email: string; name: string | null }[]>([]);
  const [nuevoRedactor, setNuevoRedactor] = React.useState('');

  React.useEffect(() => {
    if (cargando) return;
    if (!user) { router.replace('/login'); return; }
    if (!puede) { router.replace('/admin'); }
  }, [cargando, user, puede, router]);

  const cargarNotas = React.useCallback(async () => {
    setCargandoLista(true);
    const { data, error } = await supabase
      .from('revista_notas')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) setMsg(error.message);
    setNotas((data as NotaFila[]) ?? []);
    setCargandoLista(false);
  }, []);

  const cargarRedactores = React.useCallback(async () => {
    const { data } = await supabase.from('profiles').select('email,name,rol').eq('rol', 'redactor');
    setRedactores((data as { email: string; name: string | null }[]) ?? []);
  }, []);

  React.useEffect(() => {
    if (puede) cargarNotas();
    if (esSuperadmin) cargarRedactores();
  }, [puede, esSuperadmin, cargarNotas, cargarRedactores]);

  if (cargando || !user || !puede) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
      </div>
    );
  }

  const token = session?.access_token;

  const revalidar = async () => {
    if (!token) return;
    await fetch('/api/revista/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  };

  const abrirNueva = () => { setForm({ ...FORM_VACIO }); setSlugTocado(false); setMsg(null); };
  const abrirEditar = (f: NotaFila) => { setForm(filaAForm(f)); setSlugTocado(true); setMsg(null); };
  const cerrar = () => { setForm(null); setMsg(null); };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const onTitulo = (v: string) => {
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, titulo: v };
      if (!slugTocado) next.slug = slugify(v);
      return next;
    });
  };

  const subirFoto = async (file: File) => {
    setSubiendo(true); setMsg(null);
    try {
      const url = await uploadFile(file, 'revista');
      set('img', url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setSubiendo(false);
    }
  };

  const validar = (f: Form): string | null => {
    if (!f.titulo.trim()) return 'Falta el título';
    if (!f.slug.trim()) return 'Falta el slug (URL)';
    if (!f.dek.trim()) return 'Falta la bajada';
    if (!f.img.trim()) return 'Falta la foto';
    if (!f.img_credito.trim()) return 'El crédito de la foto es obligatorio';
    if (formAFila(f, null).cuerpo.length === 0) return 'El cuerpo no puede estar vacío';
    return null;
  };

  const guardar = async (nuevoEstado: Estado) => {
    if (!form) return;
    const err = validar(form);
    if (err) { setMsg(err); return; }
    setGuardando(true); setMsg(null);

    const fila = { ...formAFila(form, user.id), estado: nuevoEstado } as Record<string, unknown>;
    if (nuevoEstado === 'publicada') fila.published_at = new Date().toISOString();

    // Solo puede haber una portada: si esta la marca, desmarcar las demás.
    if (form.portada) {
      await supabase.from('revista_notas').update({ portada: false }).eq('portada', true);
    }

    let error;
    if (form.id) {
      ({ error } = await supabase.from('revista_notas').update(fila).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('revista_notas').insert(fila));
    }
    setGuardando(false);

    if (error) { setMsg(error.message); return; }
    await revalidar();
    setForm(null);
    cargarNotas();
  };

  const despublicar = async (f: NotaFila) => {
    await supabase.from('revista_notas').update({ estado: 'borrador' }).eq('id', f.id);
    await revalidar();
    cargarNotas();
  };

  const borrar = async (f: NotaFila) => {
    if (!confirm(`¿Borrar "${f.titulo}"? No se puede deshacer.`)) return;
    const { error } = await supabase.from('revista_notas').delete().eq('id', f.id);
    if (error) { setMsg(error.message); return; }
    await revalidar();
    cargarNotas();
  };

  const toggleRedactor = async (correo: string, activar: boolean) => {
    const { error } = await supabase.rpc('set_rol_redactor', { correo: correo.trim().toLowerCase(), activar });
    if (error) { setMsg(error.message); return; }
    setNuevoRedactor('');
    cargarRedactores();
  };

  const tablaVacia = !cargandoLista && notas.length === 0;
  const lista = filtro === 'todas' ? notas : notas.filter((n) => n.estado === filtro);

  return (
    <div className="min-h-screen bg-[#0f1115] text-white px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Revista · Yo Soy de la Selva</h1>
            <p className="text-white/50 text-sm mt-1">
              {esSuperadmin
                ? 'Creás, editás y publicás notas. Solo vos publicás.'
                : 'Creás y editás notas. El superadmin las publica.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/superadmin" className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-sm hover:bg-white/10">← Panel</Link>
            <button onClick={abrirNueva} className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400">+ Nueva nota</button>
          </div>
        </div>

        {msg && <div className="rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-sm px-4 py-2">{msg}</div>}

        {tablaVacia && esSuperadmin && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-white/70">La tabla está vacía. Importá las 26 notas originales para empezar.</p>
            <button
              onClick={async () => {
                if (!token) return;
                setMsg(null);
                const r = await fetch('/api/revista/seed', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                const j = await r.json();
                if (!r.ok) { setMsg(j.error || 'Error al importar'); return; }
                await revalidar();
                cargarNotas();
              }}
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-sm"
            >
              Importar las 26 notas actuales
            </button>
          </div>
        )}

        {/* ---------- Formulario ---------- */}
        {form && (
          <div className="rounded-xl border border-white/15 bg-white/[0.03] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{form.id ? 'Editar nota' : 'Nueva nota'}</h2>
              <button onClick={cerrar} className="text-white/50 hover:text-white text-sm">Cerrar ✕</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className={lbl}>Sección</span>
                <select value={form.kicker} onChange={(e) => set('kicker', e.target.value)} className={inp}>
                  {SECCIONES.map((s) => <option key={s} value={s} className="bg-[#0f1115]">{s}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={lbl}>Fecha</span>
                <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className={inp} />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className={lbl}>Título</span>
              <input value={form.titulo} onChange={(e) => onTitulo(e.target.value)} className={inp} placeholder="Título de la nota" />
            </label>

            <label className="flex flex-col gap-1">
              <span className={lbl}>Slug (URL) · /revista/<span className="text-white/40">{form.slug || '…'}</span></span>
              <input
                value={form.slug}
                onChange={(e) => { setSlugTocado(true); set('slug', slugify(e.target.value)); }}
                className={inp}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={lbl}>Bajada (dek)</span>
              <textarea value={form.dek} onChange={(e) => set('dek', e.target.value)} rows={2} className={inp} />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className={lbl}>Autor (firma)</span>
                <input value={form.autor_nombre} onChange={(e) => set('autor_nombre', e.target.value)} className={inp} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={lbl}>Tiempo de lectura</span>
                <input value={form.lectura} onChange={(e) => set('lectura', e.target.value)} className={inp} placeholder="3 min" />
              </label>
            </div>

            {/* Imagen */}
            <div className="flex flex-col gap-2 rounded-lg border border-white/10 p-3">
              <span className={lbl}>Foto</span>
              {form.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.img} alt="" className="w-full max-h-52 object-cover rounded-md" />
              )}
              <div className="flex gap-2 items-center flex-wrap">
                <input value={form.img} onChange={(e) => set('img', e.target.value)} className={inp + ' flex-1 min-w-[200px]'} placeholder="Pegá la URL (ej. Wikimedia) o subí un archivo →" />
                <label className="px-3 py-2 rounded-lg bg-white/10 text-sm cursor-pointer hover:bg-white/20 whitespace-nowrap">
                  {subiendo ? 'Subiendo…' : 'Subir archivo'}
                  <input type="file" accept="image/*" className="hidden" disabled={subiendo}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFoto(f); }} />
                </label>
              </div>
              <input
                value={form.img_credito}
                onChange={(e) => set('img_credito', e.target.value)}
                className={inp}
                placeholder="Crédito de la foto (obligatorio) — ej. Foto: Wikimedia Commons"
              />
            </div>

            <label className="flex flex-col gap-1">
              <span className={lbl}>Cuerpo · un párrafo por bloque, separá con una línea en blanco</span>
              <textarea value={form.cuerpo} onChange={(e) => set('cuerpo', e.target.value)} rows={8} className={inp} />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className={lbl}>Cita — texto (opcional)</span>
                <input value={form.cita_texto} onChange={(e) => set('cita_texto', e.target.value)} className={inp} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={lbl}>Cita — autor</span>
                <input value={form.cita_autor} onChange={(e) => set('cita_autor', e.target.value)} className={inp} />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className={lbl}>Ubicación para el botón «Cómo llegar» (opcional) — texto que se busca en Google Maps</span>
              <input value={form.ubicacion_maps} onChange={(e) => set('ubicacion_maps', e.target.value)} className={inp} placeholder="Laguna de Yarinacocha, Pucallpa, Perú" />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className={lbl}>Fuente — nombre (opcional)</span>
                <input value={form.fuente_nombre} onChange={(e) => set('fuente_nombre', e.target.value)} className={inp} placeholder="pucallpa.com" />
              </label>
              <label className="flex flex-col gap-1">
                <span className={lbl}>Fuente — URL</span>
                <input value={form.fuente_url} onChange={(e) => set('fuente_url', e.target.value)} className={inp} placeholder="https://…" />
              </label>
            </div>

            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.destacado} onChange={(e) => set('destacado', e.target.checked)} /> Destacada (aparece en la fila de portada)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.portada} onChange={(e) => set('portada', e.target.checked)} /> Nota de portada (la grande de arriba)</label>
            </div>

            <div className="flex gap-2 flex-wrap pt-2 border-t border-white/10">
              <button disabled={guardando} onClick={() => guardar('borrador')} className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/20 disabled:opacity-50">Guardar borrador</button>
              {!esSuperadmin && (
                <button disabled={guardando} onClick={() => guardar('en_revision')} className="px-4 py-2 rounded-lg bg-amber-500/80 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50">Mandar a revisión</button>
              )}
              {esSuperadmin && (
                <button disabled={guardando} onClick={() => guardar('publicada')} className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50">Publicar</button>
              )}
              {guardando && <span className="text-white/50 text-sm self-center">Guardando…</span>}
            </div>
          </div>
        )}

        {/* ---------- Lista ---------- */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 text-xs">
            {(['todas', 'borrador', 'en_revision', 'publicada'] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-2.5 py-1 rounded-full border ${filtro === f ? 'border-white/60 bg-white/10' : 'border-white/15 text-white/50'}`}>
                {f === 'todas' ? 'Todas' : CHIP_TXT[f]}
              </button>
            ))}
          </div>

          {cargandoLista ? (
            <p className="text-white/40 text-sm py-6">Cargando…</p>
          ) : lista.length === 0 ? (
            <p className="text-white/40 text-sm py-6">No hay notas {filtro !== 'todas' ? `en "${CHIP_TXT[filtro as Estado]}"` : 'todavía'}.</p>
          ) : (
            <div className="rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
              {lista.map((n) => (
                <div key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.img} alt="" className="w-14 h-14 rounded object-cover shrink-0 bg-white/5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CHIP[n.estado]}`}>{CHIP_TXT[n.estado]}</span>
                      <span className="text-[11px] text-white/40 uppercase tracking-wide">{n.kicker}</span>
                      {n.portada && <span className="text-[10px] text-amber-300">★ portada</span>}
                    </div>
                    <p className="text-sm font-medium truncate mt-0.5">{n.titulo}</p>
                    <p className="text-[11px] text-white/40 truncate">/revista/{n.slug} · {n.autor_nombre}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {n.estado === 'publicada' && (
                      <a href={`/revista/${n.slug}`} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/15">Ver</a>
                    )}
                    <button onClick={() => abrirEditar(n)} className="px-2 py-1 rounded bg-white/10 text-xs hover:bg-white/20">Editar</button>
                    {esSuperadmin && n.estado === 'publicada' && (
                      <button onClick={() => despublicar(n)} className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/15">Despublicar</button>
                    )}
                    {(esSuperadmin || n.estado !== 'publicada') && (
                      <button onClick={() => borrar(n)} className="px-2 py-1 rounded bg-red-500/15 text-red-300 text-xs hover:bg-red-500/25">Borrar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Redactores (solo superadmin) ---------- */}
        {esSuperadmin && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex flex-col gap-3">
            <h2 className="font-bold">Redactores</h2>
            <p className="text-white/50 text-sm">Pueden crear y editar notas, pero no publicarlas. La cuenta ya tiene que estar registrada en Boga.</p>
            <div className="flex gap-2">
              <input value={nuevoRedactor} onChange={(e) => setNuevoRedactor(e.target.value)} placeholder="correo@ejemplo.com" className={inp + ' flex-1'} />
              <button onClick={() => toggleRedactor(nuevoRedactor, true)} disabled={!nuevoRedactor.trim()} className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/20 disabled:opacity-40">Agregar</button>
            </div>
            {redactores.length > 0 && (
              <ul className="divide-y divide-white/10">
                {redactores.map((r) => (
                  <li key={r.email} className="flex items-center justify-between py-2 text-sm">
                    <span>{r.name ? `${r.name} · ` : ''}{r.email}</span>
                    <button onClick={() => toggleRedactor(r.email, false)} className="text-red-300 text-xs hover:underline">Quitar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
