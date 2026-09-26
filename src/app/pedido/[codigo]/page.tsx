'use client';

// Detalle de un pedido de la carta (el enlace que va en el mensaje de WhatsApp). Cualquiera con el
// código ve lo básico; el dueño de la tienda, con su sesión, ve también los datos del cliente y puede
// cambiar el estado. Ver src/app/api/pedido/[codigo]/route.ts.

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { compartirPDF, pdfDePedido } from '@/lib/pdfPedido';

type Pedido = {
  codigo: string;
  tienda: { slug: string; nombre: string };
  items: { name: string; price: number; quantity: number }[];
  total: number;
  estado: string;
  pago?: 'pendiente' | 'pagado' | 'fallido' | null;
  creado: string;
  entrega: string;
  propietario: boolean;
  cliente?: { nombre: string | null; telefono: string | null; direccion: string | null };
};

const ESTADOS = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
const color = (e: string) =>
  e === 'Entregado' ? 'bg-blue-50 text-blue-700 border-blue-200'
  : e === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200'
  : e === 'Pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200'
  : 'bg-green-50 text-green-700 border-green-200';

const wa = (tel: string) => { const d = tel.replace(/\D/g, ''); return d ? `https://wa.me/${d.length === 9 ? '51' + d : d}` : ''; };

export default function PedidoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [p, setP] = useState<Pedido | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'noexiste'>('cargando');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    // Con sesión de dueño el servidor devuelve además los datos del cliente
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    try {
      const r = await fetch(`/api/pedido/${encodeURIComponent(codigo)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!r.ok) { setEstado('noexiste'); return; }
      setP(await r.json());
      setEstado('ok');
    } catch { setEstado('noexiste'); }
  }, [codigo]);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = async (nuevo: string) => {
    if (nuevo === 'Cancelado' && !window.confirm('¿Cancelar este pedido? Si llevaba stock, se devuelve al inventario.')) return;
    setOcupado(true); setAviso('');
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const r = await fetch(`/api/pedido/${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ estado: nuevo }),
    });
    if (!r.ok) setAviso((await r.json().catch(() => ({}))).error || 'No se pudo cambiar el estado');
    else await cargar();
    setOcupado(false);
  };

  const pdf = async () => {
    if (!p) return;
    const texto = [
      ...p.items.map((i) => `- ${i.quantity}x ${i.name} - S/ ${(i.price * i.quantity).toFixed(2)}`),
      '', `Total: S/ ${p.total.toFixed(2)}`, `Entrega: ${p.entrega}`,
    ].join('\n');
    const file = await pdfDePedido(p.tienda.nombre, texto, p.codigo);
    await compartirPDF(file, `Pedido en ${p.tienda.nombre}`);
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <header className="border-b border-surface-container-highest bg-surface">
        <div className="max-w-[560px] mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="" className="w-7 h-7" />
            <span className="font-headline-sm text-headline-sm">BogaHub</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[560px] mx-auto px-4 py-6">
        {estado === 'cargando' && <p className="text-secondary text-sm">Cargando tu pedido…</p>}

        {estado === 'noexiste' && (
          <div className="text-center py-12">
            <p className="font-headline-sm text-headline-sm">No encontramos este pedido</p>
            <p className="text-secondary text-sm mt-1">Revisa que el enlace esté completo.</p>
            <Link href="/explore" className="inline-block mt-4 text-sm font-bold text-primary">Ir al Market</Link>
          </div>
        )}

        {estado === 'ok' && p && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">Pedido N° {p.codigo.toUpperCase()}</p>
              <h1 className="font-headline-md text-2xl font-extrabold mt-0.5">{p.tienda.nombre}</h1>
              <p className="text-secondary text-xs mt-0.5">{new Date(p.creado).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })} · {p.entrega}</p>
            </div>

            {/* Cobro online (tarjeta / Yape): pagado, o falta pagar */}
            {p.pago === 'pagado' && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm font-bold text-green-800">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Pagado con tarjeta / Yape
              </div>
            )}
            {(p.pago === 'pendiente' || p.pago === 'fallido') && p.estado !== 'Cancelado' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5">
                <span className="text-sm font-bold text-orange-800">{p.pago === 'fallido' ? 'El pago no se completó' : 'Falta pagar este pedido'}</span>
                <Link href={`/pagar/${p.codigo}`} className="rounded-full bg-primary px-4 py-1.5 text-xs font-extrabold text-on-primary">Pagar ahora</Link>
              </div>
            )}

            <span className={`self-start inline-flex px-3 py-1 rounded-full text-xs font-bold border ${color(p.estado)}`}>{p.estado}</span>

            <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-4">
              <ul className="flex flex-col gap-2">
                {p.items.map((i, k) => (
                  <li key={k} className="flex justify-between gap-3 text-sm">
                    <span>{i.quantity}× {i.name}</span>
                    <span className="font-bold">S/ {(i.price * i.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between border-t border-surface-container-highest mt-3 pt-3 font-extrabold">
                <span>Total</span><span>S/ {p.total.toFixed(2)}</span>
              </p>
            </div>

            <p className="text-[11px] text-secondary leading-relaxed">
              Este pedido es directo con <b>{p.tienda.nombre}</b>: la tienda lo prepara, lo cobra y lo entrega o lo deja listo para recoger.
              BogaHub solo te conecta con ella.
            </p>

            {p.propietario && p.cliente && (
              <div className="bg-surface-container-lowest border border-primary/30 rounded-2xl p-4 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">Solo tú ves esto · datos del cliente</p>
                <p className="font-bold">{p.cliente.nombre || 'Cliente'}</p>
                {p.cliente.telefono && (
                  <p className="flex items-center gap-2">
                    {p.cliente.telefono}
                    {wa(p.cliente.telefono) && <a href={wa(p.cliente.telefono)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">WhatsApp</a>}
                  </p>
                )}
                {p.cliente.direccion && <p className="text-secondary">{p.cliente.direccion}</p>}

                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mt-3 mb-1.5">Estado del pedido</p>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS.map((e) => (
                    <button key={e} type="button" disabled={ocupado || p.estado === e} onClick={() => cambiar(e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border disabled:cursor-default ${p.estado === e ? color(e) : 'bg-white text-secondary border-surface-container-highest disabled:opacity-50'}`}>
                      {e}
                    </button>
                  ))}
                </div>
                {aviso && <p className="text-red-600 text-xs font-semibold mt-2">{aviso}</p>}
                <Link href="/admin" className="inline-block mt-3 text-xs font-bold text-primary">Ir a mi panel de pedidos</Link>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={pdf} className="text-sm font-bold text-white bg-primary px-4 py-2.5 rounded-full">Descargar / compartir PDF</button>
              <Link href={`/${p.tienda.slug}`} className="text-sm font-bold px-4 py-2.5 rounded-full border border-surface-container-highest">Ver la tienda</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
