// Generación de Aviso de Cobro / Proforma en PDF para Superadmin Cobros.
// Usa jsPDF para generar un comprobante elegante, listo para descargar o compartir por WhatsApp.

export interface DatosCobroPDF {
  tiendaNombre: string;
  tiendaSlug: string;
  planNombre: string;
  monto: number;
  venceFecha?: string | null;
  estadoTexto: string;
  datosPago?: {
    yape?: string;
    titular?: string;
    banco?: string;
    cuenta?: string;
    cci?: string;
  };
}

export async function generarPdfCobro(d: DatosCobroPDF): Promise<File> {
  const { jsPDF } = await import('jspdf');

  // Formato tipo recibo / estado de cuenta compacto (ancho 380pt, alto dinámico)
  const W = 380;
  const M = 28;
  const alto = 520;
  const doc = new jsPDF({ unit: 'pt', format: [W, alto] });

  const limpiar = (t: string) =>
    (t || '')
      .replace(/[•·▪●]/g, '-')
      .replace(/[—–]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\*/g, '')
      .replace(/[^\u0000-\u00FF]/g, '')
      .trim();

  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const fechaVenceFmt = d.venceFecha ? d.venceFecha.split('-').reverse().join('/') : 'Fecha por coordinar';

  // 1. Cabecera Corporativa
  doc.setFillColor(0, 88, 190); // Azul BogaHub #0058be
  doc.rect(0, 0, W, 70, 'F');

  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(255, 255, 255);
  doc.text('BOGAHUB', M, 38);

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(210, 230, 255);
  doc.text('Plataforma de Comercio Digital', M, 52);

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(255, 255, 255);
  doc.text('AVISO DE COBRANZA', W - M, 38, { align: 'right' });

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(210, 230, 255);
  doc.text(`Emisión: ${fechaHoy}`, W - M, 52, { align: 'right' });

  let y = 95;

  // 2. Datos de la Tienda
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(100, 105, 115);
  doc.text('TIENDA / COMERCIO:', M, y);
  y += 16;

  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(25, 27, 35);
  doc.text(limpiar(d.tiendaNombre), M, y);
  y += 14;

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(114, 119, 133);
  doc.text(`bogahub.app/${d.tiendaSlug}`, M, y);
  y += 18;

  // Línea divisoria
  doc.setDrawColor(230, 232, 242).line(M, y, W - M, y);
  y += 18;

  // 3. Detalle del Cobro / Mensualidad
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(M, y, W - M * 2, 74, 6, 6, 'F');
  doc.setDrawColor(220, 225, 235);
  doc.roundedRect(M, y, W - M * 2, 74, 6, 6, 'D');

  const yBox = y + 18;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 105, 115);
  doc.text('Concepto / Plan:', M + 14, yBox);
  doc.text('Periodo:', M + 14, yBox + 18);
  doc.text('Estado:', M + 14, yBox + 36);

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(25, 27, 35);
  doc.text(limpiar(d.planNombre), M + 110, yBox);

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(25, 27, 35);
  doc.text(`Hasta el ${fechaVenceFmt}`, M + 110, yBox + 18);

  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(0, 88, 190);
  doc.text(limpiar(d.estadoTexto), M + 110, yBox + 36);

  y += 94;

  // 4. Monto a Pagar Destacado
  doc.setFillColor(242, 247, 255);
  doc.roundedRect(M, y, W - M * 2, 48, 6, 6, 'F');
  doc.setDrawColor(180, 205, 245);
  doc.roundedRect(M, y, W - M * 2, 48, 6, 6, 'D');

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(0, 88, 190);
  doc.text('TOTAL A PAGAR:', M + 14, y + 29);

  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(0, 88, 190);
  doc.text(`S/ ${d.monto.toFixed(2)}`, W - M - 14, y + 30, { align: 'right' });

  y += 66;

  // 5. Cuentas de Pago
  const p = d.datosPago;
  const tieneCuentas = p && (p.yape || p.titular || p.cuenta || p.cci);

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(100, 105, 115);
  doc.text('MODALIDADES DE PAGO:', M, y);
  y += 15;

  if (tieneCuentas) {
    if (p.yape) {
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(25, 27, 35);
      doc.text('Yape / Plin:', M, y);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 110, 60);
      doc.text(limpiar(p.yape), M + 80, y);
      y += 14;
    }
    if (p.titular) {
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(25, 27, 35);
      doc.text('Titular:', M, y);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(25, 27, 35);
      doc.text(limpiar(p.titular), M + 80, y);
      y += 14;
    }
    if (p.cuenta) {
      const b = p.banco ? ` (${p.banco})` : '';
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(25, 27, 35);
      doc.text(`Cuenta${b}:`, M, y);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(25, 27, 35);
      doc.text(limpiar(p.cuenta), M + 80, y);
      y += 14;
    }
    if (p.cci) {
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(25, 27, 35);
      doc.text('CCI:', M, y);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(25, 27, 35);
      doc.text(limpiar(p.cci), M + 80, y);
      y += 14;
    }
  } else {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(114, 119, 133);
    doc.text('Yape, Plin o transferencia bancaria (coordinar vía WhatsApp)', M, y);
    y += 14;
  }

  y += 12;

  // 6. Pie de Nota
  doc.setDrawColor(230, 232, 242).line(M, y, W - M, y);
  y += 16;

  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(130, 135, 145);
  doc.text('Al realizar su abono, por favor enviar la constancia al WhatsApp de', W / 2, y, { align: 'center' });
  y += 11;
  doc.text('BogaHub para validar su pago y mantener sus servicios activos.', W / 2, y, { align: 'center' });

  const nombreLimpio = limpiar(d.tiendaSlug || 'tienda').replace(/[^\w-]+/g, '_');
  const nombreArchivo = `Aviso_Cobro_${nombreLimpio}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new File([doc.output('blob')], nombreArchivo, { type: 'application/pdf' });
}
