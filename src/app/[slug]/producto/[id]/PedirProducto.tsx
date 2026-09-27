'use client';

// Botón "Pedir por WhatsApp" de la página de un producto. Igual que el carrito de la carta: el pedido
// se guarda en el panel del dueño y se abre WhatsApp con el mensaje (ver lib/whatsapp.ts).
// Si el producto tiene presentaciones (100 g / 250 g / 1 kg…), el cliente elige la medida antes de pedir.

import { useState } from 'react';
import { enviarPedidoPorWhatsApp } from '@/lib/whatsapp';
import { pedirDatosCliente } from '@/components/pedirDatosCliente';
import { nombreConPresentacion, type Presentacion } from '@/lib/presentaciones';

export default function PedirProducto({
  slug, nombreTienda, whatsapp, productoId, nombre, precio, color, presentaciones = [],
}: {
  slug: string;
  nombreTienda: string;
  whatsapp: string | null;
  productoId: string;
  nombre: string;
  precio: number;
  color: string;
  presentaciones?: Presentacion[];
}) {
  const [elegida, setElegida] = useState<Presentacion | null>(presentaciones[0] ?? null);
  const precioFinal = elegida?.price ?? precio;
  const nombreFinal = elegida ? nombreConPresentacion(nombre, elegida.label) : nombre;

  return (
    <div className="flex flex-col gap-3">
      {presentaciones.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-extrabold">Elige la cantidad</p>
          <div className="grid grid-cols-2 gap-2">
            {presentaciones.map((x) => {
              const activa = elegida?.label === x.label;
              return (
                <button
                  key={x.label}
                  type="button"
                  onClick={() => setElegida(x)}
                  aria-pressed={activa}
                  className="rounded-xl px-3 py-2.5 text-left border-2 transition-colors"
                  style={{ borderColor: activa ? color : 'rgba(0,0,0,.08)', background: activa ? `${color}14` : '#fff' }}
                >
                  <span className="block text-sm font-extrabold">{x.label}</span>
                  <span className="block text-sm font-bold" style={{ color }}>S/ {x.price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          const cliente = await pedirDatosCliente({ color });
          if (!cliente) return;
          enviarPedidoPorWhatsApp(
            { slug, name: nombreTienda, whatsapp: whatsapp ?? undefined },
            `¡Hola ${nombreTienda}! Soy ${cliente.nombre} (${cliente.telefono}). Quiero pedir:\n\n• 1x ${nombreFinal} — S/ ${precioFinal.toFixed(2)}\n\nTotal: S/ ${precioFinal.toFixed(2)}`,
            { items: [{ id: productoId, quantity: 1, pres: elegida?.label }], cliente },
          );
        }}
        className="w-full py-3.5 rounded-xl text-white font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        style={{ background: color }}
      >
        <span className="material-symbols-outlined text-[22px]">chat</span>
        Pedir por WhatsApp
      </button>
    </div>
  );
}
