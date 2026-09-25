'use client';

// App privada del chofer de Taxi Seguro. Se entra con su enlace secreto (…/transporte/chofer?t=<token>), sin
// contraseña. Aquí el chofer:
//   · activa los avisos (le llega una notificación cuando alguien pide un taxi cerca),
//   · dice dónde está (GPS mientras tiene la app abierta, "estoy en tal zona" o su paradero guardado),
//   · ve los pedidos que le avisaron y toca "Aceptar" (el primero que acepta se queda con el viaje),
//   · ve los datos del pasajero de su viaje y lo termina.
//
// No hay seguimiento continuo de GPS (una web no puede hacerlo con la pantalla apagada y gastaría mucha batería).
// La cercanía sale de: su ubicación tomada UNA vez al abrir un pedido, la zona que marca ("estoy en…") y su
// paradero guardado.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ZONAS_TRANSPORTE } from '@/lib/zonasTransporte';
import { ubicacionActual, mensajeUbicacion, type ErrorUbicacion } from '@/lib/ubicacion';
import { suscribirChofer, esIOS, enModoApp, motivoError } from '@/lib/push';

const VERDE = '#00875A';
const CLAVE_TOKEN = 'boga_chofer_token';

interface PedidoAbierto { id: string; pasajero: string; origen: string | null; destino: string | null; oferta: number | null; tipo: string | null; distanciaKm: number | null; haceSeg: number }
interface Actual { id: string; pasajero: string; tel: string; origen: string | null; destino: string | null; oferta: number | null; pin: string | null }
interface Estado {
  chofer: { nombre: string; tipo: string; placa: string | null };
  pausado: boolean; tieneBase: boolean; zona: string | null; zonasCubre: string[]; gpsReciente: boolean; avisosActivados: boolean;
  pedidos: PedidoAbierto[]; actual: Actual | null;
}

const distTxt = (km: number) => (km < 1 ? `a ${Math.max(50, Math.round(km * 100) * 10)} m` : `a ${km.toFixed(1)} km`);

