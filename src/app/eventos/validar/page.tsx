'use client';

// Validador de entradas en la puerta: lee el QR (token) y llama a
// validar_ticket, que lo marca 'usado' de forma atomica en el servidor.
// MVP: protegido con el mismo guard de superadmin que las demas subrutas de
// /superadmin — el reparto de acceso a promotores es nivel 2 (ver memoria
// eventos-ticketing).

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import { supabase } from '@/lib/supabase';

type Resultado = {
  tipo: 'valido' | 'ya_usado' | 'no_encontrado' | 'error';
  evento?: string | null;
  nombre?: string | null;
  mensaje?: string;
};

export default function ValidarEntradas() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const bloqueadoRef = useRef(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [escaneando, setEscaneando] = useState(false);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/eventos/validar');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => {
    if (!esSuperadmin || !readerRef.current) return;

    let cancelado = false;

    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (cancelado) return;
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: 250 },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        async (decodedText: string) => {
          if (bloqueadoRef.current) return;
          bloqueadoRef.current = true;

          const { data, error } = await supabase.rpc('validar_ticket', { p_token: decodedText });
          if (error) {
            setResultado({ tipo: 'error', mensaje: error.message });
          } else {
            const fila = Array.isArray(data) ? data[0] : data;
            setResultado({ tipo: fila?.resultado, evento: fila?.evento_titulo, nombre: fila?.nombre });
          }

          // Pausa corta para no reprocesar el mismo QR en el siguiente frame
          // y para que se alcance a leer el resultado en pantalla.
          setTimeout(() => { bloqueadoRef.current = false; }, 2500);
        },
        () => {} // callback de error de lectura frame a frame: se ignora, es ruido normal
      );
      setEscaneando(true);
    });

    return () => {
      cancelado = true;
      scannerRef.current?.clear().catch(() => {});
    };
  }, [esSuperadmin]);

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const colorResultado = {
    valido: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    ya_usado: 'bg-amber-50 border-amber-300 text-amber-800',
    no_encontrado: 'bg-red-50 border-red-300 text-red-800',
    error: 'bg-red-50 border-red-300 text-red-800',
  } as const;

  const textoResultado = {
    valido: '✅ Entrada válida — pase',
    ya_usado: '⚠️ Este QR ya fue usado',
    no_encontrado: '❌ QR no reconocido',
    error: '❌ Error al validar',
  } as const;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Validar entradas" icon="qr_code_scanner" />
      <main className="max-w-[480px] mx-auto px-4 py-8 flex flex-col gap-4">
        <p className="text-xs text-[#424754]">
          Apunta la cámara al QR que muestra el asistente en la puerta.
          {!escaneando && ' Cargando cámara…'}
        </p>

        <div id="qr-reader" ref={readerRef} className="rounded-xl overflow-hidden border border-[#c2c6d6]" />

        {resultado && (
          <div className={`rounded-xl border p-4 flex flex-col gap-1 ${colorResultado[resultado.tipo]}`}>
            <p className="font-bold text-sm">{textoResultado[resultado.tipo]}</p>
            {resultado.evento && <p className="text-xs">{resultado.evento}</p>}
            {resultado.nombre && <p className="text-xs">A nombre de {resultado.nombre}</p>}
            {resultado.mensaje && <p className="text-xs">{resultado.mensaje}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
