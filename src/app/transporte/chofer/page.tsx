'use client';

// App privada del chofer de Taxi Seguro. Se entra con su enlace secreto (…/transporte/chofer?t=<token>), sin
// contraseña. Aquí el chofer:
//   · activa los avisos (le llega una notificación cuando alguien pide un taxi cerca),
//   · dice dónde está (GPS mientras tiene la app abierta, "estoy en tal zona" o su paradero guardado),
//   · ve los pedidos que le avisaron y toca "Aceptar" (el primero que acepta se queda con el viaje),
//   · ve los datos del pasajero de su viaje y lo termina.
//
// Para los taxis no hay seguimiento continuo de GPS (una web no puede hacerlo con la pantalla apagada y gastaría
// mucha batería). La cercanía sale de: su ubicación tomada UNA vez al abrir un pedido, la zona que marca
// ("estoy en…") y su paradero guardado.
//
// La misma app sirve para el DELIVERY: si una tienda le asignó pedidos (los repartidores propios de una tienda solo
// ven esto), aparece la sección «Entregas» con los pasos Salir → Ya llegué → Entregado. SOLO mientras un pedido va
// «Enviado» se comparte el GPS (cada 12 s, con la pantalla prendida) para que el cliente vea la moto en su mapa.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ZONAS_TRANSPORTE } from '@/lib/zonasTransporte';
import { ubicacionActual, mensajeUbicacion, type ErrorUbicacion } from '@/lib/ubicacion';
import { suscribirChofer, esIOS, enModoApp, motivoError } from '@/lib/push';

const VERDE = '#00875A';
const CLAVE_TOKEN = 'boga_chofer_token';

interface PedidoAbierto { id: string; pasajero: string; origen: string | null; destino: string | null; oferta: number | null; tipo: string | null; distanciaKm: number | null; haceSeg: number }
interface Actual { id: string; pasajero: string; tel: string; origen: string | null; destino: string | null; oferta: number | null; pin: string | null }
interface Entrega { codigo: string; tienda: string; cliente: string; tel: string; direccion: string; items: string[]; total: number; estado: string; llego: boolean }
interface Estado {
  soloLectura?: boolean;
  soloEntregas?: boolean; entregas: Entrega[];
  repartidorDe?: { tipo: 'tienda' | 'boga'; tienda?: string } | null;
  chofer: { nombre: string; tipo: string; placa: string | null };
  pausado: boolean; tieneBase: boolean; zona: string | null; zonasCubre: string[]; gpsReciente: boolean; avisosActivados: boolean;
  pedidos: PedidoAbierto[]; actual: Actual | null;
}

