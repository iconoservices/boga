'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type PromotorData = {
  ok: boolean;
  promotor: string;
  totalReservas: number;
  ingresadosPuerta: number;
  pendientes: number;
  comisionPorPersona: number;
  comisionEstimada: number;
  tickets: Array<{
    id: string;
    nombre: string;
    created_at: string;
    estado: 'valido' | 'usado';
    usado_at: string | null;
  }>;
  eventos: Array<{
    id: string;
    titulo: string;
    dia: string;
    mes: string;
  }>;
};

function PanelPromotorContenido() {
  const searchParams = useSearchParams();
  const initialCodigo = searchParams.get('codigo') || searchParams.get('ref') || '';

  const [codigo, setCodigo] = useState(initialCodigo);
  const [activoCodigo, setActivoCodigo] = useState(initialCodigo);
  const [cargando, setCargando] = useState(false);
  const [data, setData] = useState<PromotorData | null>(null);
  const [copiado, setCopiado] = useState(false);

  const consultarStats = async (cod: string) => {
    if (!cod.trim()) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/eventos/promotor?codigo=${encodeURIComponent(cod.trim().toLowerCase())}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setActivoCodigo(cod.trim().toLowerCase());
      }
    } catch {
      // error silencioso
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (initialCodigo) {
      consultarStats(initialCodigo);
    }
  }, [initialCodigo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    consultarStats(codigo);
  };

  const getLinkReferido = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/eventos?ref=${activoCodigo}`;
  };

  const copiarEnlace = () => {
    const link = getLinkReferido();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const compartirWhatsApp = () => {
    const link = getLinkReferido();
    const texto = encodeURIComponent(`¡Hola! Separa tus entradas o reserva tu box para el evento desde este enlace oficial: ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0e0f12] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 bg-[#141519] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/eventos"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">Portal de Promotores</h1>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              Control de Entradas y Comisiones
            </p>
          </div>
        </div>

        <Link
          href="/eventos/validar"
          className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full hover:bg-emerald-400/20 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
          Lector Puerta
        </Link>
      </header>

      <main className="max-w-[700px] mx-auto w-full p-4 flex-1 flex flex-col gap-6">
        {/* Formulario de Código de Promotor */}
        <div className="bg-[#17181d] border border-white/10 rounded-2xl p-5 shadow-lg">
          <h2 className="text-base font-bold text-white mb-1">Tu Identificador de Promotor</h2>
          <p className="text-xs text-white/60 mb-4">
            Escribe tu código o nombre asignado para ver tus estadísticas y generar tus links de venta.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">@</span>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="ej: carlos, andrea2026, promotor1"
                className="w-full bg-[#0a0a0c] border border-white/15 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none focus:border-amber-400 font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={cargando || !codigo.trim()}
              className="bg-amber-400 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {cargando ? (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">search</span>
              )}
              Consultar
            </button>
          </form>
        </div>

        {activoCodigo && data && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Tarjeta de Compartir Enlace */}
            <div className="bg-gradient-to-br from-amber-950/40 via-[#17181d] to-[#17181d] border border-amber-400/30 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Tu Enlace de Referido
                </span>
                <span className="text-xs font-bold text-white/70">Código: @{activoCodigo}</span>
              </div>

              <p className="text-xs text-white/70 mb-3">
                Comparte este link. Toda reserva realizada por aquí sumará automáticamente a tus números:
              </p>

              <div className="bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-amber-200 font-mono break-all select-all mb-3">
                {getLinkReferido()}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copiarEnlace}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiado ? 'check' : 'content_copy'}
                  </span>
                  {copiado ? '¡Copiado al portapapeles!' : 'Copiar enlace'}
                </button>

                <button
                  type="button"
                  onClick={compartirWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  Enviar por WhatsApp
                </button>
              </div>
            </div>

            {/* Métricas Principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#17181d] border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-white">{data.totalReservas}</p>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide mt-1">
                  Reservas Totales
                </p>
              </div>

              <div className="bg-[#17181d] border border-emerald-500/30 rounded-2xl p-4 text-center bg-emerald-950/10">
                <p className="text-3xl font-black text-emerald-400">{data.ingresadosPuerta}</p>
                <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide mt-1">
                  En Puerta (Ingresaron)
                </p>
              </div>

              <div className="bg-[#17181d] border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-amber-300">{data.pendientes}</p>
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide mt-1">
                  Por Llegar
                </p>
              </div>

              <div className="bg-[#17181d] border border-amber-500/30 rounded-2xl p-4 text-center bg-amber-950/15">
                <p className="text-3xl font-black text-amber-400">S/ {data.comisionEstimada}</p>
                <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wide mt-1">
                  Comisión Estimada
                </p>
              </div>
            </div>

            {/* Listado de Entradas con este código */}
            <div className="bg-[#17181d] border border-white/10 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span>Últimos Asistentes Registrados</span>
                <span className="text-xs text-white/50 font-normal">
                  {data.tickets.length} registrados
                </span>
              </h3>

              {data.tickets.length === 0 ? (
                <p className="text-xs text-white/40 italic text-center py-6">
                  Aún no hay reservas registradas con el código @{activoCodigo}. ¡Comparte tu link para empezar a sumar!
                </p>
              ) : (
                <div className="divide-y divide-white/5">
                  {data.tickets.map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{t.nombre}</p>
                        <p className="text-[10px] text-white/40">
                          {new Date(t.created_at).toLocaleDateString('es-PE', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <div>
                        {t.estado === 'usado' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[12px]">done_all</span>
                            Ingresó
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-white/10 text-white/60 border border-white/10 px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PanelPromotoresPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white/50 text-xs">Cargando promotores…</div>}>
      <PanelPromotorContenido />
    </Suspense>
  );
}
