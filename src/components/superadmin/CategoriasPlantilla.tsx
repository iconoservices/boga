'use client';

// Editor de las categorías por defecto de una plantilla (ver lib/plantillaCategorias.ts).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTemplate } from '@/lib/templates.config';
import { cargarCategoriasPersonalizadas, limpiarCategorias, categoriasDePlantilla, type CategoriaPlantilla } from '@/lib/plantillaCategorias';

export default function CategoriasPlantilla({ templateId }: { templateId: string }) {
  const [filas, setFilas] = useState<{ name: string; icon: string }[]>([]);
  const [personalizada, setPersonalizada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let vivo = true;
    cargarCategoriasPersonalizadas().then((todas) => {
      if (!vivo) return;
      setPersonalizada(Boolean(todas[templateId]?.length));
      setFilas(categoriasDePlantilla(templateId, todas).map(({ name, icon }) => ({ name, icon })));
      setCargando(false);
    });
    return () => { vivo = false; };
  }, [templateId]);

  const mover = (i: number, d: -1 | 1) => setFilas((f) => {
    const j = i + d;
    if (j < 0 || j >= f.length) return f;
    const n = [...f];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const guardar = async () => {
    const limpias: CategoriaPlantilla[] = limpiarCategorias(filas);
    if (limpias.length === 0) { setMsg('Deja al menos una categoría, o usa "Volver a las del código".'); return; }
    setGuardando(true);
    setMsg('');
    const { error } = await supabase.from('plantilla_categorias').upsert({ template_id: templateId, categories: limpias, updated_at: new Date().toISOString() });
    setGuardando(false);
    if (error) {
      setMsg(/plantilla_categorias/.test(error.message)
        ? 'Falta correr el SQL de "categorías por defecto" en Supabase (está al final de supabase_setup.sql).'
        : `Error: ${error.message}`);
      return;
    }
    setFilas(limpias.map(({ name, icon }) => ({ name, icon })));
    setPersonalizada(true);
    setMsg('Guardado. Las tiendas nuevas de esta plantilla nacerán con estas categorías.');
  };

  const restaurar = async () => {
    if (!confirm('¿Volver a las categorías de fábrica de esta plantilla?')) return;
    setGuardando(true);
    const { error } = await supabase.from('plantilla_categorias').delete().eq('template_id', templateId);
    setGuardando(false);
    if (error) { setMsg(`Error: ${error.message}`); return; }
    setFilas((getTemplate(templateId)?.categories ?? []).map(({ name, icon }) => ({ name, icon })));
    setPersonalizada(false);
    setMsg('Listo: vuelven las categorías de fábrica.');
  };

  const campo = 'bg-white border border-surface-container-highest rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:border-primary';

  return (
    <section className="bg-white rounded-2xl border border-surface-container-highest p-4 flex flex-col gap-3">
      <div>
        <h2 className="font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">category</span>
          Categorías por defecto
          {personalizada && <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">Personalizadas</span>}
        </h2>
        <p className="text-xs text-secondary mt-1">
          Son el punto de partida: una tienda nueva de esta plantilla las hereda. Después cada dueño agrega las suyas o deja de usar las que no quiera.
          Cambiarlas aquí no toca a las tiendas que ya tienen sus categorías.
        </p>
      </div>

      {cargando ? (
        <p className="text-sm text-secondary">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filas.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-secondary w-8 text-center shrink-0">{f.icon || 'category'}</span>
              <input
                value={f.name} maxLength={40} placeholder="Nombre (ej. Molidos)"
                onChange={(e) => setFilas((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className={`${campo} flex-1 min-w-0`}
              />
              <input
                value={f.icon} placeholder="ícono" title="Nombre del ícono de Material Symbols (ej. grain, spa, restaurant)"
                onChange={(e) => setFilas((l) => l.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
                className={`${campo} w-32 shrink-0`}
              />
              <button type="button" aria-label="Subir" onClick={() => mover(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-md text-secondary hover:bg-surface-container-low disabled:opacity-30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
              <button type="button" aria-label="Bajar" onClick={() => mover(i, 1)} disabled={i === filas.length - 1} className="w-8 h-8 rounded-md text-secondary hover:bg-surface-container-low disabled:opacity-30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              </button>
              <button type="button" aria-label="Quitar" onClick={() => setFilas((l) => l.filter((_, j) => j !== i))} className="w-8 h-8 rounded-md text-secondary hover:text-red-600 hover:bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" onClick={() => setFilas((l) => [...l, { name: '', icon: '' }])} className="px-3 py-1.5 rounded-full border border-surface-container-highest text-xs font-bold text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span> Agregar categoría
            </button>
            <button type="button" onClick={guardar} disabled={guardando} className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold disabled:opacity-60">
              {guardando ? 'Guardando…' : 'Guardar categorías'}
            </button>
            {personalizada && (
              <button type="button" onClick={restaurar} disabled={guardando} className="px-3 py-1.5 rounded-full border border-surface-container-highest text-xs font-bold text-secondary disabled:opacity-60">
                Volver a las del código
              </button>
            )}
          </div>
          {msg && <p className="text-xs font-semibold text-primary">{msg}</p>}
        </div>
      )}
    </section>
  );
}
