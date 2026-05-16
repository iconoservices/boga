'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

/**
 * COMPONENTE PRINCIPAL: BARCODE SCANNER
 * Gestiona el motor, la selección de cámaras y el Zoom de hardware.
 */
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Estados de Zoom
  const [zoom, setZoom] = useState(1);
  const [capabilities, setCapabilities] = useState<any>(null);

  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Dimensiones sincronizadas para lectura perfecta
  const SCAN_WIDTH = 300;
  const SCAN_HEIGHT = 200;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. Cargar cámaras (Solo para móvil)
  useEffect(() => {
    if (!isMobile) return;
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('trasera')
        );
        setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => {
      console.error("Cámaras no detectadas", err);
      setError("No se detectaron cámaras.");
    });
  }, [isMobile]);

  // APLICAR ZOOM AL TRACK
  const applyZoom = useCallback(async (value: number) => {
    if (!trackRef.current) return;
    try {
        const caps = trackRef.current.getCapabilities() as any;
        if (!caps.zoom) return;

        const targetZoom = Math.max(caps.zoom.min, Math.min(caps.zoom.max, value));
        
        await trackRef.current.applyConstraints({
            advanced: [{ zoom: targetZoom }]
        } as any);
        setZoom(targetZoom);
    } catch (e) {
        console.error("Error aplicando zoom", e);
    }
  }, []);

  // 2. Lógica del motor (Móvil)
  const startScanningOnCamera = useCallback(async (cameraId: string) => {
    if (!scannerInstanceRef.current) {
        scannerInstanceRef.current = new Html5Qrcode("reader-mobile");
    }
    const scanner = scannerInstanceRef.current;
    try {
        setIsStarting(true);
        setError(null);
        setCapabilities(null);
        setZoom(1);

        if (scanner.isScanning) {
            await scanner.stop();
        }

        const config = {
            fps: 25,
            qrbox: { width: SCAN_WIDTH, height: SCAN_HEIGHT }, // Dimensiones sincronizadas
            aspectRatio: window.innerWidth / window.innerHeight,
            videoConstraints: {
                deviceId: { exact: cameraId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: "environment",
                focusMode: "continuous"
            }
        };

        await scanner.start(
            cameraId,
            config,
            (decodedText) => {
                scanner.stop().then(() => onScan(decodedText)).catch(() => onScan(decodedText));
            },
            () => {}
        );

        const videoElement = document.querySelector('#reader-mobile video') as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            trackRef.current = track;
            
            const caps = track.getCapabilities() as any;
            setCapabilities(caps);

            // AUTO-ZOOM 1.5x TRAS 1.5 SEGUNDOS
            if (caps.zoom) {
                setTimeout(() => {
                   applyZoom(1.5);
                }, 1500);
            }
        }

        setIsStarting(false);
    } catch (err) {
        console.error("Switch error", err);
        setError("Error al iniciar lente.");
        setIsStarting(false);
    }
  }, [onScan, applyZoom]);

  useEffect(() => {
    if (isMobile && selectedCameraId) {
        const timer = setTimeout(() => startScanningOnCamera(selectedCameraId), 300);
        return () => clearTimeout(timer);
    }
  }, [isMobile, selectedCameraId, startScanningOnCamera]);

  useEffect(() => {
    return () => {
        if (scannerInstanceRef.current?.isScanning) {
            scannerInstanceRef.current.stop().catch(e => console.log("Final stop", e));
        }
    };
  }, []);

  if (!isMobile) {
    return <PCScannerUI onScan={onScan} onClose={onClose} />;
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'black', zIndex: 10000, display: 'flex', flexDirection: 'column'
    }}>
      <style>{`
        #reader-mobile > div { opacity: 0.01 !important; pointer-events: none; }
        #reader-mobile video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        @keyframes pulse-green {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      
      <div id="reader-mobile" style={{ width: '100%', height: '100%', position: 'absolute' }}></div>
      <MobileScannerUI 
        cameras={cameras} 
        onClose={onClose} 
        selectedCameraId={selectedCameraId}
        setSelectedCameraId={setSelectedCameraId}
        isStarting={isStarting}
        error={error}
        zoom={zoom}
        applyZoom={applyZoom}
        hasZoom={capabilities?.zoom}
        scanWidth={SCAN_WIDTH}
        scanHeight={SCAN_HEIGHT}
      />
    </div>
  );
};

/**
 * UI DE ESCRITORIO
 */
const PCScannerUI: React.FC<{ onScan: (t: string) => void, onClose: () => void }> = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader-pc",
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
      false
    );
    scanner.render((t) => {
        scanner.clear().then(() => onScan(t)).catch(() => onScan(t));
    }, () => {});
    return () => { scanner.clear().catch(e => console.log(e)); };
  }, [onScan]);

  return (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'white', borderRadius: '35px', width: '100%', maxWidth: '500px',
        padding: '30px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>Escáner PC 🌿</h2>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 900 }}>✕</button>
        </div>
        <div id="reader-pc" style={{ width: '100%', overflow: 'hidden', borderRadius: '25px', border: '2px solid #eee' }}></div>
      </div>
    </div>
  );
};

/**
 * UI DE MÓVIL
 */
interface MobileScannerUIProps {
  cameras: CameraDevice[];
  onClose: () => void;
  selectedCameraId: string | null;
  setSelectedCameraId: (id: string) => void;
  isStarting: boolean;
  error: string | null;
  zoom: number;
  applyZoom: (v: number) => void;
  hasZoom: boolean;
  scanWidth: number;
  scanHeight: number;
}

const MobileScannerUI: React.FC<MobileScannerUIProps> = ({ 
    cameras, onClose, selectedCameraId, setSelectedCameraId, isStarting, error, zoom, applyZoom, hasZoom,
    scanWidth, scanHeight
}) => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', zIndex: 1, pointerEvents: 'none' }}>
      {/* Top Bar */}
      <div style={{ padding: '25px 20px', background: 'linear-gradient(rgba(0,0,0,0.8), transparent)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#00ff88' }}>Delva Scan</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', background: '#00ff88', borderRadius: '50%', animation: 'pulse-green 1.5s infinite' }} />
                <p style={{ margin: 0, fontSize: '0.6rem', opacity: 0.6, letterSpacing: '1px', fontWeight: 800 }}>PRO MODE ACTIVE</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.4rem', fontWeight: 900, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>✕</button>
      </div>

      {/* Visor Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `calc(50% - ${scanHeight/2}px)`, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `calc(50% - ${scanHeight/2}px)`, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', top: `calc(50% - ${scanHeight/2}px)`, left: 0, width: `calc(50% - ${scanWidth/2}px)`, height: `${scanHeight}px`, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'absolute', top: `calc(50% - ${scanHeight/2}px)`, right: 0, width: `calc(50% - ${scanWidth/2}px)`, height: `${scanHeight}px`, background: 'rgba(0,0,0,0.6)' }} />

          <div style={{ width: `${scanWidth}px`, height: `${scanHeight}px`, position: 'relative', overflow: 'hidden', border: '1px solid rgba(0, 255, 136, 0.4)', borderRadius: '25px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '25px', height: '25px', borderTop: '5px solid #00ff88', borderLeft: '5px solid #00ff88', borderTopLeftRadius: '25px' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '25px', height: '25px', borderTop: '5px solid #00ff88', borderRight: '5px solid #00ff88', borderTopRightRadius: '25px' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '25px', height: '25px', borderBottom: '5px solid #00ff88', borderLeft: '5px solid #00ff88', borderBottomLeftRadius: '25px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '25px', height: '25px', borderBottom: '5px solid #00ff88', borderRight: '5px solid #00ff88', borderBottomRightRadius: '25px' }} />
              <div className="scanner-laser-line" style={{ height: '3px', filter: 'blur(1px)' }} />
          </div>

          {isStarting && <div style={{ position: 'absolute', bottom: 'calc(50% - 150px)', color: '#00ff88', fontWeight: 900, fontSize: '0.8rem', textShadow: '0 0 10px #000' }}>ENCENDIENDO LENTE...</div>}
          {error && <div style={{ position: 'absolute', bottom: '-40px', background: 'red', borderRadius: '10px', padding: '5px 15px', fontSize: '0.8rem' }}>{error}</div>}
      </div>

      {/* Controls */}
      <div style={{ padding: '20px 20px 60px', background: 'linear-gradient(transparent, rgba(0,0,0,0.95))', pointerEvents: 'auto', textAlign: 'center' }}>
          {hasZoom && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
                {[1, 1.5, 2].map(v => (
                    <button
                        key={v}
                        onClick={() => applyZoom(v)}
                        style={{
                            width: '45px', height: '45px', borderRadius: '50%', border: 'none',
                            background: Math.abs(zoom - v) < 0.1 ? '#00ff88' : 'rgba(255,255,255,0.15)',
                            color: Math.abs(zoom - v) < 0.1 ? 'black' : 'white',
                            fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', transition: '0.2s'
                        }}
                    >
                        {v}x
                    </button>
                ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {cameras.map((cam: CameraDevice, i: number) => (
                <button
                    key={cam.id}
                    onClick={() => setSelectedCameraId(cam.id)}
                    disabled={isStarting}
                    style={{
                        padding: '12px 18px', borderRadius: '20px', border: '1.5px solid',
                        borderColor: selectedCameraId === cam.id ? '#00ff88' : 'rgba(255,255,255,0.1)',
                        background: selectedCameraId === cam.id ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)',
                        color: selectedCameraId === cam.id ? '#00ff88' : 'white',
                        fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer', backdropFilter: 'blur(15px)',
                    }}
                >
                    {i === 0 ? "PRINCIPAL" : i === 1 ? "WIFI/ZOOM" : "LENTE " + (i + 1)}
                </button>
            ))}
          </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
