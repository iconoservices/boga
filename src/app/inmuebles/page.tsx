"use client";

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchAlquileres, type Aviso, type TipoAviso } from '@/lib/alquileres';

// Inmuebles = hub unificado de bienes raíces en Pucallpa: alquileres (cuartos,
// mini-dptos, casas, pensiones) y ventas (terrenos, lotes, casas, chacras).
// Los alquileres vienen de la tabla `rental_listings` vía /api/inmuebles.
// La pestaña "En Venta" es de muestra hasta que se cree la tabla correspondiente.

type Modo = 'alquiler' | 'venta';
type Tipo = TipoAviso;
type TipoVenta = 'Terreno' | 'Lote' | 'Casa' | 'Chacra';

const FILTROS_ALQUILER: (Tipo | 'Todos')[] = ['Todos', 'Habitación', 'Mini-dpto', 'Casa', 'Pensión'];
const FILTROS_VENTA: (TipoVenta | 'Todos')[] = ['Todos', 'Terreno', 'Lote', 'Casa', 'Chacra'];

const ICONO_ALQUILER: Record<Tipo, string> = {
  'Habitación': 'bed',
  'Mini-dpto': 'apartment',
  'Casa': 'home',
  'Pensión': 'dining',
};

const ICONO_VENTA: Record<TipoVenta, string> = {
  'Terreno': 'landscape',
  'Lote': 'grid_view',
  'Casa': 'home',
  'Chacra': 'agriculture',
};

// Data de muestra para la pestaña "En Venta" — hasta que haya tabla en Supabase.
type AvisoVenta = {
  id: string;
  tipo: TipoVenta;
  titulo: string;
  zona: string;
  precio: number;
  moneda: 'PEN' | 'USD';
  area: string;
  extras: string[];
  wsp: string;
  img: string;
};

