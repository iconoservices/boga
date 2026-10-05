'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react';
import type { PerfilEmpresa, PoliticaEmpresa } from '@/lib/perfilEmpresa';
import { uploadFile } from '@/lib/uploadClient';
import { comprimirPdf } from '@/lib/comprimirPdf';

const campo = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all';
// `relative`: el input de archivo oculto (sr-only) se posiciona dentro de su botón. Sin esto, al abrir el selector el navegador
// desplazaba toda la ventana del modal hasta donde estaría el input y el cuerpo quedaba en blanco.
const boton = 'relative inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-50 cursor-pointer';
const etiqueta = 'block text-sm font-bold text-gray-700 mb-2';
// El servidor de subida admite cuerpos de unos 4 MB: un PDF más pesado se pega como enlace.
const MAX_PDF_MB = 4;

/**
 * Caja de texto que crece con lo que escribes (sin barra lateral). `rows` es el alto mínimo.
 * Dentro de una sección cerrada el alto medido es 0: un ResizeObserver lo vuelve a ajustar cuando la sección se abre.
 */
function AreaAuto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ajustar = () => {
    const el = ref.current;
    if (!el || el.offsetParent === null) return;   // oculto (sección cerrada): no hay nada que medir
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(ajustar, [props.value]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <textarea ref={ref} {...props} className={`${props.className ?? ''} overflow-hidden`} />;
}

/**
 * Una sección plegable del perfil: icono, título, qué es, y una etiqueta de estado (✓ listo / vacío / "3 fotos").
 * Es un <details> nativo: se abre y cierra sin estado propio y funciona con teclado.
 */
function Seccion({
  icono, titulo, ayuda, estado, listo, abierta, children,
}: {
  icono: string;
  titulo: string;
  ayuda: string;
  estado: string;
  listo: boolean;
  abierta?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={abierta} className="group rounded-xl border border-gray-200 bg-white overflow-hidden">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50/70">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${listo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className="material-symbols-outlined text-[20px]">{icono}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-gray-900 leading-tight">{titulo}</span>
          <span className="block text-[11px] text-gray-500 leading-tight mt-0.5 truncate">{ayuda}</span>
        </span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${listo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
          {listo ? `✓ ${estado}` : estado}
        </span>
        <span className="material-symbols-outlined text-[20px] text-gray-400 transition-transform group-open:rotate-180 shrink-0">expand_more</span>
      </summary>
      <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-100">{children}</div>
    </details>
  );
}

/**
 * Editor de "Perfil de la empresa": solo aparece en tiendas con la plantilla "empresa".
 * Vive en su propio archivo para no engordar más el admin; el guardado lo hace el formulario de la tienda.
 *
 * Orden: lo primero que lee un cliente (quiénes somos) → a quién atiende → quiénes lo hacen → lo que ha hecho → quién confía
 * → con qué respaldo (políticas) → cómo se lleva la información y se contacta (brochure y correo).
 */
export default function PerfilEmpresaEditor({
  perfil, onChange, slug,
}: {
  perfil: PerfilEmpresa;
  onChange: (p: PerfilEmpresa) => void;
  /** Tienda a la que pertenecen los archivos (carpeta donde se guardan). */
  slug: string;
}) {
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Mensaje de lo que se está haciendo con el PDF ("Optimizando… página 3 de 9") y aviso de cuánto se redujo.
  const [progresoPdf, setProgresoPdf] = useState('');
  const [avisoPdf, setAvisoPdf] = useState('');

  const politicas = perfil.politicas ?? [];
  const clientes = perfil.clientes ?? [];
  const obras = perfil.obras ?? [];
  const logos = perfil.clienteLogos ?? {};
  const sectores = (perfil.sectores ?? []).map((x) => x.trim()).filter(Boolean);
  const nombresClientes = clientes.map((c) => c.trim()).filter(Boolean);
  const politicasListas = politicas.filter((p) => p.titulo.trim() && p.texto.trim()).length;
  const presentacionLista = [perfil.nosotros, perfil.mision, perfil.vision].filter((x) => x?.trim()).length;

  const set = (parche: Partial<PerfilEmpresa>) => onChange({ ...perfil, ...parche });
  const setPolitica = (i: number, parche: Partial<PoliticaEmpresa>) =>
    set({ politicas: politicas.map((p, j) => (j === i ? { ...p, ...parche } : p)) });

  // Resumen arriba: cuántas de las 8 secciones ya tienen contenido.
  const hechas = [
    presentacionLista > 0, sectores.length > 0, !!perfil.equipoFoto, obras.length > 0,
    nombresClientes.length > 0, politicasListas > 0, !!perfil.brochure, !!perfil.email,
  ].filter(Boolean).length;

  /** Sube uno o varios archivos y avisa cuál está en curso; los errores se muestran al final. */
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

  const subirPdf = async (lista: FileList | null) => {
    const f = lista?.[0];
    if (!f) return;
    setError('');
    setAvisoPdf('');
    const limite = MAX_PDF_MB * 1024 * 1024;
    const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
    let archivo = f;
    if (f.size > limite) {
      // Pesa más de lo que admite el servidor: se optimiza en el navegador (cada página se vuelve a guardar más liviana).
      setSubiendo('brochure');
      try {
        // un poco por debajo del tope, para que el envío no quede justo
        const r = await comprimirPdf(f, limite * 0.95, setProgresoPdf);
        archivo = r.archivo;
        setAvisoPdf(`PDF optimizado: de ${mb(r.antes)} MB a ${mb(r.despues)} MB.`);
      } catch (e: any) {
        setProgresoPdf('');
        setSubiendo(null);
        setError(
          e?.message === 'demasiado-pesado'
            ? `El PDF pesa ${mb(f.size)} MB y ni optimizado llega a ${MAX_PDF_MB} MB. Súbelo a Google Drive y pega el enlace en el campo de abajo.`
            : 'No se pudo optimizar ese PDF. Súbelo a Google Drive y pega el enlace en el campo de abajo.'
        );
        return;
      }
      setProgresoPdf('');
    }
    subir('brochure', [archivo], ([url]) => set({ brochure: url }));
  };

  return (
    <div id="editor-empresa" className="space-y-3 pt-2 border-t border-gray-100 scroll-mt-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">business_center</span>
            Perfil de la empresa
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Lo que tus clientes leen para confiar en ti. Todo es opcional: lo que dejes vacío no se muestra.</p>
        </div>
        <span className="text-xs font-bold text-gray-500">{hechas} de 8 secciones con contenido</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(hechas / 8) * 100}%` }} />
      </div>

      {/* 1 ─ Presentación */}
      <Seccion icono="badge" titulo="Presentación" ayuda="Quiénes somos, misión y visión" estado={`${presentacionLista} de 3`} listo={presentacionLista === 3} abierta>
        <div>
          <label className={etiqueta}>Quiénes somos</label>
          <AreaAuto rows={3} maxLength={1500} value={perfil.nosotros ?? ''} onChange={(e) => set({ nosotros: e.target.value })} placeholder="Qué hace tu empresa, desde cuándo y para quién trabajas." className={`${campo} resize-none`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etiqueta}>Misión</label>
            <AreaAuto rows={4} maxLength={800} value={perfil.mision ?? ''} onChange={(e) => set({ mision: e.target.value })} placeholder="Qué hacen y para quién." className={`${campo} resize-none`} />
          </div>
          <div>
            <label className={etiqueta}>Visión</label>
            <AreaAuto rows={4} maxLength={800} value={perfil.vision ?? ''} onChange={(e) => set({ vision: e.target.value })} placeholder="Hacia dónde van." className={`${campo} resize-none`} />
          </div>
        </div>
      </Seccion>

      {/* 2 ─ Sectores */}
      <Seccion icono="factory" titulo="Sectores que atiendes" ayuda="Petroleras, minería, construcción…" estado={sectores.length ? `${sectores.length}` : 'Vacío'} listo={sectores.length > 0}>
        <p className="text-xs text-gray-500 -mt-1">Uno por línea.</p>
        <AreaAuto
          rows={4}
          value={(perfil.sectores ?? []).join('\n')}
          onChange={(e) => set({ sectores: e.target.value.split('\n') })}
          placeholder={'Petroleras\nGasíferas\nMinería'}
          className={`${campo} resize-none`}
        />
      </Seccion>

      {/* 3 ─ Equipo */}
      <Seccion icono="groups" titulo="Nuestro equipo" ayuda="Una foto del equipo y un texto corto" estado={perfil.equipoFoto ? 'Foto lista' : 'Vacío'} listo={!!perfil.equipoFoto}>
        {perfil.equipoFoto && (
          <div className="relative w-full max-w-xs aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
            <img src={perfil.equipoFoto} alt="" className="w-full h-full object-cover" />
            <button type="button" aria-label="Quitar foto del equipo" onClick={() => set({ equipoFoto: undefined })} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}
        <label className={`${boton} ${subiendo === 'equipo' ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          {subiendo === 'equipo' ? 'Subiendo…' : perfil.equipoFoto ? 'Cambiar foto' : '+ Subir foto del equipo'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { subir('equipo', Array.from(e.target.files ?? []).slice(0, 1), ([url]) => set({ equipoFoto: url })); e.target.value = ''; }} />
        </label>
        <input
          type="text"
          maxLength={400}
          value={perfil.equipoTexto ?? ''}
          onChange={(e) => set({ equipoTexto: e.target.value })}
          placeholder="Texto debajo de la foto (opcional). Ej: Más de 20 técnicos certificados"
          className={campo}
        />
      </Seccion>

      {/* 4 ─ Obras */}
      <Seccion icono="photo_library" titulo="Obras realizadas" ayuda='Fotos de trabajos terminados (pestaña "Obras")' estado={obras.length ? `${obras.length} ${obras.length === 1 ? 'foto' : 'fotos'}` : 'Vacío'} listo={obras.length >= 3}>
        <p className="text-xs text-gray-500 -mt-1">Aparte de la foto de cada servicio. Con 3 o más se ve profesional. Hasta 24.</p>
        {obras.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
      </Seccion>

      {/* 5 ─ Clientes */}
      <Seccion icono="handshake" titulo="Clientes principales" ayuda="Nombres y, si quieres, su logo" estado={nombresClientes.length ? `${nombresClientes.length}` : 'Vacío'} listo={nombresClientes.length > 0}>
        <p className="text-xs text-gray-500 -mt-1">Uno por línea.</p>
        <AreaAuto
          rows={4}
          value={clientes.join('\n')}
          onChange={(e) => set({ clientes: e.target.value.split('\n') })}
          placeholder={'Uno por línea\nEj. Comercial Denisam S.R.L.'}
          className={`${campo} resize-none`}
        />
        {nombresClientes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Logos <span className="font-medium text-gray-500">(opcional: sin logo, sale el nombre en texto)</span></p>
            {/* Dos por fila en pantallas anchas: con muchos clientes, una columna ocupaba demasiado alto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          </div>
        )}
      </Seccion>

      {/* 6 ─ Políticas */}
      <Seccion icono="verified_user" titulo="Políticas" ayuda="Calidad, seguridad, ambiental…" estado={politicasListas ? `${politicasListas}` : 'Vacío'} listo={politicasListas > 0}>
        <div className="space-y-3">
          {politicas.map((p, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/60">
              <div className="flex gap-2">
                <input value={p.titulo} maxLength={80} onChange={(e) => setPolitica(i, { titulo: e.target.value })} placeholder="Ej. Política de calidad" className={campo} />
                <button type="button" aria-label="Quitar política" onClick={() => set({ politicas: politicas.filter((_, j) => j !== i) })} className="px-3 rounded-md border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <AreaAuto rows={4} maxLength={1500} value={p.texto} onChange={(e) => setPolitica(i, { texto: e.target.value })} placeholder="Texto de la política" className={`${campo} resize-none`} />
            </div>
          ))}
          {politicas.length < 8 && (
            <button type="button" onClick={() => set({ politicas: [...politicas, { titulo: '', texto: '' }] })} className={boton}>
              + Agregar política
            </button>
          )}
        </div>
      </Seccion>

      {/* 7 ─ Brochure */}
      <Seccion icono="picture_as_pdf" titulo="Brochure (PDF)" ayuda='Prende el botón "Descargar brochure"' estado={perfil.brochure ? 'Cargado' : 'Vacío'} listo={!!perfil.brochure}>
        <p className="text-xs text-gray-500 -mt-1">Sube el PDF o pega un enlace, por ejemplo de Google Drive. Si pesa más de {MAX_PDF_MB} MB, se optimiza solo.</p>
        {perfil.brochure && (
          <div className="flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[18px] text-gray-500">picture_as_pdf</span>
            <a href={perfil.brochure} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 underline truncate">Ver brochure actual</a>
            <button type="button" onClick={() => set({ brochure: undefined })} className="font-bold text-gray-400 hover:text-red-600 shrink-0">Quitar</button>
          </div>
        )}
        <label className={`${boton} ${subiendo === 'brochure' ? 'opacity-50 pointer-events-none' : ''}`}>
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          {subiendo === 'brochure' ? (progresoPdf || 'Subiendo…') : '+ Subir PDF'}
          <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { subirPdf(e.target.files); e.target.value = ''; }} />
        </label>
        {avisoPdf && <p className="text-xs text-green-700 font-medium">{avisoPdf}</p>}
        <input
          type="url"
          value={perfil.brochure ?? ''}
          onChange={(e) => set({ brochure: e.target.value })}
          placeholder="…o pega el enlace (https://…)"
          className={campo}
        />
      </Seccion>

      {/* 8 ─ Contacto por correo */}
      <Seccion icono="mail" titulo="Correo para cotizaciones" ayuda='Prende el botón "Cotizar por correo"' estado={perfil.email ? 'Cargado' : 'Vacío'} listo={!!perfil.email}>
        <input type="email" value={perfil.email ?? ''} onChange={(e) => set({ email: e.target.value })} placeholder="ventas@tuempresa.com" className={campo} />
      </Seccion>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">{error}</p>
      )}
    </div>
  );
}
