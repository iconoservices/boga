'use client';

// Botón "Pedir por WhatsApp" de la página de un producto. Igual que el carrito de la carta: el pedido
// se guarda en el panel del dueño y se abre WhatsApp con el mensaje (ver lib/whatsapp.ts).

import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';

export default function PedirProducto({
  slug, nombreTienda, whatsapp, productoId, nombre, precio, color,
}: {
  slug: string;
  nombreTienda: string;
  whatsapp: string | null;
  productoId: string;
  nombre: string;
  precio: number;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        const cliente = await pedirDatosCliente({ color });
        if (!cliente) return;
        enviarPedidoPorWhatsApp(
          { slug, name: nombreTienda, whatsapp: whatsapp ?? undefined },
          `¡Hola ${nombreTienda}! Soy ${cliente.nombre} (${cliente.telefono}). Quiero pedir:\n\n• 1x ${nombre} — S/ ${precio.toFixed(2)}\n\nTotal: S/ ${precio.toFixed(2)}`,
          { items: [{ id: productoId, quantity: 1 }], cliente },
        );
      }}
      className="w-full py-3.5 rounded-xl text-white font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
      style={{ background: color }}
    >
      <span className="material-symbols-outlined text-[22px]">chat</span>
      Pedir por WhatsApp
    </button>
  );
}
