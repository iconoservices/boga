'use client';

// App privada del chofer de Taxi Seguro. Se entra con su enlace secreto (…/transporte/chofer?t=<token>), sin
// contraseña. Aquí el chofer:
//   · activa los avisos (le llega una notificación cuando alguien pide un taxi cerca),
//   · dice dónde está (GPS mientras tiene la app abierta, "estoy en tal zona" o su paradero guardado),
//   · ve los pedidos que le avisaron y toca "Aceptar" (el primero que acepta se queda con el viaje),
//   · ve los datos del pasajero de su viaje y lo termina.
//
// Una web no puede seguir el GPS con la pantalla apagada: por eso el "Modo turno" mantiene la pantalla
// encendida y manda la ubicación cada minuto (o antes si se movió más de 200 m). Sin eso, se usa su zona o su paradero.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZONAS_TRANSPORTE } from '@/lib/zonasTransporte';
import { ubicacionActual, mensajeUbicacion, type ErrorUbicacion } from '@/lib/ubicacion';
import { distanciaKm } from '@/lib/ciudades';
import { suscribirChofer, esIOS, enModoApp, motivoError } from '@/lib/push';

const VERDE = '#00875A';
const CLAVE_TOKEN = 'boga_chofer_token';
const CLAVE_TURNO = 'boga_chofer_turno';

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
  const [turno, setTurno] = useState(false);
  const [ultimoGps, setUltimoGps] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);   // reloj del "enviada hace X s" (solo corre en modo turno)
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const cantidadAntes = useRef(0);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const idVigilancia = useRef<number | null>(null);
  const ultimoEnvio = useRef(0);
  const ultimoPunto = useRef<{ lat: number; lng: number } | null>(null);

  // El enlace trae el token; se recuerda para la próxima vez. Si abrió la app sin él, se usa el recordado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let t = params.get('t');
    try {
      if (t) localStorage.setItem(CLAVE_TOKEN, t);
      else t = localStorage.getItem(CLAVE_TOKEN);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTurno(localStorage.getItem(CLAVE_TURNO) === '1');
    } catch { /* sin almacenamiento */ }
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

  // ── Modo turno: pantalla encendida + ubicación cada minuto mientras la app esté abierta ──
  const pedirPantalla = useCallback(async () => {
    try { wakeLock.current = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* no soportado */ }
  }, []);

  useEffect(() => {
    if (!turno || !token) return;
    pedirPantalla();
    const alVolver = () => { if (document.visibilityState === 'visible') pedirPantalla(); };
    document.addEventListener('visibilitychange', alVolver);
    if (navigator.geolocation) {
      idVigilancia.current = navigator.geolocation.watchPosition(
        (p) => {
          // Se manda cada minuto; antes (a los 20 s) solo si se movió más de 200 m. Así gasta poca batería y pocos datos.
          const ahora = Date.now();
          const desde = ahora - ultimoEnvio.current;
          const movio = ultimoPunto.current ? distanciaKm(ultimoPunto.current.lat, ultimoPunto.current.lng, p.coords.latitude, p.coords.longitude) * 1000 : Infinity;
          if (desde < 20_000 || (desde < 60_000 && movio < 200)) return;
          ultimoEnvio.current = ahora;
          ultimoPunto.current = { lat: p.coords.latitude, lng: p.coords.longitude };
          setUltimoGps(ahora);
          void accion('ubicacion', { lat: p.coords.latitude, lng: p.coords.longitude });
        },
        () => setMsg('No se pudo leer tu ubicación. Revisa el permiso del navegador.'),
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
      );
    }
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      if (idVigilancia.current != null) navigator.geolocation.clearWatch(idVigilancia.current);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [turno, token, accion, pedirPantalla]);

  useEffect(() => {
    if (!turno) return;
    const r = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(r);
  }, [turno]);

  // Al abrir con pedidos esperando (por ejemplo desde la notificación), se toma la ubicación UNA vez, en ese
  // momento, para mostrarle la distancia exacta a cada pedido sin que tenga el modo turno prendido.
  const ubicacionDenegada = useRef(false);
  const hayPedidos = !!e && e.pedidos.length > 0;
  useEffect(() => {
    if (!token || !hayPedidos || turno || ubicacionDenegada.current) return;
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
  }, [token, hayPedidos, turno, accion, consultar]);

  const alternarTurno = () => {
    const nuevo = !turno;
    setTurno(nuevo);
    try { localStorage.setItem(CLAVE_TURNO, nuevo ? '1' : '0'); } catch { /* sin almacenamiento */ }
    setMsg(nuevo ? 'Modo turno activado: mantén la app abierta para recibir pedidos cerca de ti.' : 'Modo turno desactivado.');
  };

  const activarAvisos = async () => {
    if (!token) return;
    const r = await suscribirChofer(token);
    setMsg(r === 'ok' ? 'Avisos activados en este celular.'
      : r === 'denegado' ? 'Bloqueaste las notificaciones. Actívalas en los ajustes del navegador.'
      : r === 'no-soportado' ? (esIOS() && !enModoApp() ? 'En iPhone: toca Compartir → «Agregar a inicio» y abre la app desde ahí.' : 'Este navegador no admite avisos.')
      : `No se pudieron activar los avisos (${motivoError() || 'error'}).`);
    consultar();
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
          <p className="text-sm text-gray-600 font-medium">Pídele a BogaHub que te envíe tu enlace privado por WhatsApp y ábrelo desde este celular. Es personal: no lo compartas.</p>
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
            {e.actual.pin && <a href={e.actual.pin} target="_blank" rel="noreferrer" className="py-3 rounded-xl border border-gray-300 text-center font-bold">📍 Abrir ubicación en Google Maps</a>}
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

        {/* Modo turno */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold">Modo turno</p>
              <p className="text-xs text-gray-500 font-medium">Mantiene la pantalla encendida y comparte tu ubicación (cada minuto, o antes si te mueves) para que te lleguen los pedidos MÁS CERCANOS. Solo funciona con la app abierta.</p>
            </div>
            <button type="button" role="switch" aria-checked={turno} aria-label="Modo turno" onClick={alternarTurno}
              className="relative w-14 h-8 rounded-full transition-colors shrink-0" style={{ background: turno ? VERDE : '#d1d5db' }}>
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${turno ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {turno && (
            <p className="text-xs font-bold" style={{ color: VERDE }}>
              {ultimoGps ? `📡 Ubicación enviada hace ${Math.max(1, Math.round((Math.max(ahora, ultimoGps) - ultimoGps) / 1000))} s` : e.gpsReciente ? '📡 Ubicación reciente' : '📡 Buscando tu ubicación…'}
            </p>
          )}
        </section>

        {/* Mi zona */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-2">
          <p className="font-extrabold">¿En qué zona estás ahora?</p>
          <p className="text-xs text-gray-500 font-medium">Sirve si no usas el modo turno: te llegan primero los pedidos de esa zona (dura 3 horas).</p>
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
