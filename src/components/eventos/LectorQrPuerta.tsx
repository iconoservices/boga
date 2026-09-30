'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

type ResultadoValidacion = {
  ok: boolean;
  resultado: 'valido' | 'ya_usado' | 'no_encontrado' | 'error';
  nombre?: string;
  telefono?: string;
  evento?: string;
  usado_at?: string;
  promotor?: string;
  mensaje?: string;
};

// Generador de sonidos nativos con Web Audio API (sin dependencias ni retrasos)
function reproducirSonido(tipo: 'exito' | 'error') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (tipo === 'exito') {
      // Beep cristalino ascendente (880Hz -> 1174Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Zumbido grave de alerta (doble tono 220Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Si el navegador bloqueó audio antes del primer toque, continúa silenciosamente
  }
}

export default function LectorQrPuerta({
  onValidado,
  pinStaff,
}: {
  onValidado?: (r: ResultadoValidacion) => void;
  pinStaff?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5ScannerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const procesandoRef = useRef(false);

  const [modoLector, setModoLector] = useState<'nativo' | 'fallback' | 'iniciando'>('iniciando');
  const [torchActivo, setTorchActivo] = useState(false);
  const [soportaTorch, setSoportaTorch] = useState(false);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);

  // Contadores de la sesión
  const [contadorValidos, setContadorValidos] = useState(0);
  const [contadorRechazados, setContadorRechazados] = useState(0);

  const [ultimoResultado, setUltimoResultado] = useState<ResultadoValidacion | null>(null);
  const [validandoHttp, setValidandoHttp] = useState(false);

  // Procesar token leído
  const procesarToken = useCallback(
    async (token: string) => {
      if (procesandoRef.current || !token.trim()) return;
      procesandoRef.current = true;
      setValidandoHttp(true);

      try {
        const res = await fetch('/api/eventos/validar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim(), pin: pinStaff }),
        });
        const data: ResultadoValidacion = await res.json();

        if (data.ok && data.resultado === 'valido') {
          if (sonidoHabilitado) reproducirSonido('exito');
          setContadorValidos((prev) => prev + 1);
        } else {
          if (sonidoHabilitado) reproducirSonido('error');
          setContadorRechazados((prev) => prev + 1);
        }

        setUltimoResultado(data);
        if (onValidado) onValidado(data);
      } catch (err: any) {
        if (sonidoHabilitado) reproducirSonido('error');
        setContadorRechazados((prev) => prev + 1);
        setUltimoResultado({
          ok: false,
          resultado: 'error',
          mensaje: 'Error de conexión con el servidor',
        });
      } finally {
        setValidandoHttp(false);
        // Pausa de 2.2 segundos para mostrar el resultado y no re-escanear el mismo frame
        setTimeout(() => {
          procesandoRef.current = false;
        }, 2200);
      }
    },
    [pinStaff, onValidado, sonidoHabilitado]
  );

  // Iniciar la cámara y motor de escaneo
  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      // 1. Probar BarcodeDetector nativo (Ultra veloz 0.05s)
      const tieneBarcodeDetector =
        typeof window !== 'undefined' && 'BarcodeDetector' in window;

      if (tieneBarcodeDetector) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'],
          });

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          if (cancelado) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          // Verificar si tiene linterna / torch
          const track = stream.getVideoTracks()[0];
          const capabilities = (track as any)?.getCapabilities?.();
          if (capabilities && 'torch' in capabilities) {
            setSoportaTorch(true);
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          setModoLector('nativo');

          // Bucle de detección nativa
          const loopDeteccion = async () => {
            if (cancelado) return;
            if (
              videoRef.current &&
              videoRef.current.readyState >= 2 &&
              !procesandoRef.current
            ) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const valor = barcodes[0].rawValue;
                  if (valor) {
                    procesarToken(valor);
                  }
                }
              } catch {
                // error silencioso de frame
              }
            }
            animFrameRef.current = requestAnimationFrame(loopDeteccion);
          };

          animFrameRef.current = requestAnimationFrame(loopDeteccion);
          return;
        } catch (e) {
          console.warn('Fallo al iniciar BarcodeDetector nativo, usando fallback:', e);
        }
      }

      // 2. Fallback a Html5Qrcode si el navegador no soporta BarcodeDetector nativo
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelado) return;

        setModoLector('fallback');
        const scanner = new Html5Qrcode('qr-video-container');
        html5ScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            procesarToken(decodedText);
          },
          () => {} // error frame a frame se ignora
        );
      } catch (err) {
        console.error('No se pudo inicializar la cámara:', err);
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (html5ScannerRef.current) {
        html5ScannerRef.current.stop().catch(() => {});
      }
    };
  }, [procesarToken]);

  // Alternar linterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nuevoEstado = !torchActivo;
      await (track as any).applyConstraints({
        advanced: [{ torch: nuevoEstado }],
      });
      setTorchActivo(nuevoEstado);
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[480px] mx-auto text-white">
      {/* Barra superior de métricas y herramientas del portero */}
      <div className="bg-[#121316] border border-white/10 rounded-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">
              {contadorValidos} <span className="text-white/50 font-normal">validados</span>
            </span>
          </div>
          {contadorRechazados > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-400">
                {contadorRechazados} <span className="text-white/50 font-normal">rechazados</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botón Linterna */}
          {soportaTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition-colors ${
                torchActivo
                  ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/30'
                  : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
              }`}
              title="Linterna / Flash"
            >
              <span className="material-symbols-outlined text-[18px]">
                {torchActivo ? 'flashlight_on' : 'flashlight_off'}
              </span>
            </button>
          )}

          {/* Botón Sonido */}
          <button
            type="button"
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            className={`p-2 rounded-xl border transition-colors ${
              sonidoHabilitado
                ? 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}
            title="Activar o silenciar beep"
          >
            <span className="material-symbols-outlined text-[18px]">
              {sonidoHabilitado ? 'volume_up' : 'volume_off'}
            </span>
          </button>
        </div>
      </div>

      {/* Visor de la cámara */}
      <div className="relative aspect-square sm:aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-white/15 shadow-2xl flex items-center justify-center">
        {modoLector === 'nativo' ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div id="qr-video-container" className="w-full h-full" />
        )}

        {/* Marco y guía visual de escaneo */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
          <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl">
            {/* Esquinas resaltadas */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

            {/* Línea láser de escaneo animada */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Indicador de tecnología */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold text-white/70 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[13px] text-emerald-400">speed</span>
          {modoLector === 'nativo' ? 'BarcodeDetector Nativo (0.05s)' : 'ZXing Fallback'}
        </div>

        {validandoHttp && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl animate-spin text-emerald-400">
              progress_activity
            </span>
            <p className="text-xs font-bold text-white">Validando en puerta…</p>
          </div>
        )}
      </div>

      {/* Tarjeta de resultado en vivo */}
      {ultimoResultado && (
        <div
          className={`rounded-2xl p-4 border animate-fade-in flex items-start gap-3 transition-all ${
            ultimoResultado.ok
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
              : 'bg-red-950/80 border-red-500/50 text-red-100'
          }`}
        >
          <span
            className={`material-symbols-outlined text-3xl shrink-0 p-1.5 rounded-full ${
              ultimoResultado.ok ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
            }`}
          >
            {ultimoResultado.ok ? 'check' : 'close'}
          </span>

          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base leading-tight">
              {ultimoResultado.ok ? '✅ Pase Autorizado' : '❌ Entrada No Válida'}
            </h3>

            {ultimoResultado.nombre && (
              <p className="text-sm font-bold text-white mt-0.5">
                {ultimoResultado.nombre}
              </p>
            )}

            {ultimoResultado.evento && (
              <p className="text-xs text-white/70 truncate">{ultimoResultado.evento}</p>
            )}

            {ultimoResultado.mensaje && (
              <p className="text-xs mt-1 font-semibold opacity-90">
                {ultimoResultado.mensaje}
              </p>
            )}

            {ultimoResultado.promotor && (
              <p className="text-[11px] text-amber-300 font-bold mt-1">
                Promotor: @{ultimoResultado.promotor}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
