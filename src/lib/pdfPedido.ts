// Comprobante en PDF del pedido de la carta. Se arma con el mismo texto que se mandó por WhatsApp
// (así sale igual en las ~15 plantillas, sin tocar cada una). jsPDF se carga solo al usarlo.
// Patrón de compartir tomado de la app Deudas: menú de compartir con el archivo, o descarga.

/** El PDF no dibuja emojis ni símbolos fuera de Latin-1: se cambian o se quitan para que no salgan raros. */
const limpiar = (t: string) =>
  t
    .replace(/[•·▪●]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\*/g, '')
    .replace(/[^\u0000-\u00FF]/g, '')
    .replace(/[ \t]+$/gm, '');

export async function pdfDePedido(tienda: string, mensaje: string, codigo?: string): Promise<File> {
  const { jsPDF } = await import('jspdf');
  const W = 300, M = 24;
  const cuerpo = limpiar(mensaje).trim();

  // Se mide con una hoja de prueba para saber cuánto alto necesita el ticket.
  const medida = new jsPDF({ unit: 'pt', format: [W, 100] });
  medida.setFontSize(10);
  const lineas: string[] = medida.splitTextToSize(cuerpo, W - M * 2);
  const alto = Math.max(280, 110 + lineas.length * 13 + 50);

  const doc = new jsPDF({ unit: 'pt', format: [W, alto] });
  let y = 34;
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(28, 27, 31);
  doc.text(limpiar(tienda) || 'Pedido', W / 2, y, { align: 'center', maxWidth: W - M * 2 });
  y += 18;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110, 110, 110);
  doc.text(`Pedido${codigo ? ' N° ' + codigo.toUpperCase() : ''} - ${new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}`, W / 2, y, { align: 'center' });
  y += 12;
  doc.setDrawColor(200, 200, 200).line(M, y, W - M, y);
  y += 20;

  doc.setFontSize(10).setTextColor(28, 27, 31);
  for (const l of lineas) { doc.text(l, M, y); y += 13; }

  y += 10;
  doc.setDrawColor(200, 200, 200).line(M, y, W - M, y);
  doc.setFontSize(8).setTextColor(150, 150, 150);
  doc.text('Hecho con BogaHub - bogahub.app', W / 2, y + 16, { align: 'center' });

  const nombre = `Pedido_${limpiar(tienda).replace(/[^\w-]+/g, '_') || 'tienda'}${codigo ? '_' + codigo.toUpperCase() : ''}_${new Date().toISOString().slice(0, 10)}.pdf`;
  return new File([doc.output('blob')], nombre, { type: 'application/pdf' });
}

export const puedeCompartirArchivo = (file: File) => {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  return !!nav.canShare?.({ files: [file] });
};

/** En el celular abre el menú de compartir (WhatsApp, etc.). Si el navegador no lo permite, descarga el archivo. */
export async function compartirPDF(file: File, texto: string): Promise<'compartido' | 'descargado' | 'cancelado'> {
  if (puedeCompartirArchivo(file)) {
    try {
      await navigator.share({ files: [file], title: file.name, text: texto });
      return 'compartido';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelado';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'descargado';
}
