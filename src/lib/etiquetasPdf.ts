// Etiquetas con código de barras en PDF (hoja A4, 3 columnas × 8 filas), listas para imprimir y pegar.
// Cada etiqueta lleva el nombre, el precio y el código EAN-13 dibujado con barras reales (se lee con la cámara del POS).
// Los códigos que no son EAN-13 válidos (de otros formatos) salen escritos, sin barras, para no imprimir algo que no se lee.

import { esEan13, patronEan13 } from './ean13';
import { textoPdf } from './imagenPdf';

export interface EtiquetaProducto { name: string; price: number; codigo: string }

export async function etiquetasPDF(items: EtiquetaProducto[], tienda: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const COLS = 3, FILAS = 8;
  const anchoPag = 210, altoPag = 297, margenX = 8, margenY = 10;
  const w = (anchoPag - margenX * 2) / COLS;
  const h = (altoPag - margenY * 2) / FILAS;
  const porHoja = COLS * FILAS;

  items.forEach((it, i) => {
    if (i > 0 && i % porHoja === 0) doc.addPage();
    const k = i % porHoja;
    const x = margenX + (k % COLS) * w;
    const y = margenY + Math.floor(k / COLS) * h;

    doc.setDrawColor(210, 210, 210).setLineDashPattern([1, 1], 0).rect(x + 1, y + 1, w - 2, h - 2).setLineDashPattern([], 0);

    // Nombre (máx. 2 líneas) y precio
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(20, 20, 20);
    const nombre = (doc.splitTextToSize(textoPdf(it.name), w - 8) as string[]).slice(0, 2);
    nombre.forEach((l, j) => doc.text(l, x + 4, y + 6 + j * 3.2));
    doc.setFontSize(9);
    doc.text(`S/ ${Number(it.price).toFixed(2)}`, x + w - 4, y + h - 3.5, { align: 'right' });

    // Barras
    const top = y + 6 + nombre.length * 3.2 + 0.5;
    const altoBarras = h - (top - y) - 7;
    if (esEan13(it.codigo)) {
      const patron = patronEan13(it.codigo);
      const modulo = (w - 12) / 95;
      const x0 = x + 6;
      doc.setFillColor(0, 0, 0);
      let j = 0;
      while (j < patron.length) {
        if (patron[j] === '1') {
          let n = 1;
          while (j + n < patron.length && patron[j + n] === '1') n++;
          doc.rect(x0 + j * modulo, top, n * modulo, altoBarras, 'F');
          j += n;
        } else j++;
      }
    } else {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120, 120, 120);
      doc.text('(código no EAN-13: no se dibuja)', x + 6, top + altoBarras / 2);
    }
    doc.setFont('courier', 'normal').setFontSize(8).setTextColor(40, 40, 40);
    doc.text(textoPdf(it.codigo), x + 4, y + h - 3.5);
  });

  doc.setProperties({ title: `Etiquetas - ${textoPdf(tienda)}` });
  return doc;
}
