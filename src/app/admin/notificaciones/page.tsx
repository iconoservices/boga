'use client';

// Notificaciones del dueño de una tienda: enviar una campaña a quienes instalaron su app y
// activaron las notificaciones. Solo aparecen las tiendas suyas a las que BogaHub les activó las notificaciones.

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
    (async () => {
      // Tiendas propias + las que administra como co-administrador
      const { data: co } = await supabase.from('store_admins').select('store').eq('user_id', user.id);
      const slugsCo = (co ?? []).map((r: { store: string }) => r.store);
      const filtro = slugsCo.length ? `user_id.eq.${user.id},slug.in.(${slugsCo.join(',')})` : `user_id.eq.${user.id}`;
      const { data } = await supabase.from('stores').select('slug,name').or(filtro).order('name');
      setOpciones(((data ?? []) as { slug: string; name: string }[]).map((t) => ({ slug: t.slug, nombre: t.name })));
    })();
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
      <main className="max-w-[860px] mx-auto px-container-margin py-8 flex flex-col gap-6">
        <p className="text-sm text-secondary">
          Envía ofertas o novedades a quienes instalaron tu app y activaron las notificaciones. Tu plan incluye una cantidad al mes (la ves abajo), que se acumula durante el mes,
          y las mandas entre las 8:00 y las 22:00. Si necesitas más, puedes comprar paquetes de 4.
        </p>
        {opciones === null ? <p className="text-sm text-secondary">Cargando…</p> : <PanelNotificaciones opciones={opciones} />}
      </main>
    </div>
  );
}
