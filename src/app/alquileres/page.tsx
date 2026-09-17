"use client";

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchAlquileres, type Aviso, type TipoAviso } from '@/lib/alquileres';

// Alquileres = espacio para arriendos mensuales en Pucallpa: habitaciones,
// mini-departamentos, casas y pensiones (con comidas). Directorio administrable
// desde /superadmin/alquileres (tabla `rental_listings`). Contacto por
// WhatsApp directo, sin pagos dentro de la app.

type Tipo = TipoAviso;

const FILTROS: (Tipo | 'Todos')[] = ['Todos', 'Habitación', 'Mini-dpto', 'Casa', 'Pensión'];

const ICONO: Record<Tipo, string> = {
  'Habitación': 'bed',
  'Mini-dpto': 'apartment',
  'Casa': 'home',
  'Pensión': 'dining',
};

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function Alquileres() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Tipo | 'Todos'>('Todos');
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    fetchAlquileres().then((rows) => {
      if (rows.length > 0) setAvisos(rows);
    });
  }, []);

  const lista = filtro === 'Todos' ? avisos : avisos.filter((a) => a.tipo === filtro);

  return (
    <>
      <AppHeader showSearch cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} placeholder="Busca por zona o tipo…" />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-14">

        {/* Encabezado */}
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Alquileres 🛏️</h1>
          <p className="text-secondary font-body-md text-sm">Cuartos, mini-departamentos, casas y pensiones por mes en Pucallpa.</p>
        </div>

        {/* CTA publicar */}
        <a
          href={waLink('51963000000', 'Hola Boga, quiero publicar un alquiler (habitación / mini-dpto / casa / pensión).')}
          target="_blank"
          rel="noreferrer"
          className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface p-4 flex items-center gap-3 group"
        >
          <div className="absolute -right-8 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-inverse-primary text-[22px]">add_home</span>
          </div>
          <div className="relative flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-sm leading-tight">¿Tienes un cuarto o depa libre?</span>
            <span className="text-inverse-on-surface/70 font-body-md text-xs mt-0.5">Publícalo gratis y recibe interesados por WhatsApp</span>
          </div>
          <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
        </a>

        {/* Filtros por tipo */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                filtro === f
                  ? 'bg-primary text-white border border-primary shadow-md'
                  : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
              }`}
            >
              {f !== 'Todos' && <span className="material-symbols-outlined text-[15px]">{ICONO[f as Tipo]}</span>}
              {f}
            </button>
          ))}
        </div>

        {/* Grilla de avisos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
              <div className="relative h-40 overflow-hidden bg-surface-container-low">
                <img referrerPolicy="no-referrer" src={a.img} alt={a.titulo} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">{ICONO[a.tipo]}</span>{a.tipo}
                </span>
                {a.verificado && (
                  <span className="absolute top-2 right-2 bg-white text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>Verificado
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2">{a.titulo}</h4>
                <span className="text-secondary font-label-md text-[11px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>{a.zona}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {a.extras.slice(0, 3).map((x) => (
                    <span key={x} className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{x}</span>
                  ))}
                </div>
                <div className="flex items-end justify-between border-t border-surface-container pt-2.5 mt-auto">
                  <div className="flex flex-col">
                    {a.precio > 0 ? (
                      <>
                        <span className="font-price-lg text-primary text-base leading-none">S/ {a.precio.toLocaleString('es-PE')}</span>
                        <span className="text-secondary font-label-md text-[10px] mt-0.5">
                          al mes{a.incluyeComidas ? ' · con comidas' : a.incluyeServicios ? ' · servicios incl.' : ''}
                        </span>
                      </>
                    ) : (
                      <span className="font-price-lg text-primary text-sm leading-none">Consultar precio</span>
                    )}
                  </div>
                  <a
                    href={waLink(a.wsp, `Hola, vi tu aviso "${a.titulo}" (${a.zona}) en Alquileres de Boga. ¿Sigue disponible?`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-label-md px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    Contactar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Boga solo conecta. Visita el lugar antes de pagar cualquier adelanto y no transfieras dinero sin ver el contrato.
        </p>
      </main>
    </>
  );
}
