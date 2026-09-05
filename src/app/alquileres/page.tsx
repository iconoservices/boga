"use client";

import React, { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';

// Alquileres = espacio para arriendos mensuales en Pucallpa: habitaciones,
// mini-departamentos, casas y pensiones (con comidas). Directorio curado a
// mano; el contacto sale por WhatsApp directo. Sin pagos dentro de la app.

type Tipo = 'Habitación' | 'Mini-dpto' | 'Casa' | 'Pensión';

const FILTROS: (Tipo | 'Todos')[] = ['Todos', 'Habitación', 'Mini-dpto', 'Casa', 'Pensión'];

const ICONO: Record<Tipo, string> = {
  'Habitación': 'bed',
  'Mini-dpto': 'apartment',
  'Casa': 'home',
  'Pensión': 'dining',
};

type Aviso = {
  id: string;
  tipo: Tipo;
  titulo: string;
  zona: string;
  precio: number;      // soles / mes
  extras: string[];
  incluyeServicios?: boolean;
  incluyeComidas?: boolean;
  verificado?: boolean;
  wsp: string;
  img: string;
};

const AVISOS: Aviso[] = [
  { id: 'a1', tipo: 'Habitación', titulo: 'Habitación amoblada con baño propio', zona: 'Callería', precio: 450, extras: ['Baño propio', 'Amoblada', 'Wifi'], incluyeServicios: true, verificado: true, wsp: '51963000001', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80' },
  { id: 'a2', tipo: 'Mini-dpto', titulo: 'Mini-departamento para 1–2 personas', zona: 'Yarinacocha', precio: 800, extras: ['Cocina', 'Amoblado', 'Agua incluida'], verificado: true, wsp: '51963000002', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80' },
  { id: 'a3', tipo: 'Pensión', titulo: 'Pensión familiar · cuarto + 3 comidas', zona: 'Centro', precio: 950, extras: ['Desayuno', 'Almuerzo', 'Cena', 'Lavandería'], incluyeComidas: true, verificado: true, wsp: '51963000003', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80' },
  { id: 'a4', tipo: 'Casa', titulo: 'Casa de 3 dormitorios en Manantay', zona: 'Manantay', precio: 1500, extras: ['3 dorm.', 'Cochera', 'Patio'], wsp: '51963000004', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80' },
  { id: 'a5', tipo: 'Habitación', titulo: 'Cuarto económico para estudiante', zona: 'Cerca a la UNU', precio: 300, extras: ['Baño compartido', 'Wifi', 'Solo damas'], incluyeServicios: true, wsp: '51963000005', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80' },
  { id: 'a6', tipo: 'Mini-dpto', titulo: 'Departamento nuevo, 2do piso', zona: 'Bellavista', precio: 1100, extras: ['2 dorm.', 'Balcón', 'Sin amoblar'], verificado: true, wsp: '51963000006', img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80' },
  { id: 'a7', tipo: 'Pensión', titulo: 'Pensión solo almuerzos (sin cuarto)', zona: 'Centro', precio: 320, extras: ['Almuerzo L–S', 'Menú variado', 'Delivery'], incluyeComidas: true, wsp: '51963000007', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80' },
  { id: 'a8', tipo: 'Casa', titulo: 'Casa amoblada para familia', zona: 'Yarinacocha', precio: 1800, extras: ['Amoblada', '4 dorm.', 'Jardín'], verificado: true, wsp: '51963000008', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80' },
];

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function Alquileres() {
  const { cartCount, setIsCartOpen } = useCart();
  const [filtro, setFiltro] = useState<Tipo | 'Todos'>('Todos');

  const lista = filtro === 'Todos' ? AVISOS : AVISOS.filter((a) => a.tipo === filtro);

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
                <img src={a.img} alt={a.titulo} className="w-full h-full object-cover" />
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
                    <span className="font-price-lg text-primary text-base leading-none">S/ {a.precio.toLocaleString('es-PE')}</span>
                    <span className="text-secondary font-label-md text-[10px] mt-0.5">
                      al mes{a.incluyeComidas ? ' · con comidas' : a.incluyeServicios ? ' · servicios incl.' : ''}
                    </span>
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
