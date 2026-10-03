'use client';

// Detalle de un pedido de la carta (el enlace que va en el mensaje de WhatsApp). Cualquiera con el
// código ve lo básico y el SEGUIMIENTO (Recibido → Preparando → En camino → ¡Llegó!, y la moto en un mapa mientras
// va en camino); el dueño de la tienda, con su sesión, ve también los datos del cliente, puede cambiar el estado y
// asignar un repartidor. Ver src/app/api/pedido/[codigo]/route.ts.

import { use, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { compartirPDF, pdfDePedido } from '@/lib/pdfPedido';

// Leaflet solo se descarga cuando hay una moto que mostrar.
const MapaRepartidor = dynamic(() => import('@/components/MapaRepartidor'), {
  ssr: false,
  loading: () => <div className="w-full h-64 rounded-2xl bg-surface-container-highest animate-pulse" />,
});

type Pedido = {
  codigo: string;
  tienda: { slug: string; nombre: string };
  items: { name: string; price: number; quantity: number }[];
  total: number;
  estado: string;
  pago?: 'pendiente' | 'pagado' | 'fallido' | null;
  creado: string;
  entrega: string;
  llego: boolean;
  repartidor: { nombre: string; placa: string | null; tel: string | null; de: 'tienda' | 'boga' } | null;
  posicion: { lat: number; lng: number; haceSeg: number } | null;
  propietario: boolean;
  repartidorId?: string | null;
  cliente?: { nombre: string | null; telefono: string | null; direccion: string | null };
};

type RepartidorBoga = { id: string; nombre: string; placa: string | null };
type Repartidor = { id: string; nombre: string; tel: string | null; placa: string | null; token: string | null; visto: string | null };

const ESTADOS = ['Pendiente', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
const BOTON_ESTADO: Record<string, { icono: string; solido: string; borde: string; texto: string }> = {
  Pendiente: { icono: 'schedule', solido: 'bg-orange-500', borde: 'border-orange-200', texto: 'text-orange-600' },
  Preparando: { icono: 'skillet', solido: 'bg-amber-500', borde: 'border-amber-200', texto: 'text-amber-600' },
  Enviado: { icono: 'local_shipping', solido: 'bg-green-600', borde: 'border-green-200', texto: 'text-green-600' },
  Entregado: { icono: 'check_circle', solido: 'bg-blue-600', borde: 'border-blue-200', texto: 'text-blue-600' },
  Cancelado: { icono: 'cancel', solido: 'bg-red-600', borde: 'border-red-200', texto: 'text-red-500' },
};
const color = (e: string) =>
  e === 'Entregado' ? 'bg-blue-50 text-blue-700 border-blue-200'
  : e === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200'
  : e === 'Pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200'
  : 'bg-green-50 text-green-700 border-green-200';

const wa = (tel: string) => { const d = tel.replace(/\D/g, ''); return d ? `https://wa.me/${d.length === 9 ? '51' + d : d}` : ''; };

// Barra de pasos tipo «tracker» de pizzería: dónde va el pedido y qué sigue.
function Seguimiento({ p }: { p: Pedido }) {
  const delivery = p.entrega === 'Delivery';
  const pasos = delivery ? ['Recibido', 'Preparando', 'En camino', '¡Llegó!'] : ['Recibido', 'Preparando', 'Listo para recoger'];
  const cerrado = p.estado === 'Entregado';
  const actual = cerrado ? pasos.length : p.estado === 'Pendiente' ? 0 : p.estado === 'Preparando' ? 1 : delivery ? (p.llego ? 3 : 2) : 2;
  const nombre = p.repartidor?.nombre;
  const mensaje = cerrado ? '¡Pedido entregado! Gracias por comprar 🎉'
    : actual === 0 ? 'La tienda recibió tu pedido. En un momento lo empiezan a preparar.'
    : actual === 1 ? 'Están preparando tu pedido.'
    : !delivery ? 'Tu pedido está listo: pasa a recogerlo a la tienda.'
    : actual === 2 ? (nombre ? `${nombre} va en camino con tu pedido.` : 'Tu pedido va en camino.')
    : `¡${nombre ?? 'Tu repartidor'} llegó! Sal a recibir tu pedido.`;

  return (
    <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-4">
      <ol className="flex items-start">
        {pasos.map((t, i) => {
          const hecho = i < actual, ahora = i === actual;
          return (
            <li key={t} className="flex-1 flex flex-col items-center text-center relative">
              {i > 0 && <span className={`absolute top-3.5 right-1/2 w-full h-0.5 ${i <= actual ? 'bg-primary' : 'bg-surface-container-highest'}`} />}
              <span className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border-2 ${hecho ? 'bg-primary border-primary text-white' : ahora ? 'bg-white border-primary text-primary animate-pulse' : 'bg-surface-container-highest border-transparent text-secondary'}`}>
                {hecho ? '✓' : i + 1}
              </span>
              <span className={`mt-1.5 text-[11px] leading-tight px-0.5 ${hecho || ahora ? 'font-bold text-on-background' : 'text-secondary'}`}>{t}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm font-bold text-center">{mensaje}</p>
    </div>
  );
}

export default function PedidoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [p, setP] = useState<Pedido | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'noexiste'>('cargando');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [deBoga, setDeBoga] = useState<RepartidorBoga[]>([]);
  const [elegido, setElegido] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', tel: '' });
  const llegoAntes = useRef<boolean | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    // Con sesión de dueño el servidor devuelve además los datos del cliente
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    try {
      const r = await fetch(`/api/pedido/${encodeURIComponent(codigo)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
      if (!r.ok) { if (!silencioso) setEstado('noexiste'); return; }
      setP(await r.json());
      setEstado('ok');
    } catch { if (!silencioso) setEstado('noexiste'); }
  }, [codigo]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { cargar(); }, [cargar]);

  // Se refresca solo mientras el pedido sigue abierto (y es reciente): más seguido cuando va en camino, para mover la moto.
  const abierto = !!p && ['Pendiente', 'Preparando', 'Enviado'].includes(p.estado);
  const enCamino = !!p && p.estado === 'Enviado';
  const creado = p?.creado;
  useEffect(() => {
    if (!abierto || !creado || Date.now() - new Date(creado).getTime() > 12 * 3_600_000) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') cargar(true); }, enCamino ? 8000 : 20_000);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(true); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [abierto, enCamino, creado, cargar]);

  // Cuando el repartidor toca «Ya llegué» con esta pantalla abierta: vibra y lo dice en la pestaña.
  useEffect(() => {
    if (!p) return;
    if (llegoAntes.current === false && p.llego) {
      try { navigator.vibrate?.([300, 150, 300, 150, 500]); } catch { /* sin vibración */ }
      document.title = '📍 ¡Tu pedido llegó!';
    }
    llegoAntes.current = p.llego;
  }, [p]);

  const conToken = async () => (await supabase.auth.getSession()).data.session?.access_token ?? '';

  const cambiar = async (nuevoEstado: string) => {
    if (nuevoEstado === 'Cancelado' && !window.confirm('¿Cancelar este pedido? Si llevaba stock, se devuelve al inventario.')) return;
    setOcupado(true); setAviso('');
    const r = await fetch(`/api/pedido/${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await conToken()}` },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (!r.ok) setAviso((await r.json().catch(() => ({}))).error || 'No se pudo cambiar el estado');
    else await cargar();
    setOcupado(false);
  };

  // ── Repartidores de la tienda (solo el dueño, solo pedidos con delivery) ──
  const tiendaSlug = p?.tienda.slug;
  const gestionaRepartidor = !!p && p.propietario && p.entrega === 'Delivery';
  const cargarRepartidores = useCallback(async () => {
    if (!tiendaSlug) return;
    const r = await fetch(`/api/repartidores?store=${encodeURIComponent(tiendaSlug)}`, { headers: { Authorization: `Bearer ${await conToken()}` }, cache: 'no-store' });
    if (r.ok) {
      const d = (await r.json()) as { repartidores: Repartidor[]; boga?: RepartidorBoga[] };
      setRepartidores(d.repartidores ?? []);
      setDeBoga(d.boga ?? []);
    }
  }, [tiendaSlug]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (gestionaRepartidor) cargarRepartidores(); }, [gestionaRepartidor, cargarRepartidores]);

  const asignar = async (id: string | null) => {
    setOcupado(true); setAviso('');
    const r = await fetch(`/api/pedido/${encodeURIComponent(codigo)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await conToken()}` },
      body: JSON.stringify({ repartidor: id }),
    });
    if (!r.ok) setAviso((await r.json().catch(() => ({}))).error || 'No se pudo asignar');
    else { setElegido(''); await cargar(); }
    setOcupado(false);
  };

  const agregarRepartidor = async () => {
    if (!tiendaSlug) return;
    setOcupado(true); setAviso('');
    const r = await fetch('/api/repartidores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await conToken()}` },
      body: JSON.stringify({ store: tiendaSlug, nombre: nuevo.nombre, tel: nuevo.tel }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setAviso(d.error || 'No se pudo agregar');
    else { setNuevo({ nombre: '', tel: '' }); await cargarRepartidores(); if (d.repartidor) enviarEnlace(d.repartidor as Repartidor); }
    setOcupado(false);
  };

  const quitarRepartidor = async (rp: Repartidor) => {
    if (!window.confirm(`¿Quitar a ${rp.nombre}? Deja de ver sus entregas y su enlace deja de funcionar.`)) return;
    await fetch(`/api/repartidores?id=${rp.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await conToken()}` } });
    await cargarRepartidores();
    await cargar();
  };

  const enlaceApp = (rp: Repartidor) => `${window.location.origin}/transporte/chofer?t=${rp.token}`;
  const enviarEnlace = (rp: Repartidor) => {
    if (!rp.token || !p) return;
    const msg = `Hola ${rp.nombre.split(' ')[0]}, te agregué como repartidor de ${p.tienda.nombre} en BogaHub. Abre este enlace en tu celular (es solo tuyo, no lo compartas): ${enlaceApp(rp)}\n\nToca «Activar avisos» para que te suene cuando te asigne un pedido.`;
    const url = rp.tel ? `${wa(rp.tel)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
  };
  const copiarEnlace = async (rp: Repartidor) => {
    try { await navigator.clipboard.writeText(enlaceApp(rp)); setAviso('Enlace copiado. Pégalo en su WhatsApp.'); } catch { setAviso(enlaceApp(rp)); }
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

  const repAsignado = p?.repartidorId ? repartidores.find((r) => r.id === p.repartidorId) : null;

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

            {p.estado === 'Cancelado'
              ? <span className={`self-start inline-flex px-3 py-1 rounded-full text-xs font-bold border ${color(p.estado)}`}>{p.estado}</span>
              : <Seguimiento p={p} />}

            {/* La moto en vivo, solo mientras el pedido va en camino */}
            {p.entrega === 'Delivery' && p.estado === 'Enviado' && (
              <div className="flex flex-col gap-2">
                {p.posicion ? (
                  <>
                    <MapaRepartidor lat={p.posicion.lat} lng={p.posicion.lng} />
                    <p className="text-[11px] text-secondary text-center">
                      Ubicación del repartidor · actualizada hace {p.posicion.haceSeg < 60 ? `${p.posicion.haceSeg} s` : `${Math.round(p.posicion.haceSeg / 60)} min`}
                    </p>
                  </>
                ) : p.repartidor ? (
                  <p className="text-xs text-secondary text-center bg-surface-container-lowest border border-surface-container-highest rounded-xl px-3 py-2.5">
                    Esperando la ubicación de {p.repartidor.nombre}… Si no aparece, sigue el estado de arriba: te avisamos cuando llegue.
                  </p>
                ) : null}
              </div>
            )}

            {p.repartidor && p.estado !== 'Cancelado' && p.estado !== 'Entregado' && (
              <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Tu repartidor · {p.repartidor.de === 'boga' ? '🛡 BogaHub' : `🏪 ${p.tienda.nombre}`}</p>
                  <p className="font-extrabold">{p.repartidor.nombre}{p.repartidor.placa ? <span className="text-secondary font-semibold text-xs"> · {p.repartidor.placa}</span> : null}</p>
                </div>
                {p.repartidor.tel && <a href={`tel:+${p.repartidor.tel.replace(/\D/g, '')}`} className="text-sm font-bold text-white bg-primary px-4 py-2.5 rounded-full">📞 Llamar</a>}
              </div>
            )}

            {/* El recibo: lo central de la página */}
            <div className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 text-center">
                <span className="material-symbols-outlined text-primary text-[28px]">receipt_long</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mt-1">Recibo de tu pedido</p>
              </div>
              <ul className="flex flex-col gap-3 px-5 py-4 border-y border-dashed border-surface-container-highest">
                {p.items.map((i, k) => (
                  <li key={k} className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex items-start gap-2.5 min-w-0">
                      <span className="shrink-0 min-w-[26px] h-[26px] rounded-md bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center">{i.quantity}×</span>
                      <span className="font-semibold leading-snug break-words">{i.name}</span>
                    </span>
                    <span className="font-bold shrink-0">S/ {(i.price * i.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex items-baseline justify-between px-5 py-4">
                <span className="text-sm font-bold uppercase tracking-wide text-secondary">Total</span>
                <span className="text-2xl font-black">S/ {p.total.toFixed(2)}</span>
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
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-base font-bold">{p.cliente.telefono}</span>
                    {wa(p.cliente.telefono) && (
                      <a href={wa(p.cliente.telefono)} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" title="Escribir por WhatsApp" className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm active:scale-95 transition">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88zM20.52 3.45A11.8 11.8 0 0 0 12.04 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.54 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.4z"/></svg>
                      </a>
                    )}
                  </div>
                )}
                {p.cliente.direccion && (
                  <p className="text-secondary break-words">
                    {p.cliente.direccion.split(/(https?:\/\/[^\s]+)/g).map((t, i) => /^https?:\/\//.test(t)
                      ? <a key={i} href={t} target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">Abrir en el mapa</a>
                      : <span key={i}>{t}</span>)}
                  </p>
                )}

                <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mt-3 mb-1.5">Estado del pedido</p>
                <div className="grid grid-cols-2 gap-2">
                  {ESTADOS.map((e) => {
                    const activo = p.estado === e;
                    const v = BOTON_ESTADO[e] ?? BOTON_ESTADO.Pendiente;
                    return (
                      <button key={e} type="button" disabled={ocupado || activo} onClick={() => cambiar(e)}
                        className={`flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-xl border-2 text-xs font-extrabold transition active:scale-95 disabled:cursor-default ${
                          activo ? `${v.solido} border-transparent text-white shadow-md` : `bg-white ${v.borde} ${v.texto} disabled:opacity-50`
                        } ${e === 'Cancelado' ? 'col-span-2 min-h-[44px]' : ''}`}>
                        <span className="material-symbols-outlined text-[24px]">{v.icono}</span>
                        {e}
                      </button>
                    );
                  })}
                </div>

                {gestionaRepartidor && (
                  <div className="mt-4 pt-3 border-t border-surface-container-highest">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-secondary mb-1.5">Repartidor</p>
                    {p.repartidorId ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold">🛵 {repAsignado?.nombre ?? p.repartidor?.nombre ?? 'Asignado'}{p.repartidor?.de === 'boga' && <span className="ml-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 align-middle">🛡 BogaHub</span>}</p>
                        {p.estado !== 'Entregado' && p.estado !== 'Cancelado' && (
                          <button type="button" disabled={ocupado} onClick={() => asignar(null)} className="text-xs font-bold text-red-600 border border-red-200 rounded-full px-3 py-1.5">Quitar</button>
                        )}
                      </div>
                    ) : p.estado === 'Entregado' || p.estado === 'Cancelado' ? (
                      <p className="text-secondary text-xs">Sin repartidor.</p>
                    ) : repartidores.length > 0 || deBoga.length > 0 ? (
                      <div className="flex gap-2">
                        <select value={elegido} onChange={(e) => setElegido(e.target.value)} className="flex-1 min-w-0 rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm">
                          <option value="">Elige quién lo lleva…</option>
                          {repartidores.length > 0 && <optgroup label="🏪 Mis repartidores">{repartidores.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</optgroup>}
                          {deBoga.length > 0 && <optgroup label="🛡 Repartidores BogaHub">{deBoga.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</optgroup>}
                        </select>
                        <button type="button" disabled={ocupado || !elegido} onClick={() => asignar(elegido)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">Asignar</button>
                      </div>
                    ) : (
                      <p className="text-secondary text-xs">Todavía no tienes repartidores. Agrega uno abajo: le llega su enlace por WhatsApp y desde su celular ve los pedidos que le asignes.</p>
                    )}

                    <details className="mt-3">
                      <summary className="text-xs font-bold text-primary cursor-pointer">Mis repartidores ({repartidores.length})</summary>
                      <div className="mt-2 flex flex-col gap-2">
                        {repartidores.map((r) => (
                          <div key={r.id} className="rounded-xl border border-surface-container-highest bg-white p-3 flex flex-col gap-2">
                            <p className="font-bold text-sm">{r.nombre} <span className="text-secondary font-normal text-xs">{r.tel ? `· ${r.tel}` : ''}</span></p>
                            <p className="text-[11px] text-secondary">{r.visto ? `Abrió su app ${new Date(r.visto).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}` : 'Todavía no abrió su app'}</p>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => enviarEnlace(r)} className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">Enviar su enlace por WhatsApp</button>
                              <button type="button" onClick={() => copiarEnlace(r)} className="text-[11px] font-bold border border-surface-container-highest rounded-full px-3 py-1.5">Copiar enlace</button>
                              <button type="button" onClick={() => quitarRepartidor(r)} className="text-[11px] font-bold text-red-600 border border-red-200 rounded-full px-3 py-1.5">Quitar</button>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-xl border border-dashed border-surface-container-highest p-3 flex flex-col gap-2">
                          <p className="text-xs font-bold">Agregar repartidor</p>
                          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre" maxLength={60}
                            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm" />
                          <input value={nuevo.tel} onChange={(e) => setNuevo({ ...nuevo, tel: e.target.value })} placeholder="Su WhatsApp (9 dígitos)" inputMode="tel" maxLength={15}
                            className="rounded-xl border border-surface-container-highest bg-white px-3 py-2 text-sm" />
                          <button type="button" disabled={ocupado || !nuevo.nombre.trim() || nuevo.tel.replace(/\D/g, '').length < 9} onClick={agregarRepartidor}
                            className="py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">Agregar y enviarle su enlace</button>
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                {aviso && <p className={`text-xs font-semibold mt-2 ${aviso.startsWith('Enlace copiado') ? 'text-green-700' : 'text-red-600'}`}>{aviso}</p>}
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
