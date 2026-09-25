'use client';

// Sección de planes de /negocios. Cliente porque tiene el toggle mensual/anual.
// El resto de la landing (/negocios/page.tsx) sigue siendo Server Component.

import React, { useState } from 'react';
import Link from 'next/link';

import { CAPACIDADES_PLAN, MODULOS_VENTA, PLANES, POR_DEFINIR, planIncluye } from '@/lib/planesNegocios';

const REGISTRO = '/negocios/registro';

export default function NegociosPlanes() {
  const [anual, setAnual] = useState(false);
  const [detalle, setDetalle] = useState(false);

  return (
    <section id="precios" className="scroll-mt-24 pb-14 md:pb-16">
      <div className="text-center max-w-[560px] mx-auto mb-8">
        <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">Elige tu plan, suma lo que necesites</h2>
        <p className="text-secondary font-body-md text-sm md:text-base mt-2">
          Empieza con tu tienda y crece cuando quieras. Lo que vendes es 100% tuyo:
          cobras tú, directo a tu cliente — BogaHub solo te cobra el plan.
        </p>
      </div>

      {/* Toggle mensual / anual */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface-container border border-surface-container-highest">
          <button
            type="button"
            onClick={() => setAnual(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              !anual ? 'bg-surface-container-lowest text-on-background shadow-sm' : 'text-secondary hover:text-on-background'
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setAnual(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-1.5 ${
              anual ? 'bg-surface-container-lowest text-on-background shadow-sm' : 'text-secondary hover:text-on-background'
            }`}
          >
            Anual
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
              2 meses gratis
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANES.map((plan) => {
          const p = anual ? plan.anio : plan.mes;
          return (
            <div
              key={plan.id}
              className={`relative bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-3 ${
                plan.etiqueta ? 'border-[1.5px] border-primary' : 'border border-surface-container-highest'
              }`}
            >
              {plan.etiqueta && (
                <span className="absolute top-4 right-4 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  {plan.etiqueta}
                </span>
              )}
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">{plan.icon}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-background">{plan.nombre}</h3>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-3xl font-extrabold text-on-background">{p.precio}</span>
                <span className="text-secondary font-body-md text-sm">{p.periodo}</span>
              </div>
              {p.nota && <p className="text-primary font-label-md text-[11px] font-bold uppercase tracking-wide -mt-1">{p.nota}</p>}
              <p className="text-secondary font-body-md text-sm leading-relaxed">{plan.body}</p>
              <ul className="flex flex-col gap-2 my-1">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-on-background/80">
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {plan.pronto ? (
                <span className="w-full mt-auto py-3 rounded-xl font-bold text-sm text-center border border-surface-container-highest text-secondary cursor-default">
                  Aún no disponible
                </span>
              ) : (
                <Link
                  href={`${REGISTRO}?i=tienda&nivel=${plan.id}${anual ? '&plan=anual' : ''}`}
                  className={`w-full mt-auto py-3 rounded-xl font-bold text-sm text-center transition-all active:scale-95 ${
                    plan.etiqueta
                      ? 'bg-primary text-on-primary hover:opacity-90'
                      : 'border-[1.5px] border-primary text-primary hover:bg-primary/5'
                  }`}
                >
                  Empezar
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparación completa: mismos checks que la tabla del superadmin, sin las marcas internas. */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setDetalle((v) => !v)}
          aria-expanded={detalle}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          {detalle ? 'Ocultar el detalle' : 'Ver todo lo que incluye cada plan'}
          <span className="material-symbols-outlined text-[18px]">{detalle ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>
      {detalle && (
        <div className="mt-4 bg-surface-container-lowest border border-surface-container-highest rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[420px]">
            <thead>
              <tr className="bg-surface-container text-[11px] uppercase tracking-wide text-secondary">
                <th className="p-3 font-bold">Qué incluye</th>
                {PLANES.map((p) => <th key={p.id} className="p-3 font-bold text-center w-28">{p.nombre}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPACIDADES_PLAN.map((c) => (
                <tr key={c.texto} className="border-t border-surface-container-highest">
                  <td className="p-3 font-semibold text-on-background">
                    {c.texto}
                    {c.estado === 'falta' && (
                      <span className="ml-2 text-[10px] font-bold text-secondary bg-surface-container px-1.5 py-0.5 rounded uppercase tracking-wide">Próximamente</span>
                    )}
                  </td>
                  {PLANES.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      {!planIncluye(p.id, c.desde)
                        ? <span className="text-secondary/40">—</span>
                        : c.valor?.[p.id]
                          ? <span className="text-xs font-bold text-on-background">{c.valor[p.id]}</span>
                          : <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-surface-container-highest bg-surface-container">
                <td colSpan={PLANES.length + 1} className="p-3 text-[11px] font-bold uppercase tracking-wide text-primary">
                  Se agrega como módulo, en cualquier plan
                </td>
              </tr>
              {MODULOS_VENTA.flatMap((g) => g.items).map((m) => (
                <tr key={m.id} className="border-t border-surface-container-highest">
                  <td className="p-3 font-semibold text-on-background">
                    {m.nombre}
                    {m.pronto && <span className="ml-2 text-[10px] font-bold text-secondary bg-surface-container px-1.5 py-0.5 rounded uppercase tracking-wide">Próximamente</span>}
                    {m.id === 'avisos' && <span className="block text-xs font-normal text-secondary">Paquete de 4 por S/ 10; no vencen</span>}
                  </td>
                  {PLANES.map((p) => (
                    <td key={p.id} className="p-3 text-center">
                      {m.incluidoEn.includes(p.id)
                        ? <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                        : m.gratisEnLanzamiento?.includes(p.id)
                          ? <span className="text-[11px] font-bold text-primary leading-tight block">Incluido en el lanzamiento</span>
                          : <span className="text-[11px] font-bold text-secondary">Módulo</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Módulos: se compran sueltos en cualquier plan; algunos ya vienen incluidos en uno. */}
      <div className="mt-12">
        <div className="text-center max-w-[560px] mx-auto mb-6">
          <h3 className="font-headline-md text-xl md:text-2xl font-extrabold text-on-background">Módulos para sumar</h3>
          <p className="text-secondary font-body-md text-sm mt-2">
            Cada pieza se puede agregar a cualquier plan. Si tu plan ya la trae, no pagas de más.
          </p>
        </div>
        {/* Cuadrícula pareja: el grupo va como etiqueta en cada tarjeta (así no quedan columnas desiguales). */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULOS_VENTA.flatMap((g) => g.items.map((it) => ({ ...it, grupo: g.grupo }))).map((it) => (
            <div key={it.id} className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">{it.icon}</span>
                </div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide text-right">{it.grupo}</span>
              </div>
              <h4 className="font-headline-sm text-base text-on-background flex items-center gap-2 flex-wrap">
                {it.nombre}
                {it.pronto && (
                  <span className="text-[10px] font-bold text-secondary bg-surface-container px-1.5 py-0.5 rounded uppercase tracking-wide">Próximamente</span>
                )}
              </h4>
              <p className="text-secondary font-body-md text-sm leading-relaxed">{it.body}</p>
              <div className="mt-auto pt-2">
                {it.promo && <p className="text-primary text-[11px] font-bold uppercase tracking-wide mb-1">{it.promo}</p>}
                <p className="text-on-background text-xs font-bold">
                  {it.precio === POR_DEFINIR ? 'Precio por confirmar' : `${it.precio}${it.unidad ?? ' /mes'}`}
                  {it.incluidoEn.length > 0 && (
                    <span className="text-secondary font-semibold"> · Incluido en {it.incluidoEn.map((id) => PLANES.find((p) => p.id === id)?.nombre).join(' y ')}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-secondary/80 font-body-md text-xs text-center mt-6 max-w-[560px] mx-auto">
        Vienes con plantillas listas para tu rubro. Los módulos los sumas cuando quieras desde tu panel — no hace falta registrarte de nuevo.
        ¿Quieres un diseño totalmente a medida? Lo cotizamos según lo que necesites.
      </p>
    </section>
  );
}
