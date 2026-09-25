'use client';

// Catálogo de módulos de expansión, ordenado por qué tan real es cada uno: lo que ya se puede
// vender, lo que está a medias, lo que se puede construir con lo que ya hay y lo que necesita
// antes otra pieza o un tercero. Los datos verificados viven en src/lib/catalogoModulos.ts.

import { MODULOS_EXISTENTES_EXTRA, NIVEL_NOMBRE, PLAN_INFO, type Esfuerzo, type EstadoModulo, type InfoModulo } from '@/lib/catalogoModulos';

export interface ModuloComercial {
  id: string;
  name: string;
  icon: string;
  price: string;
  description: string;
}

type Item = ModuloComercial & { info: InfoModulo };

const GRUPOS: { estado: EstadoModulo; titulo: string; ayuda: string; color: string }[] = [
  { estado: 'existe', titulo: 'Ya construido', ayuda: 'Se puede vender hoy. Se prende por tienda desde el editor del superadmin.', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { estado: 'parcial', titulo: 'A medias: falta poco', ayuda: 'Ya hay una parte funcionando; lo que falta es chico.', color: 'bg-sky-50 border-sky-200 text-sky-800' },
  { estado: 'por_construir', titulo: 'Se puede construir con lo que ya hay', ayuda: 'No existe todavía, pero las bases ya están. Ordenados del más fácil al más pesado.', color: 'bg-amber-50 border-amber-200 text-amber-800' },
  { estado: 'aparte', titulo: 'Aparte: necesitan otra pieza o un tercero', ayuda: 'No conviene venderlos ni prometerlos todavía.', color: 'bg-slate-100 border-slate-300 text-slate-700' },
];

const ORDEN_ESFUERZO: Record<Esfuerzo, number> = { bajo: 0, medio: 1, alto: 2 };
const ESFUERZO_TXT: Record<Esfuerzo, string> = { bajo: 'Esfuerzo bajo', medio: 'Esfuerzo medio', alto: 'Esfuerzo alto' };

export default function CatalogoOrdenado({ modulos }: { modulos: ModuloComercial[] }) {
  const items: Item[] = [
    ...MODULOS_EXISTENTES_EXTRA.map((m) => ({ id: m.id, name: m.name, icon: m.icon, price: m.price, description: m.description, info: m.info })),
    ...modulos.filter((m) => PLAN_INFO[m.id]).map((m) => ({ ...m, info: PLAN_INFO[m.id] })),
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="border-b border-[#c2c6d6] pb-4">
        <h2 className="text-xl font-bold text-[#191b23]">Módulos de Expansión</h2>
        <p className="text-xs text-[#424754] mt-1">
          Ordenados por qué tan real es cada uno, verificado contra el código. Cada uno dice a qué nivel encaja, qué ya existe por debajo y qué falta.
        </p>
      </div>

      {GRUPOS.map((g) => {
        const lista = items
          .filter((i) => i.info.estado === g.estado)
          .sort((a, b) => ORDEN_ESFUERZO[a.info.esfuerzo] - ORDEN_ESFUERZO[b.info.esfuerzo]);
        if (lista.length === 0) return null;
        return (
          <div key={g.estado} className="flex flex-col gap-3">
            <div className={`px-3 py-2 rounded-md border ${g.color}`}>
              <p className="text-xs font-bold">{g.titulo} <span className="opacity-70">({lista.length})</span></p>
              <p className="text-[10px] font-semibold opacity-80">{g.ayuda}</p>
            </div>

            {g.estado === 'aparte' && (
              <div className="p-3 bg-[#fff8e1] border border-[#f5c518]/50 rounded-md flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#5c4a00] shrink-0">key</span>
                <p className="text-[11px] text-[#5c4a00] font-semibold leading-relaxed">
                  <span className="font-bold">La pieza que destraba más ahora: identificar al cliente.</span>{' '}
                  Los pedidos de la carta ya se guardan, pero las plantillas no piden el celular. Con el celular en cada pedido se pueden hacer
                  lealtad, referidos, racha, reseñas de quien de verdad compró y marketing. Es el siguiente paso con más retorno.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {lista.map((m) => (
                <div key={m.id} className="bg-white border border-[#c2c6d6] rounded-md p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-md bg-[#d5e0f8] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[#0058be]">{m.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#191b23]">{m.name}</p>
                      <p className="text-[10px] font-bold text-[#0058be]">{m.price}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-[#f2f3fd] border-[#c2c6d6] text-[#424754]">{NIVEL_NOMBRE[m.info.nivel]}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-white border-[#c2c6d6] text-[#424754]">{ESFUERZO_TXT[m.info.esfuerzo]}</span>
                  </div>

                  <p className="text-[11px] text-[#424754] leading-relaxed">{m.description}</p>

                  <dl className="text-[10px] leading-snug flex flex-col gap-1.5 pt-3 border-t border-[#ecedf7]">
                    <div><dt className="inline font-bold text-[#191b23]">Ya hay: </dt><dd className="inline text-[#424754] font-semibold">{m.info.bases}</dd></div>
                    <div><dt className="inline font-bold text-[#191b23]">Falta: </dt><dd className="inline text-[#424754] font-semibold">{m.info.falta}</dd></div>
                    {m.info.depende && (
                      <div><dt className="inline font-bold text-[#8c0009]">Depende de: </dt><dd className="inline text-[#424754] font-semibold">{m.info.depende}</dd></div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
