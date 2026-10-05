'use client';

// Reservas de servicios del dueño: las que llegan desde la tienda (ej. salón de uñas), de hoy en adelante.
// El dueño las confirma, las cancela (libera la hora) o las marca atendidas. Al confirmar se abre WhatsApp con
// el aviso a la clienta, así que esto es el cuaderno de citas, no el único aviso.

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { hoyLima } from '@/lib/fechaLima';
import { horaLegible, type EstadoReserva } from '@/lib/reservas';

interface Reserva {
  id: string; store: string; codigo: string; servicio: string; precio: number | null;
  fecha: string; hora: string; nombre: string; telefono: string; nota: string | null; estado: EstadoReserva;
}

const ETIQUETA: Record<EstadoReserva, { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-800' },
  confirmada: { texto: 'Confirmada', clase: 'bg-emerald-100 text-emerald-800' },
  atendida: { texto: 'Atendida', clase: 'bg-gray-100 text-gray-600' },
  cancelada: { texto: 'Cancelada', clase: 'bg-red-100 text-red-700' },
};

const fechaLarga = (f: string) => {
  const [y, m, d] = f.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};

export default function ReservasDueno() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tiendas, setTiendas] = useState<{ slug: string; name: string }[]>([]);
  const [slug, setSlug] = useState('');
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [verCanceladas, setVerCanceladas] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/admin/reservas');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from('stores').select('slug,name').eq('user_id', user.id).order('name').then(({ data }) => {
      const lista = (data ?? []) as { slug: string; name: string }[];
      setTiendas(lista);
      setSlug((s) => s || lista[0]?.slug || '');
    });
  }, [user]);

  const cargar = useCallback(async () => {
    if (!slug) return;
    const { data } = await supabase.from('reservas').select('id,store,codigo,servicio,precio,fecha,hora,nombre,telefono,nota,estado')
      .eq('store', slug).gte('fecha', hoyLima()).order('fecha').order('hora');
    setReservas((data ?? []) as Reserva[]);
  }, [slug]);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = async (r: Reserva, estado: EstadoReserva) => {
    setReservas((lista) => lista?.map((x) => (x.id === r.id ? { ...x, estado } : x)) ?? null);
    const { error } = await supabase.from('reservas').update({ estado }).eq('id', r.id);
    if (error) { alert('No se pudo actualizar la reserva.'); cargar(); }
  };

  const avisar = (r: Reserva) => {
    const tel = r.telefono.replace(/\D/g, '');
    const num = tel.length === 9 ? `51${tel}` : tel;
    const msg = `Hola ${r.nombre}, tu reserva de ${r.servicio} para el ${fechaLarga(r.fecha)} a las ${horaLegible(r.hora)} está confirmada ✅ (código ${r.codigo}). ¡Te esperamos!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!user) return null;

  const visibles = (reservas ?? []).filter((r) => verCanceladas || r.estado !== 'cancelada');
  const porDia = visibles.reduce<Record<string, Reserva[]>>((acc, r) => { (acc[r.fecha] ||= []).push(r); return acc; }, {});

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <header className="border-b border-surface-container-highest bg-surface">
        <div className="max-w-[720px] mx-auto px-container-margin py-3 flex items-center gap-2">
          <Link href="/admin" className="text-secondary hover:text-primary text-sm flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Mi panel
          </Link>
          <span className="text-secondary">/</span>
          <span className="font-headline-sm text-headline-sm text-on-surface truncate">Reservas</span>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-container-margin py-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {tiendas.length > 1 ? (
            <select value={slug} onChange={(e) => { setSlug(e.target.value); setReservas(null); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              {tiendas.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          ) : <span className="text-sm font-bold text-gray-700">{tiendas[0]?.name}</span>}
          <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} /> Ver canceladas
          </label>
        </div>

        {reservas === null ? <p className="text-sm text-secondary">Cargando…</p>
          : visibles.length === 0 ? <p className="text-sm text-secondary bg-white border border-gray-100 rounded-xl p-6 text-center">Aún no tienes reservas próximas.</p>
          : Object.entries(porDia).map(([fecha, lista]) => (
            <section key={fecha} className="flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-secondary capitalize">{fechaLarga(fecha)}{fecha === hoyLima() ? ' · hoy' : ''}</h2>
              {lista.map((r) => (
                <article key={r.id} className={`bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-2 ${r.estado === 'cancelada' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{horaLegible(r.hora)} · {r.servicio}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{r.nombre} · {r.telefono}{r.precio ? ` · S/ ${Number(r.precio).toFixed(2)}` : ''}</p>
                      {r.nota && <p className="text-xs text-gray-500 mt-1">“{r.nota}”</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${ETIQUETA[r.estado].clase}`}>{ETIQUETA[r.estado].texto}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.estado === 'pendiente' && <button onClick={() => { cambiar(r, 'confirmada'); avisar(r); }} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Confirmar y avisar</button>}
                    {r.estado === 'confirmada' && <button onClick={() => cambiar(r, 'atendida')} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold">Marcar atendida</button>}
                    {(r.estado === 'pendiente' || r.estado === 'confirmada') && <button onClick={() => { if (confirm('¿Cancelar esta reserva? La hora quedará libre.')) cambiar(r, 'cancelada'); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700">Cancelar</button>}
                    <span className="text-[10px] text-gray-400 self-center ml-auto">Código {r.codigo}</span>
                  </div>
                </article>
              ))}
            </section>
          ))}
      </main>
    </div>
  );
}
