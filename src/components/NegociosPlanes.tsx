'use client';

// Sección de planes de /negocios. Cliente porque tiene el toggle mensual/anual.
// El resto de la landing (/negocios/page.tsx) sigue siendo Server Component.

import React, { useState } from 'react';
import Link from 'next/link';

const REGISTRO = '/negocios/registro';

type Precio = { precio: string; periodo: string; nota: string };
type Plan = {
  id: string;
  icon: string;
  nombre: string;
  featured: boolean;
  body: string;
  bullets: string[];
  mes: Precio;
  anio: Precio;
};

const PLANES: Plan[] = [
  {
    id: 'tienda',
    icon: 'storefront',
    nombre: 'Tu Tienda Boga',
    featured: false,
    body: 'Tu página de pedidos con tu propio link (bogahub.app/tu-negocio) para compartir en WhatsApp o Instagram. Tú vendes y cobras directo — Boga no toca tu plata.',
    bullets: [
      'Catálogo, inventario y gestión de pedidos',
      'Pedidos directo a tu WhatsApp, sin comisión',
      'Funciona en cualquier ciudad',
    ],
    mes: { precio: 'S/ 50', periodo: '/mes', nota: 'Precio de lanzamiento · luego S/ 80/mes' },
    anio: { precio: 'S/ 500', periodo: '/año', nota: '2 meses gratis · equivale a ~S/ 42/mes' },
  },
  {
    id: 'marketplace',
    icon: 'travel_explore',
    nombre: 'Vende en Boga Market',
    featured: true,
    body: 'Todo lo de Tu Tienda Boga y, además, tu negocio aparece en el Market de tu ciudad, junto a otros comercios locales, frente a gente que todavía no te conoce.',
    bullets: [
      'Todo lo del plan Tu Tienda Boga',
      'Clientes de tu ciudad te descubren',
      'Coordinación de entrega, lo activas cuando quieras',
    ],
    mes: { precio: 'S/ 100', periodo: '/mes', nota: 'Solo donde Boga opera' },
    anio: { precio: 'S/ 1 000', periodo: '/año', nota: '2 meses gratis · solo donde Boga opera' },
  },
];

export default function NegociosPlanes() {
  const [anual, setAnual] = useState(false);

  return (
    <section id="precios" className="scroll-mt-24 pb-14 md:pb-16">
      <div className="text-center max-w-[560px] mx-auto mb-8">
        <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">Un plan fijo, sin comisión</h2>
        <p className="text-secondary font-body-md text-sm md:text-base mt-2">
          Empieza con tu tienda propia y suma el Market cuando quieras. Lo que vendes es 100% tuyo:
          cobras tú, directo a tu cliente — Boga solo te cobra el plan.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PLANES.map((plan) => {
          const p = anual ? plan.anio : plan.mes;
          return (
            <div
              key={plan.id}
              className={`relative bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-3 ${
                plan.featured ? 'border-[1.5px] border-primary' : 'border border-surface-container-highest'
              }`}
            >
              {plan.featured && (
                <span className="absolute top-4 right-4 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wide">
                  Más alcance
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
              <p className="text-primary font-label-md text-[11px] font-bold uppercase tracking-wide -mt-1">{p.nota}</p>
              <p className="text-secondary font-body-md text-sm leading-relaxed">{plan.body}</p>
              <ul className="flex flex-col gap-2 my-1">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-on-background/80">
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`${REGISTRO}?i=${plan.id}${anual ? '&plan=anual' : ''}`}
                className={`w-full mt-auto py-3 rounded-xl font-bold text-sm text-center transition-all active:scale-95 ${
                  plan.featured
                    ? 'bg-primary text-on-primary hover:opacity-90'
                    : 'border-[1.5px] border-primary text-primary hover:bg-primary/5'
                }`}
              >
                Empezar
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-secondary/80 font-body-md text-xs text-center mt-4 max-w-[560px] mx-auto">
        El Market es un módulo que activas o apagas desde tu panel — no hace falta registrarte de nuevo.
        ¿Quieres una tienda con diseño a medida? La armamos contigo: plan más una puesta en marcha que conversamos según lo que necesites.
      </p>
    </section>
  );
}
