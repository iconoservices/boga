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
  // El menú de compartir solo en celular/tablet: en la compu (Windows/Mac) abría el panel del sistema en vez de descargar.
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  if (esMovil && puedeCompartirArchivo(file)) {
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
  a.style.display = 'none';
  document.body.appendChild(a);   // Firefox/Safari solo descargan si el enlace está en la página
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
  return 'descargado';
}

type DatosPedido = {
  tienda: string;
  logo?: string | null;
  codigo?: string;
  fecha?: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  entrega?: string;
  estado?: string;
};

/** Comprobante del pedido armado como boleta: logo de la tienda, detalle por línea y total destacado. */
export async function pdfDePedidoDetallado(d: DatosPedido): Promise<File> {
  const [{ jsPDF }, { cargarImagenPdf, ajustarImagen, textoPdf }] = await Promise.all([import('jspdf'), import('./imagenPdf')]);
  const logo = await cargarImagenPdf(d.logo, 300);
  const W = 80, M = 6;
  const dibujar = (doc: InstanceType<typeof jsPDF>) => {
    let y = 8;
    const txt = (t: string, o: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal').setFontSize(o.size ?? 8).setTextColor(...(o.color ?? [28, 27, 31]));
      (doc.splitTextToSize(t, W - M * 2) as string[]).forEach((l) => { doc.text(l, W / 2, y, { align: 'center' }); y += (o.size ?? 8) * 0.44 + 0.9; });
    };
    const fila = (l: string, r: string) => {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(28, 27, 31);
      doc.text(l, M, y); doc.text(r, W - M, y, { align: 'right' }); y += 4.4;
    };
    const regla = () => { doc.setDrawColor(190, 190, 190).setLineDashPattern([0.8, 0.8], 0).line(M, y, W - M, y); doc.setLineDashPattern([], 0); y += 4; };

    if (logo) {
      const t = ajustarImagen(logo, 40, 22);
      try { doc.addImage(logo.data, 'JPEG', (W - t.w) / 2, y, t.w, t.h); } catch { /* logo ilegible: sigue sin él */ }
      y += t.h + 3;
    }
    txt(textoPdf(d.tienda) || 'Pedido', { size: 12, bold: true });
    txt('COMPROBANTE DE PEDIDO', { size: 8, bold: true, color: [140, 0, 9] });
    y += 1;
    regla();
    if (d.codigo) fila('N° de pedido:', '#' + d.codigo.toUpperCase());
    fila('Fecha:', new Date(d.fecha || Date.now()).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    if (d.entrega) fila('Entrega:', textoPdf(d.entrega));
    regla();
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(130, 130, 130);
    doc.text('CANT', M, y); doc.text('PRODUCTO', M + 9, y); doc.text('IMPORTE', W - M, y, { align: 'right' });
    y += 4;
    d.items.forEach((it) => {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(28, 27, 31);
      const nombre = doc.splitTextToSize(textoPdf(it.name), W - M * 2 - 9 - 20) as string[];
      doc.text(String(it.quantity), M, y);
      doc.text(`S/ ${(it.price * it.quantity).toFixed(2)}`, W - M, y, { align: 'right' });
      nombre.forEach((l, i) => { doc.text(l, M + 9, y); if (i < nombre.length - 1) y += 3.8; });
      y += 4;
      if (it.quantity > 1) { doc.setFontSize(6.5).setTextColor(130, 130, 130); doc.text(`${it.quantity} x S/ ${it.price.toFixed(2)}`, M + 9, y - 0.6); y += 2.6; }
    });
    y += 1;
    regla();
    doc.setFillColor(140, 0, 9).roundedRect(M, y - 1, W - M * 2, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(255, 255, 255);
    doc.text('TOTAL', M + 3, y + 5); doc.text(`S/ ${d.total.toFixed(2)}`, W - M - 3, y + 5, { align: 'right' });
    y += 15;
    txt('¡Gracias por tu compra!', { size: 8, bold: true });
    txt('Hecho con BogaHub - bogahub.app', { size: 6, color: [150, 150, 150] });
    return y + 4;
  };
  const alto = dibujar(new jsPDF({ unit: 'mm', format: [W, 500] }));
  const doc = new jsPDF({ unit: 'mm', format: [W, Math.max(alto, 100)] });
  dibujar(doc);
  const nombre = `Pedido_${textoPdf(d.tienda).replace(/[^\w-]+/g, '_') || 'tienda'}${d.codigo ? '_' + d.codigo.toUpperCase() : ''}.pdf`;
  return new File([doc.output('blob')], nombre, { type: 'application/pdf' });
}
