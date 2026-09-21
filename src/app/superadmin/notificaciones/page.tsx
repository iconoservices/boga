'use client';

// Notificaciones — subruta propia del superadmin (mismo marco y guard que /superadmin/sorteos).
// Desde acá se envían los avisos del canal de BogaHub (los que reciben quienes activan los avisos
// de la plataforma) y los de cualquier tienda con avisos push activados.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import { CANAL_BOGA } from '@/lib/pushLimites';
import SuperadminSidebarNav from '@/components/superadmin/SuperadminSidebarNav';
import PanelNotificaciones, { type OpcionCanal } from '@/components/push/PanelNotificaciones';

export default function NotificacionesAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const [opciones, setOpciones] = useState<OpcionCanal[] | null>(null);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/notificaciones');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => {
    if (!esSuperadmin) return;
    supabase.from('stores').select('slug,name').eq('push_activo', true).order('name').then(({ data }) => {
      setOpciones([
        { slug: CANAL_BOGA, nombre: 'BogaHub (avisos de la plataforma)' },
        ...((data ?? []) as { slug: string; name: string }[]).map((t) => ({ slug: t.slug, nombre: t.name })),
      ]);
    });
  }, [esSuperadmin]);

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex">
      <aside className="hidden md:flex flex-col h-screen w-64 bg-[#f2f3fd] border-r border-[#c2c6d6] p-4 gap-2 shrink-0 sticky top-0">
        <SuperadminSidebarNav />
      </aside>
      <div className="flex-1 min-w-0 bg-background text-on-background font-body-md">
        <header className="border-b border-surface-container-highest bg-surface">
          <div className="max-w-[900px] mx-auto px-container-margin py-3 flex items-center gap-2">
            <Link href="/superadmin" className="text-secondary hover:text-primary text-sm flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Superadmin
            </Link>
            <span className="text-secondary">/</span>
            <span className="font-headline-sm text-headline-sm text-on-surface truncate">Notificaciones</span>
          </div>
        </header>
        <main className="max-w-[1000px] mx-auto px-container-margin py-8 flex flex-col gap-6">
          <p className="text-sm text-secondary">
            Envía avisos a quienes activaron las notificaciones. El canal de BogaHub no tiene tope de campañas;
            las tiendas tienen 1 por semana. Los envíos son solo entre las 8:00 y las 22:00 (hora de Lima).
          </p>
          {opciones === null ? <p className="text-sm text-secondary">Cargando…</p> : <PanelNotificaciones opciones={opciones} />}
        </main>
      </div>
    </div>
  );
}