export default function ChoferApp() {
  const [token, setToken] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [e, setE] = useState<Estado | null>(null);
  const [invalido, setInvalido] = useState(false);
  const [msg, setMsg] = useState('');
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const cantidadAntes = useRef(0);
  const ultimoEnvio = useRef(0);
  const ultimoPunto = useRef<{ lat: number; lng: number } | null>(null);

  // El enlace trae el token; se recuerda para la próxima vez. Si abrió la app sin él, se usa el recordado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let t = params.get('t');
    try {
      if (t) localStorage.setItem(CLAVE_TOKEN, t);
      else t = localStorage.getItem(CLAVE_TOKEN);
    } catch { /* sin almacenamiento */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResaltado(params.get('pedido'));
    setToken(t);
    setListo(true);
  }, []);

  const consultar = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/transporte/chofer?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (res.status === 401) { setInvalido(true); return; }
      if (!res.ok) return;
      const nuevo = (await res.json()) as Estado;
      // Llegó un pedido nuevo con la app abierta: pitido y vibración.
      if (nuevo.pedidos.length > cantidadAntes.current) {
        try {
          navigator.vibrate?.([250, 120, 250]);
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination); osc.frequency.value = 880; g.gain.value = 0.15;
          osc.start(); osc.stop(ctx.currentTime + 0.4);
        } catch { /* el navegador puede bloquear el sonido */ }
      }
      cantidadAntes.current = nuevo.pedidos.length;
      // Limpia de la bandeja de notificaciones los avisos de pedidos que ya no están disponibles.
      navigator.serviceWorker?.getRegistration().then((reg) => reg?.getNotifications().then((lista) => {
        const vigentes = new Set(nuevo.pedidos.map((x) => `taxi-${x.id}`));
        lista.forEach((n) => { if (n.tag.startsWith('taxi-') && !vigentes.has(n.tag)) n.close(); });
      })).catch(() => {});
      // Abrió el aviso de un pedido que ya no está en su lista: lo tomó otro chofer, o se canceló o caducó.
      const buscado = new URLSearchParams(window.location.search).get('pedido');
      if (buscado && !nuevo.actual && !nuevo.pedidos.some((x) => x.id === buscado) && !avisoViejoMostrado.current) {
        avisoViejoMostrado.current = true;
        setMsg('Ese pedido ya no está disponible: lo tomó otro chofer, o el pasajero lo canceló. Sigue atento al próximo.');
      }
      document.title = nuevo.pedidos.length > 0 ? `(${nuevo.pedidos.length}) Taxi · Pedido nuevo` : 'Taxi · App del chofer';
      setE(nuevo);
    } catch { /* sin red: se reintenta */ }
  }, [token]);

  // Cada consulta cuesta una ida a la base: cada 5 s solo si hay pedidos o un viaje en curso; si no, cada 20 s
  // (los pedidos nuevos le llegan igual como notificación).
  const hayMovimiento = !!e && (e.pedidos.length > 0 || !!e.actual);
  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    consultar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') consultar(); }, hayMovimiento ? 5000 : 20_000);
    const alVolver = () => { if (document.visibilityState === 'visible') consultar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [token, consultar, hayMovimiento]);

  const accion = useCallback(async (a: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch('/api/transporte/chofer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: token, accion: a, ...extra }),
    });
    return res.json().catch(() => ({}));
  }, [token]);

  // Al abrir con pedidos esperando (por ejemplo desde la notificación), se toma la ubicación UNA vez, en ese
  // momento, para mostrarle la distancia exacta a cada pedido. Gasta casi nada de batería (una sola lectura).
  const ubicacionDenegada = useRef(false);
  const avisoViejoMostrado = useRef(false);
  const hayPedidos = !!e && e.pedidos.length > 0;
  useEffect(() => {
    if (!token || !hayPedidos || ubicacionDenegada.current) return;
    if (Date.now() - ultimoEnvio.current < 60_000) return;
    let vivo = true;
    ubicacionActual({ esperaMs: 8000 })
      .then(async (p) => {
        if (!vivo) return;
        ultimoEnvio.current = Date.now();
        ultimoPunto.current = { lat: p.lat, lng: p.lng };
        await accion('ubicacion', { lat: p.lat, lng: p.lng });
        consultar();
      })
      .catch((err) => { if (err === 'permiso-denegado') ubicacionDenegada.current = true; });
    return () => { vivo = false; };
  }, [token, hayPedidos, accion, consultar]);


  const activarAvisos = async () => {
    if (!token) return;
    const r = await suscribirChofer(token);
    setMsg(r === 'ok' ? 'Avisos activados en este celular.'
      : r === 'denegado' ? 'Bloqueaste las notificaciones. Actívalas en los ajustes del navegador.'
      : r === 'no-soportado' ? (esIOS() && !enModoApp() ? 'En iPhone: toca Compartir → «Agregar a inicio» y abre la app desde ahí.' : 'Este navegador no admite avisos.')
      : `No se pudieron activar los avisos (${motivoError() || 'error'}).`);
    consultar();
  };

  // Una lectura de GPS a pedido: sirve por 10 minutos para que los pedidos se ordenen por su distancia real.
  const actualizarUbicacion = async () => {
    try {
      const p = await ubicacionActual();
      ultimoEnvio.current = Date.now();
      ultimoPunto.current = { lat: p.lat, lng: p.lng };
      await accion('ubicacion', { lat: p.lat, lng: p.lng });
      setMsg('Ubicación actualizada. Los pedidos cercanos te llegan primero durante los próximos 10 minutos.');
      consultar();
    } catch (err) { setMsg(mensajeUbicacion(err as ErrorUbicacion)); }
  };

  const guardarParadero = async () => {
    try {
      const p = await ubicacionActual();
      await accion('base', { lat: p.lat, lng: p.lng });
      setMsg('Paradero guardado. Tus pedidos se ordenarán por la distancia a este punto.');
      consultar();
    } catch (err) { setMsg(mensajeUbicacion(err as ErrorUbicacion)); }
  };

  const aceptar = async (id: string) => {
    setOcupado(id);
    const r = await accion('aceptar', { pedido_id: id });
    setOcupado(null);
    if (!r.ok) {
      setMsg(r.motivo === 'tomado' ? 'Otro chofer ya tomó este viaje.' : r.motivo === 'cerrado' ? 'El pasajero ya canceló o se venció.' : r.motivo === 'ocupado' ? 'Termina tu viaje actual antes de aceptar otro.' : 'No se pudo aceptar. Intenta de nuevo.');
    } else setMsg('');
    consultar();
  };

  if (!listo) return null;
  if (!token || invalido) {
    return (
      <div className="min-h-screen bg-[#f7f9f8] flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <h1 className="text-xl font-extrabold mb-2">Necesitas tu enlace de chofer</h1>
          <p className="text-sm text-gray-600 font-medium">Tu enlace privado es tu llave: con él entras a tu app, sin usuario ni contraseña. BogaHub te lo envía por WhatsApp cuando te aprueban en el padrón. Ábrelo desde este celular y quedará guardado. Es personal: no lo compartas.</p>
          <p className="text-sm text-gray-600 font-medium mt-3">¿Todavía no estás en el padrón?</p>
          <Link href="/transporte/registro" className="inline-block mt-2 px-5 py-3 rounded-xl text-white font-bold" style={{ background: VERDE }}>Postularme como chofer</Link>
        </div>
      </div>
    );
  }
  if (!e) return <div className="min-h-screen bg-[#f7f9f8] flex items-center justify-center text-gray-500 font-semibold">Cargando…</div>;

  const tel = e.actual ? e.actual.tel.replace(/\D/g, '') : '';
  const pasos = [
    { ok: e.avisosActivados, texto: 'Avisos de pedidos activados' },
    { ok: e.tieneBase, texto: 'Paradero guardado' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-gray-900 pb-16">
      <header className="text-white" style={{ background: VERDE }}>
        <div className="max-w-xl mx-auto px-4 py-4">
          <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Taxi Seguro · App del chofer</p>
          <h1 className="text-xl font-extrabold">Hola, {e.chofer.nombre.split(' ')[0]}</h1>
          <p className="text-xs opacity-80 font-medium">{[e.chofer.tipo, e.chofer.placa].filter(Boolean).join(' · ')}</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4">
        {msg && <p className="text-sm font-bold rounded-xl px-3.5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200">{msg}</p>}

        {/* Recibir pedidos */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-extrabold">{e.pausado ? 'En pausa' : 'Recibiendo pedidos'}</p>
            <p className="text-xs text-gray-500 font-medium">{e.pausado ? 'No te llegarán pedidos hasta que lo actives.' : 'Te avisamos cuando alguien pida un taxi cerca.'}</p>
          </div>
          <button type="button" role="switch" aria-checked={!e.pausado} aria-label="Recibir pedidos"
            onClick={async () => { await accion('pausa', { pausado: !e.pausado }); consultar(); }}
            className="relative w-14 h-8 rounded-full transition-colors shrink-0" style={{ background: e.pausado ? '#d1d5db' : VERDE }}>
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${e.pausado ? 'left-1' : 'left-7'}`} />
          </button>
        </section>

        {/* Viaje en curso */}
        {e.actual && (
          <section className="bg-white rounded-2xl border-2 p-4 flex flex-col gap-3" style={{ borderColor: VERDE }}>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: VERDE }}>Tu viaje en curso</p>
            <div className="text-sm flex flex-col gap-1">
              <p className="text-lg font-extrabold">{e.actual.pasajero}</p>
              <p><b className="text-gray-500">Recoger en:</b> {e.actual.origen || 'ubicación en el mapa'}</p>
              <p><b className="text-gray-500">Destino:</b> {e.actual.destino}</p>
              {e.actual.oferta != null && <p><b className="text-gray-500">Ofrece:</b> <span className="font-extrabold" style={{ color: VERDE }}>S/ {e.actual.oferta}</span></p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:+${tel}`} className="py-3 rounded-xl bg-gray-100 text-center font-extrabold">📞 Llamar</a>
              <a href={`https://wa.me/${tel}?text=${encodeURIComponent(`Hola ${e.actual.pasajero.split(' ')[0]}, soy tu chofer de BogaHub Taxi Seguro. Voy en camino.`)}`}
                target="_blank" rel="noreferrer" className="py-3 rounded-xl text-white text-center font-extrabold" style={{ background: VERDE }}>💬 WhatsApp</a>
            </div>
            {e.actual.pin && <a href={e.actual.pin} target="_blank" rel="noreferrer" className="py-3 rounded-xl border border-gray-300 text-center font-bold">🧭 Cómo llegar (Google Maps)</a>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={async () => { await accion('completar', { pedido_id: e.actual!.id }); consultar(); }} className="py-3 rounded-xl text-white font-extrabold" style={{ background: VERDE }}>✓ Terminé el viaje</button>
              <button onClick={async () => { if (window.confirm('¿No puedes hacer este viaje? Se lo ofreceremos a otro chofer.')) { await accion('liberar', { pedido_id: e.actual!.id }); consultar(); } }}
                className="py-3 rounded-xl border border-red-200 text-red-600 font-bold">No puedo</button>
            </div>
          </section>
        )}

        {/* Pedidos disponibles */}
        {!e.actual && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Pedidos para ti {e.pedidos.length > 0 && `(${e.pedidos.length})`}</h2>
            {e.pedidos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-6 text-center text-sm text-gray-500 font-medium">
                {e.pausado ? 'Estás en pausa.' : 'Todavía no hay pedidos. Deja esta pantalla abierta o activa los avisos: cuando alguien pida un taxi cerca, te suena.'}
              </div>
            ) : e.pedidos.map((p) => (
              <div key={p.id} className={`bg-white rounded-2xl border-2 p-4 flex flex-col gap-2 ${resaltado === p.id ? 'ring-4 ring-green-200' : ''}`} style={{ borderColor: VERDE }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-extrabold">{p.pasajero}</p>
                  <span className="text-xs font-bold text-gray-400">hace {p.haceSeg < 60 ? `${p.haceSeg} s` : `${Math.round(p.haceSeg / 60)} min`}</span>
                </div>
                <p className="text-sm"><b className="text-gray-500">Desde:</b> {p.origen || 'ubicación en el mapa'} {p.distanciaKm != null && <span className="font-extrabold" style={{ color: VERDE }}>· {distTxt(p.distanciaKm)} de ti</span>}</p>
                <p className="text-sm"><b className="text-gray-500">Hasta:</b> {p.destino}</p>
                {p.oferta != null && <p className="text-sm"><b className="text-gray-500">Ofrece:</b> <span className="font-extrabold" style={{ color: VERDE }}>S/ {p.oferta}</span></p>}
                <button onClick={() => aceptar(p.id)} disabled={ocupado === p.id}
                  className="mt-1 py-3.5 rounded-xl text-white font-extrabold text-lg disabled:opacity-60" style={{ background: VERDE }}>
                  {ocupado === p.id ? 'Aceptando…' : 'Aceptar viaje'}
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Mi zona */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-2">
          <p className="font-extrabold">¿En qué zona estás ahora?</p>
          <p className="text-xs text-gray-500 font-medium">Te llegan primero los pedidos de esa zona (dura 3 horas).</p>
          <div className="flex flex-wrap gap-2">
            {ZONAS_TRANSPORTE.map((z) => (
              <button key={z.id} onClick={async () => { await accion('zona', { zona: e.zona === z.id ? '' : z.id }); consultar(); }}
                className={`px-3.5 py-2 rounded-full text-sm font-bold border ${e.zona === z.id ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300'}`}
                style={e.zona === z.id ? { background: VERDE } : undefined}>{z.nombre}</button>
            ))}
          </div>
        </section>

        {/* Zonas que cubro */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-2">
          <p className="font-extrabold">Zonas donde trabajas</p>
          <p className="text-xs text-gray-500 font-medium">Por defecto recibes pedidos de TODAS las zonas. Quita las que no quieras: solo te avisamos de las marcadas (o de pedidos muy cerca de ti). Puedes cambiarlo cuando quieras.</p>
          {(() => {
            const todas = ZONAS_TRANSPORTE.map((z) => z.id);
            // Lista vacía guardada = "todas". Aquí se muestran todas marcadas en ese caso.
            const activas = e.zonasCubre.length > 0 ? e.zonasCubre : todas;
            const guardar = async (nuevas: string[]) => {
              // Si quedan todas (o ninguna) se guarda "todas" (lista vacía): nunca te quedas sin recibir avisos por error.
              await accion('zonas', { zonas: nuevas.length === 0 || nuevas.length === todas.length ? [] : nuevas });
              consultar();
            };
            return (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => guardar([])}
                  className={`px-3.5 py-2 rounded-full text-sm font-bold border ${activas.length === todas.length ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300'}`}
                  style={activas.length === todas.length ? { background: VERDE } : undefined}>Todas las zonas</button>
                {ZONAS_TRANSPORTE.map((z) => {
                  const on = activas.includes(z.id);
                  return (
                    <button key={z.id} onClick={() => guardar(on ? activas.filter((x) => x !== z.id) : [...activas, z.id])}
                      className={`px-3.5 py-2 rounded-full text-sm font-bold border ${on ? 'border-transparent' : 'bg-white text-gray-500 border-gray-300'}`}
                      style={on ? { background: '#d3f1e4', color: VERDE, borderColor: VERDE } : undefined}>{on ? '✓ ' : ''}{z.nombre}</button>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Configuración */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-3">
          <p className="font-extrabold">Para que todo funcione</p>
          {pasos.map((p) => (
            <p key={p.texto} className={`text-sm font-bold ${p.ok ? '' : 'text-gray-500'}`} style={p.ok ? { color: VERDE } : undefined}>{p.ok ? '✓' : '○'} {p.texto}</p>
          ))}
          <div className="flex flex-col sm:flex-row gap-2">
            {!e.avisosActivados && <button onClick={activarAvisos} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: VERDE }}>🔔 Activar avisos</button>}
            <button onClick={actualizarUbicacion} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold">📡 Actualizar mi ubicación ahora</button>
            <button onClick={guardarParadero} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold">{e.tieneBase ? '📍 Actualizar mi paradero' : '📍 Estoy en mi paradero: guardar'}</button>
          </div>
          {esIOS() && !enModoApp() && (
            <p className="text-xs font-semibold text-amber-700">En iPhone, para recibir avisos: toca Compartir → «Agregar a inicio» y abre la app desde ese ícono.</p>
          )}
        </section>
      </div>
    </div>
  );
}
