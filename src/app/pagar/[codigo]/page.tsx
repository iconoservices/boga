'use client';

// Pantalla previa al pago online (tarjeta / Yape por Izipay): resumen del pedido + correo del cliente (Izipay le envía ahí
// el comprobante). Al continuar, se envía a /api/pagos/iniciar, que responde la página con el formulario de pago oficial.
// Ver src/app/api/pagos/iniciar/route.ts.

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Pedido = {
  codigo: string;
  tienda: { slug: string; nombre: string };
  items: { name: string; price: number; quantity: number }[];
  total: number;
  estado: string;
  pago?: 'pendiente' | 'pagado' | 'fallido' | null;
};

function Contenido({ codigo }: { codigo: string }) {
  const [p, setP] = useState<Pedido | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'noexiste'>('cargando');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const huboError = useSearchParams().get('error') === '1';

  useEffect(() => {
    try { setEmail(localStorage.getItem('boga_pago_email') || ''); } catch { /* sin almacenamiento */ }
    fetch(`/api/pedido/${encodeURIComponent(codigo)}`, { cache: 'no-store' })
      .then(async (r) => { if (!r.ok) { setEstado('noexiste'); return; } setP(await r.json()); setEstado('ok'); })
      .catch(() => setEstado('noexiste'));
  }, [codigo]);

  const guardarCorreo = () => { try { localStorage.setItem('boga_pago_email', email.trim()); } catch { /* sin almacenamiento */ } };

  return (
    <main className="min-h-screen bg-background text-on-background">
      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
        {estado === 'cargando' && <div className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />}

        {estado === 'noexiste' && (
          <div className="rounded-2xl border border-surface-container-highest bg-white p-5 text-center">
            <p className="font-bold">No encontramos ese pedido.</p>
            <Link href="/" className="text-primary font-bold text-sm mt-3 inline-block">← Ir al inicio</Link>
          </div>
        )}

        {estado === 'ok' && p && (
          <>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">Pedido N° {p.codigo.toUpperCase()}</p>
              <h1 className="font-headline-md text-2xl font-extrabold mt-0.5">Pagar en {p.tienda.nombre}</h1>
            </div>

            {huboError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-800">
                El pago no se completó. Puedes intentarlo de nuevo con otra tarjeta o con Yape.
              </div>
            )}

            <div className="rounded-2xl border border-surface-container-highest bg-white p-4">
              <ul className="flex flex-col gap-1.5 text-sm">
                {p.items.map((i, k) => (
                  <li key={k} className="flex justify-between gap-3"><span>{i.quantity}× {i.name}</span><span className="font-semibold">S/ {(i.price * i.quantity).toFixed(2)}</span></li>
                ))}
              </ul>
              <div className="flex justify-between mt-3 pt-3 border-t border-dashed border-surface-container-highest font-extrabold text-base">
                <span>Total</span><span>S/ {p.total.toFixed(2)}</span>
              </div>
            </div>

            {p.pago === 'pagado' ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800 flex items-center justify-between gap-2">
                <span>Este pedido ya está pagado.</span>
                <Link href={`/pedido/${p.codigo}`} className="text-primary underline">Ver mi pedido</Link>
              </div>
            ) : p.estado === 'Cancelado' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">Este pedido fue cancelado.</div>
            ) : (
              <form method="POST" action="/api/pagos/iniciar" onSubmit={guardarCorreo} className="flex flex-col gap-3">
                <input type="hidden" name="codigo" value={p.codigo} />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">Tu correo</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full rounded-xl border border-surface-container-highest bg-white px-4 py-3 text-base focus:outline-none focus:border-primary"
                  />
                  <span className="text-[11px] text-secondary">Izipay te envía ahí el comprobante del pago.</span>
                </label>
                <button
                  type="submit"
                  disabled={enviando}
                  onClick={() => setEnviando(true)}
                  className="w-full rounded-full bg-primary text-on-primary font-extrabold py-3.5 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  Pagar S/ {p.total.toFixed(2)} con tarjeta o Yape
                </button>
                <p className="text-[11px] text-secondary text-center">Pago seguro con Izipay. El dinero va directo a {p.tienda.nombre}.</p>
              </form>
            )}

            <Link href={`/pedido/${p.codigo}`} className="text-center text-sm font-bold text-primary">Ver el estado de mi pedido</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function PagarPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  return (
    <Suspense fallback={null}>
      <Contenido codigo={codigo} />
    </Suspense>
  );
}
