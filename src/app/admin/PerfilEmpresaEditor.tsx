'use client';

import type { PerfilEmpresa, PoliticaEmpresa } from '@/lib/perfilEmpresa';

const campo = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all';

/**
 * Editor de "Perfil de la empresa": solo aparece en tiendas con la plantilla "empresa".
 * Vive en su propio archivo para no engordar más el admin; el guardado lo hace el formulario de la tienda.
 */
export default function PerfilEmpresaEditor({
  perfil, onChange,
}: {
  perfil: PerfilEmpresa;
  onChange: (p: PerfilEmpresa) => void;
}) {
  const politicas = perfil.politicas ?? [];
  const clientes = perfil.clientes ?? [];
  const set = (parche: Partial<PerfilEmpresa>) => onChange({ ...perfil, ...parche });
  const setPolitica = (i: number, parche: Partial<PoliticaEmpresa>) =>
    set({ politicas: politicas.map((p, j) => (j === i ? { ...p, ...parche } : p)) });

  return (
    <div id="editor-empresa" className="space-y-5 pt-2 border-t border-gray-100 scroll-mt-4">
      <div>
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">business_center</span>
          Perfil de la empresa
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Lo que tus clientes leen para confiar en ti. Todo es opcional: lo que dejes vacío no se muestra.</p>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Quiénes somos</label>
        <textarea rows={3} maxLength={1500} value={perfil.nosotros ?? ''} onChange={(e) => set({ nosotros: e.target.value })} placeholder="Qué hace tu empresa, desde cuándo y para quién trabajas." className={`${campo} resize-none`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Misión</label>
          <textarea rows={3} maxLength={800} value={perfil.mision ?? ''} onChange={(e) => set({ mision: e.target.value })} className={`${campo} resize-none`} />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Visión</label>
          <textarea rows={3} maxLength={800} value={perfil.vision ?? ''} onChange={(e) => set({ vision: e.target.value })} className={`${campo} resize-none`} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Políticas</label>
        <p className="text-xs text-gray-500 -mt-1 mb-2">Calidad, seguridad, ambiental… Cada una con su título.</p>
        <div className="space-y-3">
          {politicas.map((p, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/60">
              <div className="flex gap-2">
                <input value={p.titulo} maxLength={80} onChange={(e) => setPolitica(i, { titulo: e.target.value })} placeholder="Ej. Política de calidad" className={campo} />
                <button type="button" aria-label="Quitar política" onClick={() => set({ politicas: politicas.filter((_, j) => j !== i) })} className="px-3 rounded-md border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <textarea rows={3} maxLength={1500} value={p.texto} onChange={(e) => setPolitica(i, { texto: e.target.value })} placeholder="Texto de la política" className={`${campo} resize-none`} />
            </div>
          ))}
          {politicas.length < 8 && (
            <button type="button" onClick={() => set({ politicas: [...politicas, { titulo: '', texto: '' }] })} className="text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-50">
              + Agregar política
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Clientes principales</label>
        <textarea
          rows={4}
          value={clientes.join('\n')}
          onChange={(e) => set({ clientes: e.target.value.split('\n') })}
          placeholder={'Uno por línea\nEj. Comercial Denisam S.R.L.'}
          className={`${campo} resize-none`}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Correo para cotizaciones</label>
        <input type="email" value={perfil.email ?? ''} onChange={(e) => set({ email: e.target.value })} placeholder="ventas@tuempresa.com" className={campo} />
        <p className="text-xs text-gray-500 mt-1">Si lo pones, aparece un botón "Cotizar por correo" junto al de WhatsApp.</p>
      </div>
    </div>
  );
}
