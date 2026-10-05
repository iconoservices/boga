'use client';

import { useState } from 'react';
import type { PerfilEmpresa, PoliticaEmpresa } from '@/lib/perfilEmpresa';
import { uploadFile } from '@/lib/uploadClient';

const campo = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all';
const boton = 'inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-50 cursor-pointer';
// El servidor de subida admite cuerpos de unos 4 MB: un PDF más pesado se pega como enlace.
const MAX_PDF_MB = 4;

/**
 * Editor de "Perfil de la empresa": solo aparece en tiendas con la plantilla "empresa".
 * Vive en su propio archivo para no engordar más el admin; el guardado lo hace el formulario de la tienda.
 */
export default function PerfilEmpresaEditor({
  perfil, onChange, slug,
}: {
  perfil: PerfilEmpresa;
  onChange: (p: PerfilEmpresa) => void;
  /** Tienda a la que pertenecen las archivos (carpeta donde se guardan). */
  slug: string;
}) {
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState('');

  const politicas = perfil.politicas ?? [];
  const clientes = perfil.clientes ?? [];
  const obras = perfil.obras ?? [];
  const logos = perfil.clienteLogos ?? {};
  const nombresClientes = clientes.map((c) => c.trim()).filter(Boolean);

  const set = (parche: Partial<PerfilEmpresa>) => onChange({ ...perfil, ...parche });
  const setPolitica = (i: number, parche: Partial<PoliticaEmpresa>) =>
    set({ politicas: politicas.map((p, j) => (j === i ? { ...p, ...parche } : p)) });

  /** Sube uno o varios archivos y avisa cuál está en curso; los errores se muestran debajo. */
  const subir = async (clave: string, archivos: File[], alTerminar: (urls: string[]) => void) => {
    if (archivos.length === 0) return;
    setSubiendo(clave);
    setError('');
    try {
      const urls = await Promise.all(archivos.map((f) => uploadFile(f, `store-assets/${slug}/${clave.split(':')[0]}`)));
      alTerminar(urls);
    } catch (e: any) {
      setError(e?.message || 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(null);
    }
  };

  const subirObras = (lista: FileList | null) => {
    const cupo = Math.max(0, 24 - obras.length);
    subir('obras', Array.from(lista ?? []).slice(0, cupo), (urls) => set({ obras: [...obras, ...urls] }));
  };

  const subirPdf = (lista: FileList | null) => {
    const f = lista?.[0];
    if (!f) return;
    if (f.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`El PDF pesa ${(f.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_PDF_MB} MB. Comprímelo (por ejemplo en ilovepdf.com) o súbelo a Google Drive y pega el enlace aquí abajo.`);
      return;
    }
    subir('brochure', [f], ([url]) => set({ brochure: url }));
  };

  return (
    <div id="editor-empresa" className="space-y-6 pt-2 border-t border-gray-100 scroll-mt-4">
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
        <label className="block text-sm font-bold text-gray-700 mb-2">Sectores que atiendes</label>
        <p className="text-xs text-gray-500 -mt-1 mb-2">Uno por línea. Ej: Petroleras, Gasíferas, Minería.</p>
        <textarea
          rows={3}
          value={(perfil.sectores ?? []).join('\n')}
          onChange={(e) => set({ sectores: e.target.value.split('\n') })}
          placeholder={'Petroleras\nGasíferas\nMinería'}
          className={`${campo} resize-none`}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Nuestro equipo</label>
        {perfil.equipoFoto && (
          <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 mb-2">
            <img src={perfil.equipoFoto} alt="" className="w-full h-full object-cover" />
            <button type="button" aria-label="Quitar foto del equipo" onClick={() => set({ equipoFoto: undefined })} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}
        <label className={`${boton} ${subiendo === 'equipo' ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          {subiendo === 'equipo' ? 'Subiendo…' : perfil.equipoFoto ? 'Cambiar foto del equipo' : '+ Foto del equipo'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { subir('equipo', Array.from(e.target.files ?? []).slice(0, 1), ([url]) => set({ equipoFoto: url })); e.target.value = ''; }} />
        </label>
        <input
          type="text"
          maxLength={400}
          value={perfil.equipoTexto ?? ''}
          onChange={(e) => set({ equipoTexto: e.target.value })}
          placeholder="Texto corto debajo de la foto (opcional). Ej: Más de 20 técnicos certificados"
          className={`${campo} mt-2`}
        />
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
            <button type="button" onClick={() => set({ politicas: [...politicas, { titulo: '', texto: '' }] })} className={boton}>
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
        {nombresClientes.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">Logo de cada cliente (opcional). Si no hay logo, sale su nombre en texto.</p>
            {nombresClientes.map((nombre) => (
              <div key={nombre} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                <div className="w-14 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {logos[nombre] ? <img src={logos[nombre]} alt="" className="max-w-full max-h-full object-contain" /> : <span className="material-symbols-outlined text-gray-300 text-[20px]">image</span>}
                </div>
                <span className="text-xs font-bold text-gray-700 flex-1 min-w-0 truncate">{nombre}</span>
                {logos[nombre] && (
                  <button type="button" onClick={() => { const resto = { ...logos }; delete resto[nombre]; set({ clienteLogos: resto }); }} className="text-xs font-bold text-gray-400 hover:text-red-600">Quitar</button>
                )}
                <label className={`${boton} ${subiendo === `clientes:${nombre}` ? 'opacity-50 pointer-events-none' : ''}`}>
                  {subiendo === `clientes:${nombre}` ? 'Subiendo…' : logos[nombre] ? 'Cambiar' : 'Subir logo'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { subir(`clientes:${nombre}`, Array.from(e.target.files ?? []).slice(0, 1), ([url]) => set({ clienteLogos: { ...logos, [nombre]: url } })); e.target.value = ''; }} />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Obras realizadas (fotos)</label>
        <p className="text-xs text-gray-500 -mt-1 mb-2">Fotos de trabajos terminados. Salen en la pestaña "Obras", aparte de la foto de cada servicio. Hasta 24.</p>
        {obras.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {obras.map((url, i) => (
              <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" aria-label="Quitar foto" onClick={() => set({ obras: obras.filter((_, j) => j !== i) })} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
        {obras.length < 24 && (
          <label className={`${boton} ${subiendo === 'obras' ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
            {subiendo === 'obras' ? 'Subiendo…' : '+ Agregar fotos de obras'}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { subirObras(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Brochure (PDF)</label>
        <p className="text-xs text-gray-500 -mt-1 mb-2">Si lo pones, aparece el botón "Descargar brochure". Sube el PDF (hasta {MAX_PDF_MB} MB) o pega un enlace.</p>
        {perfil.brochure && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="material-symbols-outlined text-[18px] text-gray-500">picture_as_pdf</span>
            <a href={perfil.brochure} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline truncate">Ver brochure actual</a>
            <button type="button" onClick={() => set({ brochure: undefined })} className="font-bold text-gray-400 hover:text-red-600 shrink-0">Quitar</button>
          </div>
        )}
        <label className={`${boton} ${subiendo === 'brochure' ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          {subiendo === 'brochure' ? 'Subiendo…' : '+ Subir PDF'}
          <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { subirPdf(e.target.files); e.target.value = ''; }} />
        </label>
        <input
          type="url"
          value={perfil.brochure ?? ''}
          onChange={(e) => set({ brochure: e.target.value })}
          placeholder="…o pega el enlace (https://…)"
          className={`${campo} mt-2`}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Correo para cotizaciones</label>
        <input type="email" value={perfil.email ?? ''} onChange={(e) => set({ email: e.target.value })} placeholder="ventas@tuempresa.com" className={campo} />
        <p className="text-xs text-gray-500 mt-1">Si lo pones, aparece un botón "Cotizar por correo" junto al de WhatsApp.</p>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