const waDe = (tel: string) => { const d = tel.replace(/\D/g, ''); return d.length === 9 ? '51' + d : d; };

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
  const entregasAntes = useRef(0);
  const [gps, setGps] = useState<'esperando' | 'ok' | 'denegado'>('esperando');
  const ultimoEnvio = useRef(0);
  const ultimoPunto = useRef<{ lat: number; lng: number } | null>(null);

  // El enlace trae el token; se recuerda para la próxima vez. Si abrió la app sin él, se usa el recordado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // ?ver=<id del chofer>: vista de solo lectura del superadmin (no guarda ni usa ningún enlace de chofer).
    const ver = params.get('ver');
    let t = ver ? `ver:${ver}` : params.get('t');
    if (!ver) {
      try {
        if (t) localStorage.setItem(CLAVE_TOKEN, t);
        else t = localStorage.getItem(CLAVE_TOKEN);
      } catch { /* sin almacenamiento */ }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResaltado(params.get('pedido'));
    setToken(t);
    setListo(true);
  }, []);

  const consultar = useCallback(async () => {
    if (!token) return;
    try {
      const esVer = token.startsWith('ver:');
      const headers: Record<string, string> = {};
      if (esVer) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) { setInvalido(true); return; }
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const url = esVer ? `/api/transporte/chofer?ver=${encodeURIComponent(token.slice(4))}` : `/api/transporte/chofer?t=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: 'no-store', headers });
      if (res.status === 401) { setInvalido(true); return; }
      if (!res.ok) return;
      const nuevo = (await res.json()) as Estado;
      // Llegó un pedido nuevo con la app abierta: pitido y vibración.
      nuevo.entregas = nuevo.entregas ?? [];
      if (nuevo.pedidos.length > cantidadAntes.current || nuevo.entregas.length > entregasAntes.current) {
        try {
          navigator.vibrate?.([250, 120, 250]);
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination); osc.frequency.value = 880; g.gain.value = 0.15;
          osc.start(); osc.stop(ctx.currentTime + 0.4);
        } catch { /* el navegador puede bloquear el sonido */ }
      }
      cantidadAntes.current = nuevo.pedidos.length;
      entregasAntes.current = nuevo.entregas.length;
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
      document.title = nuevo.soloEntregas
        ? (nuevo.entregas.length > 0 ? `(${nuevo.entregas.length}) Repartidor · Entregas` : 'Repartidor · Mis entregas')
        : nuevo.pedidos.length > 0 ? `(${nuevo.pedidos.length}) Taxi · Pedido nuevo` : 'Taxi · App del chofer';
      setE(nuevo);
    } catch { /* sin red: se reintenta */ }
  }, [token]);

  // Cada consulta cuesta una ida a la base: cada 5 s solo si hay pedidos o un viaje en curso; si no, cada 20 s
  // (los pedidos nuevos le llegan igual como notificación).
  const hayMovimiento = !!e && (e.pedidos.length > 0 || !!e.actual || e.entregas.length > 0);
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
    if (token?.startsWith('ver:')) { setMsg('Vista del superadmin: es solo lectura, aquí no se puede hacer nada.'); return {} as Record<string, unknown>; }
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
    if (!token || token.startsWith('ver:') || !hayPedidos || ubicacionDenegada.current) return;
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


  // Mientras una entrega va «Enviado»: la pantalla no se apaga (wake lock) y cada 12 s se manda el GPS, para que el
  // cliente vea la moto en su pedido. Al entregar (o si no hay entregas en camino) todo esto se apaga solo.
  const enCamino = !!e && !e.soloLectura && e.entregas.some((x) => x.estado === 'Enviado');
  useEffect(() => {
    if (!token || token.startsWith('ver:') || !enCamino) return;
    type Lock = { release: () => Promise<void> };
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }).wakeLock;
    let lock: Lock | null = null;
    const pedirLock = () => { wl?.request('screen').then((l) => { lock = l; }).catch(() => {}); };
    pedirLock();
    const alVolver = () => { if (document.visibilityState === 'visible') pedirLock(); };
    document.addEventListener('visibilitychange', alVolver);

    let punto: { lat: number; lng: number } | null = null;
    let ultimo = 0;
    const enviar = () => {
      if (!punto) return;
      ultimo = Date.now();
      accion('ubicacion', punto).catch(() => {});
    };
    const idWatch = navigator.geolocation?.watchPosition(
      (p) => { punto = { lat: p.coords.latitude, lng: p.coords.longitude }; setGps('ok'); if (Date.now() - ultimo > 12_000) enviar(); },
      (err) => { if (err.code === 1) setGps('denegado'); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    );
    // Aunque la moto esté parada (el navegador no avisa si no se mueve), se reenvía el último punto para que no caduque.
    const idTimer = setInterval(() => { if (Date.now() - ultimo > 12_000) enviar(); }, 6000);
    return () => {
      if (idWatch != null) navigator.geolocation.clearWatch(idWatch);
      clearInterval(idTimer);
      document.removeEventListener('visibilitychange', alVolver);
      lock?.release().catch(() => {});
    };
  }, [token, enCamino, accion]);

  const pasoEntrega = async (codigo: string, paso: 'salir' | 'llegue' | 'entregado') => {
    setOcupado(codigo);
    const r = await accion('entrega', { codigo, paso });
    setOcupado(null);
    setMsg(r.ok ? '' : r.motivo === 'cerrado' ? 'Ese pedido ya está cerrado (entregado o cancelado).' : r.motivo === 'no_salio' ? 'Primero toca «Salir a entregar».' : 'No se pudo actualizar. Intenta de nuevo.');
    consultar();
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
    ...(e.soloEntregas ? [] : [{ ok: e.tieneBase, texto: 'Paradero guardado' }]),
  ];

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-gray-900 pb-16">
      {e.soloLectura && (
        <div className="bg-blue-600 text-white text-sm font-bold px-4 py-2.5 text-center">
          👁 Vista del superadmin, solo lectura: así ve la app {e.chofer.nombre.split(' ')[0]}. No se puede aceptar ni cambiar nada.
        </div>
      )}
      <header className="text-white" style={{ background: VERDE }}>
        <div className="max-w-xl mx-auto px-4 py-4">
          <p className="text-xs font-bold opacity-80 uppercase tracking-wider">{e.soloEntregas ? 'BogaHub · App del repartidor' : 'Taxi Seguro · App del chofer'}</p>
          <h1 className="text-xl font-extrabold">Hola, {e.chofer.nombre.split(' ')[0]}</h1>
          <p className="text-xs opacity-80 font-medium">{[e.soloEntregas ? 'Repartidor' : e.chofer.tipo, e.chofer.placa].filter(Boolean).join(' · ')}</p>
          {e.repartidorDe && (
            <span className="inline-block mt-2 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white/20 border border-white/40">
              {e.repartidorDe.tipo === 'boga' ? '🛡 Repartidor BogaHub' : `🏪 Repartidor de ${e.repartidorDe.tienda}`}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-4">
        {msg && <p className="text-sm font-bold rounded-xl px-3.5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200">{msg}</p>}

        {/* Entregas de la carta (delivery): las que una tienda le asignó */}
        {(e.entregas.length > 0 || e.soloEntregas) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500">Entregas {e.entregas.length > 0 && `(${e.entregas.length})`}</h2>
            {e.entregas.length === 0 && (
              <div className="bg-white rounded-2xl border border-black/5 p-6 text-center text-sm text-gray-500 font-medium">
                Todavía no tienes pedidos para entregar. Cuando tu tienda te asigne uno, te suena y aparece aquí. Activa los avisos más abajo.
              </div>
            )}
            {enCamino && (
              <p className={`text-xs font-bold rounded-xl px-3.5 py-2.5 border ${gps === 'denegado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 border-green-200'}`} style={gps === 'denegado' ? undefined : { color: VERDE }}>
                {gps === 'denegado' ? '⚠ No diste permiso de ubicación: tu cliente no puede ver la moto. Actívalo en los ajustes del navegador.'
                  : gps === 'ok' ? '📡 Tu cliente está viendo tu moto en el mapa. Deja esta pantalla prendida hasta entregar.'
                  : '📡 Buscando tu ubicación… Acepta el permiso de ubicación.'}
              </p>
            )}
            {e.entregas.map((x) => {
              const enRuta = x.estado === 'Enviado';
              return (
                <div key={x.codigo} className="bg-white rounded-2xl border-2 p-4 flex flex-col gap-2.5" style={{ borderColor: enRuta ? VERDE : '#e5e7eb' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: VERDE }}>{x.tienda}</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{enRuta ? (x.llego ? 'Llegaste' : 'En camino') : x.estado === 'Preparando' ? 'Preparando' : 'Por salir'}</span>
                  </div>
                  <p className="text-lg font-extrabold leading-tight">{x.cliente}</p>
                  <p className="text-sm"><b className="text-gray-500">Entregar en:</b> {x.direccion}</p>
                  <p className="text-sm text-gray-600">{x.items.join(' · ')}</p>
                  <p className="text-sm"><b className="text-gray-500">Total del pedido:</b> <span className="font-extrabold">S/ {x.total.toFixed(2)}</span></p>
                  <div className="grid grid-cols-3 gap-2">
                    {x.tel ? <a href={`tel:+${waDe(x.tel)}`} className="py-2.5 rounded-xl bg-gray-100 text-center text-sm font-extrabold">📞 Llamar</a> : <span />}
                    {x.tel ? <a href={`https://wa.me/${waDe(x.tel)}?text=${encodeURIComponent(`Hola ${x.cliente.split(' ')[0]}, soy el repartidor de ${x.tienda}. ${enRuta ? 'Ya voy en camino con tu pedido.' : 'Estoy por salir con tu pedido.'}`)}`}
                      target="_blank" rel="noreferrer" className="py-2.5 rounded-xl text-white text-center text-sm font-extrabold" style={{ background: VERDE }}>💬 WhatsApp</a> : <span />}
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${x.direccion}, Pucallpa`)}`} target="_blank" rel="noreferrer"
                      className="py-2.5 rounded-xl border border-gray-300 text-center text-sm font-bold">🧭 Ruta</a>
                  </div>
                  {!enRuta && (
                    <button onClick={() => pasoEntrega(x.codigo, 'salir')} disabled={ocupado === x.codigo}
                      className="py-3.5 rounded-xl text-white font-extrabold text-lg disabled:opacity-60" style={{ background: VERDE }}>
                      {ocupado === x.codigo ? 'Un momento…' : '🛵 Salir a entregar'}
                    </button>
                  )}
                  {enRuta && !x.llego && (
                    <button onClick={() => pasoEntrega(x.codigo, 'llegue')} disabled={ocupado === x.codigo}
                      className="py-3.5 rounded-xl text-white font-extrabold text-lg disabled:opacity-60" style={{ background: VERDE }}>
                      {ocupado === x.codigo ? 'Un momento…' : '📍 Ya llegué'}
                    </button>
                  )}
                  {enRuta && (
                    <button onClick={() => pasoEntrega(x.codigo, 'entregado')} disabled={ocupado === x.codigo}
                      className={`rounded-xl font-extrabold disabled:opacity-60 ${x.llego ? 'text-white text-lg py-3.5' : 'border border-gray-300 py-3'}`} style={x.llego ? { background: VERDE } : undefined}>
                      ✓ Entregado
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Recibir pedidos */}
        {!e.soloEntregas && <section className="bg-white rounded-2xl border border-black/5 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-extrabold">{e.pausado ? 'En pausa' : 'Recibiendo pedidos'}</p>
            <p className="text-xs text-gray-500 font-medium">{e.pausado ? 'No te llegarán pedidos hasta que lo actives.' : 'Te avisamos cuando alguien pida un taxi cerca.'}</p>
          </div>
          <button type="button" role="switch" aria-checked={!e.pausado} aria-label="Recibir pedidos"
            onClick={async () => { await accion('pausa', { pausado: !e.pausado }); consultar(); }}
            className="relative w-14 h-8 rounded-full transition-colors shrink-0" style={{ background: e.pausado ? '#d1d5db' : VERDE }}>
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${e.pausado ? 'left-1' : 'left-7'}`} />
          </button>
        </section>}

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
        {!e.actual && !e.soloEntregas && (
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
        {!e.soloEntregas && <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-2">
          <p className="font-extrabold">¿En qué zona estás ahora?</p>
          <p className="text-xs text-gray-500 font-medium">Te llegan primero los pedidos de esa zona (dura 3 horas).</p>
          <div className="flex flex-wrap gap-2">
            {ZONAS_TRANSPORTE.map((z) => (
              <button key={z.id} onClick={async () => { await accion('zona', { zona: e.zona === z.id ? '' : z.id }); consultar(); }}
                className={`px-3.5 py-2 rounded-full text-sm font-bold border ${e.zona === z.id ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300'}`}
                style={e.zona === z.id ? { background: VERDE } : undefined}>{z.nombre}</button>
            ))}
          </div>
        </section>}

        {/* Zonas que cubro */}
        {!e.soloEntregas && <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-2">
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
        </section>}

        {/* Configuración */}
        <section className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col gap-3">
          <p className="font-extrabold">Para que todo funcione</p>
          {pasos.map((p) => (
            <p key={p.texto} className={`text-sm font-bold ${p.ok ? '' : 'text-gray-500'}`} style={p.ok ? { color: VERDE } : undefined}>{p.ok ? '✓' : '○'} {p.texto}</p>
          ))}
          <div className="flex flex-col sm:flex-row gap-2">
            {!e.avisosActivados && <button onClick={activarAvisos} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: VERDE }}>🔔 Activar avisos</button>}
            {!e.soloEntregas && <button onClick={actualizarUbicacion} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold">📡 Actualizar mi ubicación ahora</button>}
            {!e.soloEntregas && <button onClick={guardarParadero} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold">{e.tieneBase ? '📍 Actualizar mi paradero' : '📍 Estoy en mi paradero: guardar'}</button>}
          </div>
          {esIOS() && !enModoApp() && (
            <p className="text-xs font-semibold text-amber-700">En iPhone, para recibir avisos: toca Compartir → «Agregar a inicio» y abre la app desde ese ícono.</p>
          )}
        </section>
      </div>
    </div>
  );
}
