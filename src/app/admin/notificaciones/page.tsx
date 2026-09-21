'use client';

// Notificaciones del dueño de una tienda: enviar una campaña a quienes instalaron su app y
// activaron los avisos. Solo aparecen las tiendas suyas a las que BogaHub les activó los avisos.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import PanelNotificaciones, { type OpcionCanal } from '@/components/push/PanelNotificaciones';

export default function NotificacionesDueno() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [opciones, setOpciones] = useState<OpcionCanal[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/admin/notificaciones');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase.from('stores').select('slug,name').eq('user_id', user.id).eq('push_activo', true).order('name').then(({ data }) => {
      setOpciones(((data ?? []) as { slug: string; name: string }[]).map((t) => ({ slug: t.slug, nombre: t.name })));
    });
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <header className="border-b border-surface-container-highest bg-surface">
        <div className="max-w-[720px] mx-auto px-container-margin py-3 flex items-center gap-2">
          <Link href="/admin" className="text-secondary hover:text-primary text-sm flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Mi panel
          </Link>
          <span className="text-secondary">/</span>
          <span className="font-headline-sm text-headline-sm text-on-surface truncate">Notificaciones</span>
        </div>
      </header>
      <main className="max-w-[720px] mx-auto px-container-margin py-8 flex flex-col gap-6">
        <p className="text-sm text-secondary">
          Envía ofertas o novedades a quienes instalaron tu app y activaron los avisos. Puedes mandar 1 campaña por semana,
          entre las 8:00 y las 22:00.
        </p>
        {opciones === null ? <p className="text-sm text-secondary">Cargando…</p> : <PanelNotificaciones opciones={opciones} />}
      </main>
    </div>
  );
}
