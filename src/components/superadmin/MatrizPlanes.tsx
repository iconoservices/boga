'use client';

// «¿Qué incluye cada plan?»: cruza los 3 planes con el catálogo de módulos de expansión (nivel sugerido de cada uno).
// Vivía en Paquetes; ahora está en Cobros → Precios, con el precio de cada plan leído de los precios reales.

import type { StoreModule } from '@/lib/modulosPaquetes';

const PLANES: { tier: StoreModule['tier']; nombre: string; fondo: string; antes: string | null }[] = [
  { tier: 'Basic', nombre: 'Plan Esencial', fondo: 'bg-emerald-50', antes: null },
  { tier: 'Pro', nombre: 'Plan Negocio', fondo: 'bg-amber-50', antes: 'Esencial' },
  { tier: 'Enterprise', nombre: 'Plan Supermercado / Pro', fondo: 'bg-violet-50', antes: 'App' },
];

export default function MatrizPlanes({ modulos, precioPlan }: { modulos: StoreModule[]; precioPlan: Partial<Record<StoreModule['tier'], string>> }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-[#191b23]">¿Qué incluye cada plan?</h3>
        <p className="text-xs text-[#424754] mt-1">Cruce entre los planes y el catálogo de módulos de expansión para tiendas en Boga Market.</p>
      </div>

      <div className="bg-[#f2f3fd] border border-[#c2c6d6] rounded-md p-3 flex items-start gap-2">
        <span className="material-symbols-outlined text-[16px] text-[#0058be] shrink-0">check_circle</span>
        <p className="text-[10px] text-[#424754] leading-relaxed">
          <span className="font-bold text-[#191b23]">Incluido siempre, en cualquier plan: </span>
          App instalable (PWA), catálogo de productos, categorías estructuradas, botón de WhatsApp sin comisión, estilos y branding, y promociones y combos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANES.map(({ tier, nombre, fondo, antes }) => {
          const propios = modulos.filter((m) => m.tier === tier);
          const acumulados = modulos.filter((m) => (tier === 'Basic' ? m.tier === 'Basic' : tier === 'Pro' ? m.tier !== 'Enterprise' : true)).length;
          return (
            <div key={tier} className="bg-white border border-[#c2c6d6] rounded-md overflow-hidden flex flex-col">
              <div className={`px-4 py-3 border-b border-[#c2c6d6] ${fondo}`}>
                <p className="text-xs font-bold text-[#191b23]">{nombre}</p>
                <p className="text-[9px] text-[#424754] font-semibold">{precioPlan[tier] ? `${precioPlan[tier]} · ` : ''}{acumulados} módulos disponibles</p>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {antes && <p className="text-[9px] italic text-[#424754]">Todo lo de {antes}, más:</p>}
                {propios.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#0058be] shrink-0">{m.icon}</span>
                    <span className="text-[10px] font-semibold text-[#191b23]">{m.name}</span>
                    {m.buildStatus === 'no_construido' && <span className="text-[8px] font-black uppercase text-[#8a5a00] bg-[#fff1cc] border border-[#f1d28a] rounded-full px-1.5">aún no</span>}
                  </div>
                ))}
                {propios.length === 0 && <p className="text-[10px] text-[#424754] italic">Sin módulos propios en este nivel.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
