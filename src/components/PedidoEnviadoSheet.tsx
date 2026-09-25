'use client';

// Después de mandar el pedido por WhatsApp, ofrece guardar o compartir el comprobante en PDF.
// lib/whatsapp.ts avisa con el evento `boga:pedido-enviado`; así funciona en todas las plantillas.

import { useEffect, useState } from 'react';
import { compartirPDF, pdfDePedido } from '@/lib/pdfPedido';

export const EVENTO_PEDIDO_ENVIADO = 'boga:pedido-enviado';
type Detalle = { tienda: string; mensaje: string; codigo?: string };

export default function PedidoEnviadoSheet() {
  const [pedido, setPedido] = useState<Detalle | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const alEnviar = (e: Event) => { setPedido((e as CustomEvent<Detalle>).detail); setAviso(''); };
    window.addEventListener(EVENTO_PEDIDO_ENVIADO, alEnviar);
    return () => window.removeEventListener(EVENTO_PEDIDO_ENVIADO, alEnviar);
  }, []);

  if (!pedido) return null;

  const guardar = async () => {
    setTrabajando(true);
    try {
      const file = await pdfDePedido(pedido.tienda, pedido.mensaje, pedido.codigo);
      const r = await compartirPDF(file, `Mi pedido en ${pedido.tienda}`);
      setAviso(r === 'descargado' ? 'Se descargó tu comprobante.' : r === 'compartido' ? '¡Listo!' : '');
    } catch { setAviso('No se pudo crear el PDF. Intenta de nuevo.'); }
    setTrabajando(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-3">
      <div className="max-w-[460px] mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[26px] text-green-600 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-gray-900 leading-tight">Pedido enviado a {pedido.tienda}{pedido.codigo ? ` · N° ${pedido.codigo.toUpperCase()}` : ''}</p>
            <p className="text-xs text-gray-500 mt-0.5">Se abrió WhatsApp con tu pedido. Si quieres, guarda tu comprobante en PDF.</p>
            {aviso && <p className="text-xs font-semibold text-green-700 mt-1">{aviso}</p>}
            <div className="flex flex-wrap gap-2 mt-2.5">
              <button type="button" onClick={guardar} disabled={trabajando}
                className="text-xs font-bold text-white px-3.5 py-2 rounded-full disabled:opacity-60" style={{ backgroundColor: '#b8130e' }}>
                {trabajando ? 'Preparando…' : 'Guardar / compartir PDF'}
              </button>
              <button type="button" onClick={() => setPedido(null)} className="text-xs font-bold px-3.5 py-2 rounded-full border border-gray-300 text-gray-700">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
