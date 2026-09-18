'use client';

// Directorio de discotecas/organizadoras ("¿A cuál perteneces?"). Lee los
// organizadores reales de /api/organizers (se administran en
// /superadmin/organizadores).

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Org = { slug: string; nombre: string; tagline: string | null; color: string; logo: string | null };

export default function OrgDirectorio() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);

  useEffect(() => {
    fetch('/api/organizers')
      .then((r) => r.json())
      .then((j) => setOrgs(j.organizers ?? []))
      .catch(() => setOrgs([]));
  }, []);

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-[#0f0f10] text-white flex flex-col items-center px-4 py-10">
      <div className="text-center mb-2">
        <p className="text-2xl font-extrabold tracking-tight">
          Boga<span className="text-amber-400">Pass</span>
        </p>
        <p className="text-xs text-white/50">by Boga</p>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold uppercase mt-6 text-center leading-tight">¿A cuál perteneces?</h1>
      <p className="text-sm text-white/60 mt-2 text-center">Elige tu discoteca u organizadora para entrar a tu espacio</p>

      {orgs === null && <p className="mt-10 text-sm text-white/40">Cargando…</p>}
      {orgs?.length === 0 && <p className="mt-10 text-sm text-white/40">Todavía no hay organizadores.</p>}

      <div className="grid sm:grid-cols-2 gap-4 mt-10 w-full max-w-[720px]">
        {orgs?.map((o) => (
          <Link
            key={o.slug}
            href={`/org/${o.slug}`}
            className="group flex items-center gap-4 bg-[#1a1a1c] border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-colors"
          >
            <span
              className="w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0 border-2 overflow-hidden"
              style={{ borderColor: o.color, color: o.color, background: `${o.color}1a` }}
            >
              {o.logo ? <img src={o.logo} alt={o.nombre} className="w-full h-full object-cover" /> : o.nombre.slice(0, 1)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-lg leading-tight">{o.nombre}</span>
              <span className="flex items-center gap-1.5 text-xs text-white/60 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Ver espacio y próximas noches
              </span>
              <span className="block text-[11px] text-white/30 font-mono mt-1">/org/{o.slug}</span>
            </span>
            <span className="material-symbols-outlined text-white/30 group-hover:text-white transition-colors">arrow_forward</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
