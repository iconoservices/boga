'use client';

// Toma de asistencia: el profesor apunta la cámara al QR del carnet de cada alumno.
// Entra el dueño (con su sesión) o el profesor con el PIN que fijó el dueño en /admin/alumnos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { moduloAcademia, type Modulos } from '@/lib/modulos';
import { horaLegibleLima } from '@/lib/academia';
import LectorQrPuerta from '@/components/eventos/LectorQrPuerta';

interface Resultado { ok: boolean; resultado: string; nombre?: string; usado_at?: string }
interface Llegada { nombre: string; hora: string }

export default function AsistenciaProfesor() {
  const { slug } = useParams<{ slug: string }>();
  const { session, user, loading } = useAuth();
  const [tienda, setTienda] = useState<{ name: string; user_id: string | null; modulos: Modulos | null } | null | undefined>(undefined);
  const [pin, setPin] = useState('');
  const [pinEscrito, setPinEscrito] = useState('');
  const [llegadas, setLlegadas] = useState<Llegada[]>([]);
  const llavePin = `academia_pin_${slug}`;

  useEffect(() => {
    supabase.from('stores').select('name,user_id,modulos').eq('slug', slug).maybeSingle()
      .then(({ data }) => setTienda((data as { name: string; user_id: string | null; modulos: Modulos | null } | null) ?? null));
    try { setPin(localStorage.getItem(llavePin) || ''); } catch { /* sin almacenamiento */ }
  }, [slug, llavePin]);

  const esDueno = !!user && !!tienda && tienda.user_id === user.id;
  const cabeceras = useMemo(
    () => (esDueno && session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined),
    [esDueno, session?.access_token],
  );
  const cuerpoExtra = useMemo(() => ({ store: slug }), [slug]);

  const alValidar = useCallback((r: Resultado) => {
    if (r.resultado === 'sin_permiso') {
      // PIN equivocado o cambiado: se borra para volver a pedirlo
      try { localStorage.removeItem(llavePin); } catch { /* sin almacenamiento */ }
      setPin('');
      return;
    }
    if (r.ok && r.nombre) {
      setLlegadas((prev) => [{ nombre: r.nombre!, hora: horaLegibleLima(r.usado_at || new Date().toISOString()) }, ...prev].slice(0, 30));
    }
  }, [llavePin]);

  const guardarPin = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = pinEscrito.trim();
    if (!limpio) return;
    try { localStorage.setItem(llavePin, limpio); } catch { /* sin almacenamiento */ }
    setPin(limpio);
    setPinEscrito('');
  };

  const cabecera = (
    <header className="border-b border-white/10 px-4 py-3 bg-[#111215] flex items-center gap-2">
      {esDueno && (
        <Link href="/admin/alumnos" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
      )}
      <div className="min-w-0">
        <h1 className="text-sm font-extrabold tracking-tight truncate">Asistencia{tienda ? ` · ${tienda.name}` : ''}</h1>
        <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Lector QR en vivo</p>
      </div>
    </header>
  );

  if (tienda === undefined || loading) {
    return <div className="min-h-screen bg-[#0a0a0c] text-white/60 flex items-center justify-center text-sm">Cargando…</div>;
  }

  if (!tienda || !moduloAcademia(tienda.modulos)) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col">
        {cabecera}
        <p className="m-auto text-sm text-white/60 text-center px-6">Esta academia no tiene la asistencia activada.</p>
      </div>
    );
  }

  const listo = esDueno || !!pin;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans">
      {cabecera}
      <main className="flex-1 p-4 flex flex-col items-center max-w-[500px] mx-auto w-full gap-5">
        {!listo ? (
          <form onSubmit={guardarPin} className="w-full mt-10 bg-[#121316] border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <p className="font-extrabold">PIN del profesor</p>
            <p className="text-xs text-white/60">Pídelo al dueño de la academia. Se guarda en este celular.</p>
            <input
              value={pinEscrito}
              onChange={(e) => setPinEscrito(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              className="bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-lg tracking-widest text-center outline-none focus:border-emerald-400"
            />
            <button className="bg-emerald-500 text-black font-extrabold rounded-xl py-3 active:scale-[0.98] transition-transform">Entrar</button>
            {!user && (
              <Link href={`/login?redirect=/academia/asistencia/${slug}`} className="text-center text-xs text-white/50 underline">Soy el dueño: iniciar sesión</Link>
            )}
          </form>
        ) : (
          <>
            <LectorQrPuerta
              endpoint="/api/academia/asistencia"
              cuerpoExtra={cuerpoExtra}
              cabeceras={cabeceras}
              pinStaff={esDueno ? undefined : pin}
              onValidado={alValidar}
              textos={{
                ok: '✅ Asistencia registrada',
                error: '❌ No se registró',
                validando: 'Registrando…',
                validados: 'llegaron',
                rechazados: 'rechazados',
              }}
            />

            <div className="w-full">
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Llegaron ahora</p>
              {llegadas.length === 0 ? (
                <p className="text-xs text-white/40">Apunta la cámara al carnet de cada alumno.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {llegadas.map((l, i) => (
                    <li key={`${l.nombre}-${i}`} className="bg-[#121316] border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between text-sm">
                      <span className="font-bold truncate">{l.nombre}</span>
                      <span className="text-xs text-emerald-400 font-bold shrink-0 ml-2">{l.hora}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