const VENTAS_SEED: AvisoVenta[] = [
  {
    id: 'v1', tipo: 'Terreno', titulo: 'Terreno 200 m² con título de propiedad',
    zona: 'Campo Verde', precio: 45000, moneda: 'PEN', area: '200 m²',
    extras: ['Título saneado', 'Acceso asfaltado'], wsp: '51963000000',
    img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
  },
  {
    id: 'v2', tipo: 'Casa', titulo: 'Casa de 2 pisos — 3 dormitorios, cochera',
    zona: 'Yarinacocha', precio: 38000, moneda: 'USD', area: '180 m²',
    extras: ['Agua y luz', 'Cochera', 'Jardín'], wsp: '51963000000',
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
  },
  {
    id: 'v3', tipo: 'Lote', titulo: 'Lote esquinero 150 m² en urbanización nueva',
    zona: 'Manantay', precio: 28000, moneda: 'PEN', area: '150 m²',
    extras: ['Urbanización cerrada', 'Servicios habilitados'], wsp: '51963000000',
    img: 'https://images.unsplash.com/photo-1625602812206-5ec545ca1231?w=600&q=80',
  },
  {
    id: 'v4', tipo: 'Chacra', titulo: 'Chacra de 5 hectáreas con plantación de cacao',
    zona: 'Irazola', precio: 120000, moneda: 'PEN', area: '5 ha',
    extras: ['Cacao en producción', 'Casa de madera', 'Agua de pozo'], wsp: '51963000000',
    img: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80',
  },
  {
    id: 'v5', tipo: 'Terreno', titulo: 'Terreno 400 m² a 5 min de la carretera',
    zona: 'Callería', precio: 60000, moneda: 'PEN', area: '400 m²',
    extras: ['Título de propiedad', 'Plano catastral'], wsp: '51963000000',
    img: 'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&q=80',
  },
  {
    id: 'v6', tipo: 'Casa', titulo: 'Mini-casa prefabricada lista para habitar',
    zona: 'Centro', precio: 15000, moneda: 'USD', area: '60 m²',
    extras: ['Amoblada', 'Baño propio'], wsp: '51963000000',
    img: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&q=80',
  },
];

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export default function Inmuebles() {
  const { cartCount, setIsCartOpen } = useCart();
  const [modo, setModo] = useState<Modo>('alquiler');
  const [filtroAlq, setFiltroAlq] = useState<Tipo | 'Todos'>('Todos');
  const [filtroVta, setFiltroVta] = useState<TipoVenta | 'Todos'>('Todos');
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [avisoAbierto, setAvisoAbierto] = useState<Aviso | null>(null);

  useEffect(() => {
    fetchAlquileres().then((rows) => {
      if (rows.length > 0) setAvisos(rows);
    });
  }, []);

  const listaAlq = filtroAlq === 'Todos' ? avisos : avisos.filter((a) => a.tipo === filtroAlq);
  const listaVta = filtroVta === 'Todos' ? VENTAS_SEED : VENTAS_SEED.filter((v) => v.tipo === filtroVta);

  return (
    <>
      <AppHeader showSearch cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} placeholder="Busca por zona o tipo…" />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-14">

        {/* Encabezado + Pestañas en una fila */}
        <div className="flex items-end justify-between gap-4 border-b border-surface-container-high pb-0">
          <div className="flex flex-col gap-0.5 pb-2.5">
            <h1 className="font-headline-lg text-on-surface">Inmuebles 🏠</h1>
            <p className="text-secondary font-body-md text-sm">Encuentra dónde vivir o invierte en terrenos, casas y lotes en Pucallpa.</p>
          </div>
          <div className="flex gap-0 shrink-0">
            <button
              onClick={() => setModo('alquiler')}
              className={`px-5 py-2.5 font-headline-sm text-sm transition-all relative ${
                modo === 'alquiler' ? 'text-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">bed</span>
                En Alquiler
              </span>
              {modo === 'alquiler' && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => setModo('venta')}
              className={`px-5 py-2.5 font-headline-sm text-sm transition-all relative ${
                modo === 'venta' ? 'text-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">sell</span>
                En Venta
              </span>
              {modo === 'venta' && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-primary rounded-full" />}
            </button>
          </div>
        </div>

        {/* CTA publicar */}
        <a
          href={waLink('51963000000', modo === 'alquiler'
            ? 'Hola Boga, quiero publicar un alquiler (habitación / mini-dpto / casa / pensión).'
            : 'Hola Boga, quiero publicar un inmueble en venta (terreno / lote / casa / chacra).'
          )}
          target="_blank"
          rel="noreferrer"
          className="relative overflow-hidden rounded-2xl bg-inverse-surface text-inverse-on-surface p-4 flex items-center gap-3 group"
        >
          <div className="absolute -right-8 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-inverse-primary text-[22px]">
              {modo === 'alquiler' ? 'add_home' : 'add_business'}
            </span>
          </div>
          <div className="relative flex flex-col min-w-0 flex-1">
            <span className="font-headline-sm text-sm leading-tight">
              {modo === 'alquiler' ? '¿Tienes un cuarto o depa libre?' : '¿Vendes terreno, casa o lote?'}
            </span>
            <span className="text-inverse-on-surface/70 font-body-md text-xs mt-0.5">Publícalo gratis y recibe interesados por WhatsApp</span>
          </div>
          <span className="material-symbols-outlined text-inverse-on-surface/60 shrink-0 group-hover:translate-x-1 transition-transform">chevron_right</span>
        </a>

        {/* ──── MODO ALQUILER ──── */}
        {modo === 'alquiler' && (
          <>
            {/* Filtros por tipo */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
              {FILTROS_ALQUILER.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroAlq(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                    filtroAlq === f
                      ? 'bg-primary text-white border border-primary shadow-md'
                      : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
                  }`}
                >
                  {f !== 'Todos' && <span className="material-symbols-outlined text-[15px]">{ICONO_ALQUILER[f as Tipo]}</span>}
                  {f}
                </button>
              ))}
            </div>

            {/* Grilla de avisos de alquiler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listaAlq.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setAvisoAbierto(a)}
                  className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="relative h-40 overflow-hidden bg-surface-container-low">
                    <img referrerPolicy="no-referrer" src={a.img} alt={a.titulo} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">{ICONO_ALQUILER[a.tipo]}</span>{a.tipo}
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
                        href={waLink(a.wsp, `Hola, vi tu aviso "${a.titulo}" (${a.zona}) en Inmuebles de Boga. ¿Sigue disponible?`)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
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
          </>
        )}

        {/* ──── MODO VENTA ──── */}
        {modo === 'venta' && (
          <>
            {/* Filtros por tipo */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
              {FILTROS_VENTA.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroVta(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                    filtroVta === f
                      ? 'bg-primary text-white border border-primary shadow-md'
                      : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
                  }`}
                >
                  {f !== 'Todos' && <span className="material-symbols-outlined text-[15px]">{ICONO_VENTA[f as TipoVenta]}</span>}
                  {f}
                </button>
              ))}
            </div>

            {/* Grilla de avisos de venta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listaVta.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col">
                  <div className="relative h-40 overflow-hidden bg-surface-container-low">
                    <img referrerPolicy="no-referrer" src={v.img} alt={v.titulo} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">{ICONO_VENTA[v.tipo]}</span>{v.tipo}
                    </span>
                    <span className="absolute top-2 right-2 bg-white text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-[12px]">straighten</span>{v.area}
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <h4 className="font-headline-sm text-sm text-on-surface line-clamp-2">{v.titulo}</h4>
                    <span className="text-secondary font-label-md text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>{v.zona}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {v.extras.slice(0, 3).map((x) => (
                        <span key={x} className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{x}</span>
                      ))}
                    </div>
                    <div className="flex items-end justify-between border-t border-surface-container pt-2.5 mt-auto">
                      <div className="flex flex-col">
                        <span className="font-price-lg text-primary text-base leading-none">
                          {v.moneda === 'USD' ? 'US$ ' : 'S/ '}{v.precio.toLocaleString('es-PE')}
                        </span>
                        <span className="text-secondary font-label-md text-[10px] mt-0.5">precio de venta</span>
                      </div>
                      <a
                        href={waLink(v.wsp, `Hola, vi tu aviso "${v.titulo}" (${v.zona}) en Inmuebles de Boga. ¿Sigue disponible?`)}
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
          </>
        )}

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          Boga solo conecta. Visita el lugar antes de pagar cualquier adelanto y no transfieras dinero sin ver el contrato o título.
        </p>
      </main>

      {/* Ficha ampliada del aviso de alquiler */}
      {avisoAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAvisoAbierto(null)}
        >
          <div
            className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] bg-surface-container-low">
              <img referrerPolicy="no-referrer" src={avisoAbierto.img} alt={avisoAbierto.titulo} className="w-full h-full object-cover" />
              <button
                onClick={() => setAvisoAbierto(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              {avisoAbierto.verificado && (
                <span className="absolute top-3 left-3 bg-white text-primary text-[10px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>Verificado
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col gap-3">
              <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{avisoAbierto.tipo}</span>
              <h3 className="font-headline-lg text-xl text-on-surface leading-tight">{avisoAbierto.titulo}</h3>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(avisoAbierto.zona + ', Pucallpa')}`}
                target="_blank"
                rel="noreferrer"
                className="text-secondary font-label-md text-[13px] flex items-center gap-1.5 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {avisoAbierto.zona}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
              {avisoAbierto.extras.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {avisoAbierto.extras.map((x) => (
                    <span key={x} className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{x}</span>
                  ))}
                </div>
              )}
              {avisoAbierto.descripcion && (
                <p className="text-on-surface font-body-md text-sm leading-relaxed border-t border-surface-container pt-3">
                  {avisoAbierto.descripcion}
                </p>
              )}
              <div className="flex items-center justify-between border-t border-surface-container pt-3 mt-1">
                <div className="flex flex-col">
                  {avisoAbierto.precio > 0 ? (
                    <>
                      <span className="font-price-lg text-primary text-lg leading-none">S/ {avisoAbierto.precio.toLocaleString('es-PE')}</span>
                      <span className="text-secondary font-label-md text-[10px] mt-0.5">
                        al mes{avisoAbierto.incluyeComidas ? ' · con comidas' : avisoAbierto.incluyeServicios ? ' · servicios incl.' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="font-price-lg text-primary text-base leading-none">Consultar precio</span>
                  )}
                </div>
                <a
                  href={waLink(avisoAbierto.wsp, `Hola, vi tu aviso "${avisoAbierto.titulo}" (${avisoAbierto.zona}) en Inmuebles de Boga. ¿Sigue disponible?`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 bg-[#25D366] text-white font-label-md text-sm px-4 py-2.5 rounded-full active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  Contactar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
