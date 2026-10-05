// Reduce el peso de un PDF en el navegador, igual que ya se hace con las imágenes antes de subirlas.
//
// Cómo: cada página se dibuja en un canvas (pdf.js) y se vuelve a guardar como JPEG con menos resolución y calidad;
// con esas imágenes se arma un PDF nuevo del mismo tamaño de página (jsPDF). Va probando de más a menos calidad hasta
// que cabe. Pensado para brochures y presentaciones, que suelen ser fotos y diseño: sirve de maravilla cuando cada página
// ya es una imagen. Aviso: en un PDF de texto, el texto pasa a ser imagen (se ve igual, pero ya no se puede seleccionar).
//
// Se carga bajo demanda (import dinámico): pdf.js y jsPDF solo se descargan cuando alguien sube un PDF pesado.

type Intento = { escala: number; calidad: number };

// De más a menos calidad. Escala 1 = 72 ppp (el tamaño "de papel" de la página); 1.6 ≈ 115 ppp.
const INTENTOS: Intento[] = [
  { escala: 1.6, calidad: 0.78 },
  { escala: 1.4, calidad: 0.7 },
  { escala: 1.2, calidad: 0.62 },
  { escala: 1.0, calidad: 0.55 },
  { escala: 0.85, calidad: 0.48 },
];

export interface ResultadoPdf {
  archivo: File;
  /** Peso original y final, en bytes. */
  antes: number;
  despues: number;
}

/**
 * Devuelve el mismo PDF si ya pesa menos que `maxBytes`; si no, uno optimizado que sí cabe.
 * Lanza un error si ni con la calidad más baja cabe, o si el archivo no se puede leer.
 */
export async function comprimirPdf(
  file: File,
  maxBytes: number,
  onProgreso?: (texto: string) => void,
): Promise<ResultadoPdf> {
  if (file.size <= maxBytes) return { archivo: file, antes: file.size, despues: file.size };

  const [pdfjs, { jsPDF }] = await Promise.all([import('pdfjs-dist'), import('jspdf')]);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const datos = new Uint8Array(await file.arrayBuffer());
  const tarea = pdfjs.getDocument({ data: datos });
  const doc = await tarea.promise;

  try {
    for (let n = 0; n < INTENTOS.length; n++) {
      const { escala, calidad } = INTENTOS[n];
      let pdf: InstanceType<typeof jsPDF> | null = null;

      for (let i = 1; i <= doc.numPages; i++) {
        onProgreso?.(`Optimizando el PDF… página ${i} de ${doc.numPages}${n > 0 ? ` (intento ${n + 1})` : ''}`);
        const pagina = await doc.getPage(i);
        const base = pagina.getViewport({ scale: 1 });              // tamaño de la página en puntos
        const vista = pagina.getViewport({ scale: escala });        // tamaño al que se dibuja
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vista.width);
        canvas.height = Math.ceil(vista.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('El navegador no pudo preparar el PDF.');
        ctx.fillStyle = '#ffffff';                                  // JPEG no tiene transparencia: fondo blanco
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pagina.render({ canvas, canvasContext: ctx, viewport: vista }).promise;

        const imagen = canvas.toDataURL('image/jpeg', calidad);
        const orientacion = base.width > base.height ? 'l' : 'p';
        if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [base.width, base.height], orientation: orientacion, compress: true });
        else pdf.addPage([base.width, base.height], orientacion);
        pdf.addImage(imagen, 'JPEG', 0, 0, base.width, base.height, undefined, 'FAST');

        canvas.width = 0; canvas.height = 0;                        // suelta la memoria de esa página
        pagina.cleanup();
      }

      const blob = pdf!.output('blob');
      if (blob.size <= maxBytes) {
        const nombre = file.name.replace(/\.pdf$/i, '') + '.pdf';
        return { archivo: new File([blob], nombre, { type: 'application/pdf' }), antes: file.size, despues: blob.size };
      }
    }
    throw new Error('demasiado-pesado');
  } finally {
    await tarea.destroy();
  }
}
