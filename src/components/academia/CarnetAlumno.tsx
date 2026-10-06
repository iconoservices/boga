'use client';

// Carnet digital del alumno: su QR (lo escanea el profesor al entrar) y debajo si hoy ya llegó y su historial.
// El padre lo abre desde el enlace privado; se actualiza solo mientras está abierto y puede activar el aviso "llegó a clase".

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { fechaCorta, horaLegibleLima } from '@/lib/academia';
import { esIOS, enModoApp, motivoError, pushDisponible, suscribirAlumno } from '@/lib/push';

interface Props {
  token: string;
  alumno: { nombre: string; grupo: string | null; activo: boolean };
  academia: { slug: string; nombre: string; logo: string | null };
  hoy: string;
  llegadaHoy: string | null;
  delMes: number;
  historial: { fecha: string; llegada_at: string }[];
}

export default function CarnetAlumno({ token, alumno, academia, hoy, llegadaHoy, delMes, historial }: Props) {
  const router = useRouter();
  const [aviso, setAviso] = useState<'sin-soporte' | 'pendiente' | 'activo' | 'error'>('pendiente');
  const [detalle, setDetalle] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  // Refresco automático: mientras el padre tiene el carnet abierto, ve la llegada apenas se escanea.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 20_000);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (!pushDisponible()) { setAviso('sin-soporte'); return; }
    try {
      if (localStorage.getItem(`boga_alumno_${token}`) === '1' && Notification.permission === 'granted') setAviso('activo');
    } catch { /* sin almacenamiento */ }
  }, [token]);

  const activarAviso = async () => {
    setTrabajando(true);
    setDetalle('');
    const r = await suscribirAlumno(token);
    setTrabajando(false);
    if (r === 'ok') setAviso('activo');
    else if (r === 'no-soportado') setAviso('sin-soporte');
    else { setAviso('error'); setDetalle(r === 'denegado' ? 'Bloqueaste las notificaciones en este navegador. Actívalas desde los ajustes del sitio.' : motivoError()); }
  };

  const llego = !!llegadaHoy;

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex flex-col items-center px-4 py-6 text-[#191b23]">
      <div className="w-full max-w-[380px] flex flex-col gap-4">
        {/* Carnet */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-black/5">
          <div className="bg-[#0b3b8c] text-white px-5 py-4 flex items-center gap-3">
            {academia.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={academia.logo} alt="" className="w-11 h-11 rounded-full object-cover bg-white shrink-0" />
            ) : (
              <span className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">school</span>
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/70">Carnet de alumno</p>
              <p className="font-extrabold leading-tight truncate">{academia.nombre}</p>
            </div>
          </div>

          <div className="px-5 pt-5 pb-6 flex flex-col items-center text-center">
            <h1 className="text-xl font-extrabold leading-tight">{alumno.nombre}</h1>
            {alumno.grupo && <p className="text-sm text-[#545f73] font-semibold mt-0.5">{alumno.grupo}</p>}

            <div className="mt-4 p-3 bg-white rounded-2xl border-2 border-[#0b3b8c]/15">
              <QRCodeSVG value={token} size={220} level="M" />
            </div>
            <p className="text-[11px] text-[#727785] font-semibold mt-3">Muestra este código al profesor al entrar a clase</p>
          </div>
        </div>

        {/* Estado de hoy */}
        {!alumno.activo ? (
          <div className="rounded-2xl p-4 bg-gray-100 text-gray-600 text-sm font-semibold text-center">Este alumno está dado de baja.</div>
        ) : (
          <div className={`rounded-2xl p-4 flex items-center gap-3 border ${llego ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-black/5'}`}>
            <span className={`material-symbols-outlined text-3xl p-1.5 rounded-full shrink-0 ${llego ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {llego ? 'check' : 'schedule'}
            </span>
            <div className="min-w-0">
              <p className="font-extrabold leading-tight">{llego ? 'Ya llegó a clase' : 'Aún no ha llegado hoy'}</p>
              <p className="text-xs text-[#545f73] font-semibold">
                {llego ? `Marcó asistencia a las ${horaLegibleLima(llegadaHoy!)}` : 'Aparece aquí apenas el profesor escanee su carnet.'}
              </p>
            </div>
          </div>
        )}

        {/* Aviso al celular del padre */}
        {aviso !== 'sin-soporte' && (
          <div className="rounded-2xl p-4 bg-white border border-black/5 flex flex-col gap-2">
            {aviso === 'activo' ? (
              <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">notifications_active</span> Te avisaremos cuando llegue a clase
              </p>
            ) : (
              <>
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">notifications</span> Recibe un aviso cuando llegue
                </p>
                {esIOS() && !enModoApp() && (
                  <p className="text-[11px] text-amber-700 font-semibold">En iPhone primero toca Compartir → «Agregar a pantalla de inicio» y abre el carnet desde ahí.</p>
                )}
                <button
                  onClick={activarAviso}
                  disabled={trabajando}
                  className="bg-[#0b3b8c] text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 active:scale-[0.98] transition-transform"
                >
                  {trabajando ? 'Activando…' : 'Activar aviso'}
                </button>
                {aviso === 'error' && detalle && <p className="text-[11px] text-red-600 font-semibold">{detalle}</p>}
              </>
            )}
          </div>
        )}

        {/* Historial */}
        <div className="rounded-2xl p-4 bg-white border border-black/5">
          <div className="flex items-baseline justify-between mb-2">
            <p className="font-extrabold text-sm">Asistencia</p>
            <p className="text-xs text-[#545f73] font-semibold">{delMes} {delMes === 1 ? 'clase' : 'clases'} este mes</p>
          </div>
          {historial.length === 0 ? (
            <p className="text-xs text-[#727785] font-semibold">Todavía no hay asistencias registradas.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {historial.map((m) => (
                <li key={m.fecha} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize">{m.fecha === hoy ? 'Hoy' : fechaCorta(m.fecha)}</span>
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span> {horaLegibleLima(m.llegada_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <a href={`/${academia.slug}`} className="text-center text-xs font-bold text-[#0b3b8c] underline underline-offset-2">
          Ver horarios y datos de {academia.nombre}
        </a>
      </div>
    </div>
  );
}
