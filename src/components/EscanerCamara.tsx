'use client';

// Lector de códigos de barras / QR con la cámara, en una ventana a pantalla completa.
// Se usa en la caja (POS) para cobrar escaneando y en el formulario de producto para registrar su código.
// Motor: BarcodeDetector nativo (Chrome/Android, rápido) y, si el navegador no lo tiene, html5-qrcode.
// `continuo`: sigue abierto después de cada lectura (caja); si no, se cierra al primer código (formulario).

import { useEffect, useRef, useState } from 'react';

export type ResultadoEscaneo = { ok: boolean; mensaje: string } | void;

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];
const ESPERA_MISMO_CODIGO_MS = 1800;

function pitido(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1040 : 220;
    gain.gain.value = 0.08;
    osc.start(); osc.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
  } catch { /* sin sonido */ }
}

export default function EscanerCamara({
  titulo = 'Escanear código',
  ayuda = 'Apunta la cámara al código de barras del producto',
  continuo = true,
  onCodigo,
  onCerrar,
}: {
  titulo?: string;
  ayuda?: string;
  continuo?: boolean;
  onCodigo: (codigo: string) => ResultadoEscaneo | Promise<ResultadoEscaneo>;
  onCerrar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const html5Ref = useRef<{ stop: () => Promise<void> } | null>(null);
  const ultimo = useRef<{ codigo: string; t: number }>({ codigo: '', t: 0 });
  const ocupado = useRef(false);
  const onCodigoRef = useRef(onCodigo);
  onCodigoRef.current = onCodigo;
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  const [error, setError] = useState('');
  const [aviso, setAviso] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [manual, setManual] = useState('');
  const [linterna, setLinterna] = useState<'no' | 'apagada' | 'prendida'>('no');
  const [zoomMax, setZoomMax] = useState(0);   // 0 = esta cámara no tiene zoom
  const [zoom, setZoom] = useState(1);

  // La pista de video de la cámara, venga del lector nativo o del alternativo (que pone su propio <video>).
  const pistaVideo = (): MediaStreamTrack | undefined => {
    const flujo = streamRef.current ?? (document.querySelector('#escaner-camara-video video') as HTMLVideoElement | null)?.srcObject as MediaStream | null;
    return flujo?.getVideoTracks()[0];
  };
  const detectarZoom = () => {
    const caps = (pistaVideo()?.getCapabilities?.() ?? undefined) as { zoom?: { max: number } } | undefined;
    if (caps?.zoom) setZoomMax(caps.zoom.max);
  };
  const aplicarZoom = async (v: number) => {
    const track = pistaVideo();
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: Math.min(v, zoomMax) } as MediaTrackConstraintSet] });
      setZoom(v);
    } catch { /* sin zoom */ }
  };

  const procesar = async (crudo: string) => {
    const codigo = crudo.trim();
    if (!codigo || ocupado.current) return;
    const ahora = Date.now();
    if (codigo === ultimo.current.codigo && ahora - ultimo.current.t < ESPERA_MISMO_CODIGO_MS) return;
    ultimo.current = { codigo, t: ahora };
    ocupado.current = true;
    try {
      const r = await onCodigoRef.current(codigo);
      const res = r ?? { ok: true, mensaje: codigo };
      pitido(res.ok);
      setAviso(res);
      if (!continuo && res.ok) onCerrarRef.current();
    } finally {
      ocupado.current = false;
    }
  };
  const procesarRef = useRef(procesar);
  procesarRef.current = procesar;

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no deja usar la cámara. Abre el panel desde Chrome o Safari con https.');
        return;
      }
      type Detector = new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
      // 1) Lector nativo del navegador (Chrome/Edge: el más rápido). 2) Si no hay (iPhone, Firefox), el mismo lector
      //    en WebAssembly (paquete barcode-detector). 3) Si eso tampoco carga, html5-qrcode más abajo.
      const nativo = (window as unknown as { BarcodeDetector?: Detector }).BarcodeDetector;
      let BD = nativo;
      if (!BD) {
        try { BD = (await import('barcode-detector/ponyfill')).BarcodeDetector as unknown as Detector; } catch (e) { console.warn('No cargó el lector WebAssembly:', e); }
      }
      const esNativo = !!nativo;
      try {
        if (BD) {
          const detector = new BD({ formats: FORMATOS });
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
          if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          const caps = (stream.getVideoTracks()[0] as MediaStreamTrack & { getCapabilities?: () => Record<string, unknown> }).getCapabilities?.();
          if (caps && 'torch' in caps) setLinterna('apagada');
          if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
          detectarZoom();
          let ultimaLectura = 0;
          const ciclo = async () => {
            if (cancelado) return;
            const v = videoRef.current;
            // El lector WebAssembly pesa más: se lee ~8 veces por segundo en vez de en cada cuadro.
            const toca = esNativo || performance.now() - ultimaLectura > 120;
            if (v && v.readyState >= 2 && !ocupado.current && toca) {
              ultimaLectura = performance.now();
              try {
                const codigos = await detector.detect(v);
                if (codigos[0]?.rawValue) procesarRef.current(codigos[0].rawValue);
              } catch { /* cuadro sin código */ }
            }
            rafRef.current = requestAnimationFrame(ciclo);
          };
          rafRef.current = requestAnimationFrame(ciclo);
          return;
        }
      } catch (e) {
        const nombre = (e as DOMException)?.name;
        if (nombre === 'NotAllowedError') { setError('Bloqueaste la cámara. Permítela en los ajustes del sitio y vuelve a abrir el lector.'); return; }
        if (nombre === 'NotFoundError') { setError('No se encontró ninguna cámara en este dispositivo.'); return; }
        console.warn('BarcodeDetector falló, se usa el lector alternativo:', e);
      }
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelado) return;
        const scanner = new Html5Qrcode('escaner-camara-video');
        html5Ref.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 280, height: 160 } },
          (texto: string) => { procesarRef.current(texto); },
          () => {},
        );
        detectarZoom();
      } catch (e) {
        const nombre = (e as DOMException)?.name;
        setError(nombre === 'NotAllowedError'
          ? 'Bloqueaste la cámara. Permítela en los ajustes del sitio y vuelve a abrir el lector.'
          : 'Revisa que ninguna otra app esté usando la cámara y que abriste el panel con https.');
      }
    })();
    return () => {
      cancelado = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      html5Ref.current?.stop().catch(() => {});
    };
  }, []);

  // El aviso ("✓ Gaseosa añadida") se apaga solo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2200);
    return () => clearTimeout(t);
  }, [aviso]);

  const alternarLinterna = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const prender = linterna !== 'prendida';
      await track.applyConstraints({ advanced: [{ torch: prender } as MediaTrackConstraintSet] });
      setLinterna(prender ? 'prendida' : 'apagada');
    } catch { /* sin linterna */ }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black text-white flex flex-col h-[100dvh]" role="dialog" aria-label={titulo}>
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <h2 className="font-extrabold text-base">{titulo}</h2>
        <div className="flex items-center gap-2">
          {linterna !== 'no' && (
            <button type="button" onClick={alternarLinterna} className={`w-10 h-10 rounded-full flex items-center justify-center ${linterna === 'prendida' ? 'bg-amber-400 text-black' : 'bg-white/15'}`} title="Linterna">
              <span className="material-symbols-outlined text-[22px]">{linterna === 'prendida' ? 'flashlight_on' : 'flashlight_off'}</span>
            </button>
          )}
          <button type="button" onClick={onCerrar} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center" title="Cerrar">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div id="escaner-camara-video" className="w-full" />
        {!error && (
          <div className="relative w-[78%] max-w-sm aspect-[7/4] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none">
            <span className="absolute left-3 right-3 top-1/2 h-0.5 bg-red-500/80" />
          </div>
        )}
        {error && (
          <div className="relative w-full max-w-xs mx-auto px-6 flex flex-col items-center text-center gap-3">
            <span className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[34px] text-amber-300">no_photography</span>
            </span>
            <p className="text-base font-bold text-white">No se pudo abrir la cámara</p>
            <p className="text-sm text-white/70 leading-snug">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-1 h-10 px-5 rounded-full bg-white/15 text-sm font-bold">Reintentar</button>
            <p className="text-xs text-white/50">O escribe el código abajo.</p>
          </div>
        )}
        {aviso && (
          <div className={`absolute left-4 right-4 top-4 rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${aviso.ok ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}>
            <span className="material-symbols-outlined align-middle text-[20px] mr-1">{aviso.ok ? 'check_circle' : 'error'}</span>
            {aviso.mensaje}
          </div>
        )}
      </div>

      {zoomMax > 1 && (
        <div className="flex justify-center gap-2 py-2 bg-black/90">
          {[1, 1.5, 2].filter((v) => v <= zoomMax).map((v) => (
            <button key={v} type="button" onClick={() => aplicarZoom(v)} className={`w-11 h-11 rounded-full text-xs font-extrabold ${Math.abs(zoom - v) < 0.1 ? 'bg-white text-black' : 'bg-white/15 text-white'}`}>{v}x</button>
          ))}
        </div>
      )}

      <form
        className="px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-black/90 flex flex-col gap-2"
        onSubmit={(e) => { e.preventDefault(); const c = manual; setManual(''); procesar(c); }}
      >
        <p className="text-xs text-white/60 text-center">{ayuda}</p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="o escribe el código"
            className="flex-1 h-11 rounded-lg bg-white/10 border border-white/20 px-3 text-sm font-semibold placeholder:text-white/40 focus:outline-none focus:border-white"
          />
          <button type="submit" className="h-11 px-4 rounded-lg bg-white text-black text-sm font-extrabold">Agregar</button>
        </div>
        {continuo && <button type="button" onClick={onCerrar} className="h-11 rounded-lg bg-[#25D366] text-white font-extrabold text-sm">Listo, ver carrito</button>}
      </form>
    </div>
  );
}
