"use client";

import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchAlquileres, type Aviso, type TipoAviso } from '@/lib/alquileres';
import { fetchVentas, type AvisoVenta, type TipoVenta } from '@/lib/ventas';

// Inmuebles = hub unificado de bienes raíces en Pucallpa: alquileres (cuartos,
// mini-dptos, casas, pensiones) y ventas (terrenos, lotes, casas, chacras).
// Los alquileres vienen de `rental_listings` vía /api/inmuebles, las ventas
// de `sale_listings` vía /api/ventas. Ambas caen al seed hardcodeado
// mientras su tabla esté vacía.

type Modo = 'alquiler' | 'venta';
type Tipo = TipoAviso;

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
  const [ventas, setVentas] = useState<AvisoVenta[]>([]);
  const [cargado, setCargado] = useState(false);
  const [ventaAbierta, setVentaAbierta] = useState<AvisoVenta | null>(null);

  useEffect(() => {
    // Solo avisos reales (sin ejemplos): si no hay ninguno, se muestra un aviso.
    Promise.all([fetchAlquileres(), fetchVentas()]).then(([alq, vta]) => {
      setAvisos(alq);
      setVentas(vta);
      setCargado(true);
    });
  }, []);

  const listaAlq = filtroAlq === 'Todos' ? avisos : avisos.filter((a) => a.tipo === filtroAlq);
  const listaVta = filtroVta === 'Todos' ? ventas : ventas.filter((v) => v.tipo === filtroVta);

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1200px] mx-auto px-container-margin lg:px-6 w-full pt-5 flex flex-col gap-6 pb-14">

        {/* Encabezado + Pestañas en una fila */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-4 border-b border-surface-container-high pb-0">
          <div className="flex flex-col gap-1 lg:pb-2.5">
            <h1 className="font-headline-lg font-extrabold tracking-tight text-on-surface text-lg sm:text-xl lg:text-2xl leading-tight">Inmuebles 🏠</h1>
            <p className="font-body-md text-secondary text-xs">
              <span className="lg:hidden">Dónde vivir e invertir en Pucallpa.</span>
              <span className="hidden lg:inline">Encuentra dónde vivir o invierte en terrenos, casas y lotes en Pucallpa.</span>
            </p>
          </div>
          <div className="flex gap-0 lg:shrink-0">
            <button
              onClick={() => setModo('alquiler')}
              className={`flex-1 lg:flex-none px-5 py-2.5 font-headline-sm text-sm transition-all relative ${
                modo === 'alquiler' ? 'text-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">bed</span>
                En Alquiler
              </span>
              {modo === 'alquiler' && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => setModo('venta')}
              className={`flex-1 lg:flex-none px-5 py-2.5 font-headline-sm text-sm transition-all relative ${
                modo === 'venta' ? 'text-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
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
            ? 'Hola BogaHub, quiero publicar un alquiler (habitación / mini-dpto / casa / pensión).'
            : 'Hola BogaHub, quiero publicar un inmueble en venta (terreno / lote / casa / chacra).'
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
              {cargado && listaAlq.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-dashed border-surface-container-highest p-8 text-center">
                  <span className="material-symbols-outlined text-secondary/40 text-[32px]">bed</span>
                  <p className="font-headline-sm text-sm text-on-surface mt-2">Todavía no hay avisos de alquiler publicados</p>
                  <p className="text-secondary font-body-md text-xs mt-1">Publica el tuyo gratis con el botón de arriba.</p>
                </div>
              )}
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
                        href={waLink(a.wsp, `Hola, vi tu aviso "${a.titulo}" (${a.zona}) en Inmuebles de BogaHub. ¿Sigue disponible?`)}
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
              {cargado && listaVta.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-dashed border-surface-container-highest p-8 text-center">
                  <span className="material-symbols-outlined text-secondary/40 text-[32px]">sell</span>
                  <p className="font-headline-sm text-sm text-on-surface mt-2">Todavía no hay avisos de venta publicados</p>
                  <p className="text-secondary font-body-md text-xs mt-1">Publica el tuyo gratis con el botón de arriba.</p>
                </div>
              )}
              {listaVta.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setVentaAbierta(v)}
                  className="bg-white rounded-2xl overflow-hidden shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest flex flex-col cursor-pointer active:scale-[0.98] transition-transform"
                >
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
                        href={waLink(v.wsp, `Hola, vi tu aviso "${v.titulo}" (${v.zona}) en Inmuebles de BogaHub. ¿Sigue disponible?`)}
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

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-2">
          BogaHub solo conecta. Visita el lugar antes de pagar cualquier adelanto y no transfieras dinero sin ver el contrato o título.
        </p>
      </main>

      {/* Ficha ampliada del aviso de alquiler */}
      {avisoAbierto && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAvisoAbierto(null)}
        >
          <div
            className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl min-h-[92dvh] sm:min-h-0 max-h-[98dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] sm:aspect-[4/3] bg-surface-container-low">
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
                  href={waLink(avisoAbierto.wsp, `Hola, vi tu aviso "${avisoAbierto.titulo}" (${avisoAbierto.zona}) en Inmuebles de BogaHub. ¿Sigue disponible?`)}
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

      {/* Ficha ampliada del aviso de venta */}
      {ventaAbierta && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setVentaAbierta(null)}
        >
          <div
            className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl min-h-[92dvh] sm:min-h-0 max-h-[98dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/10] sm:aspect-[4/3] bg-surface-container-low">
              <img referrerPolicy="no-referrer" src={ventaAbierta.img} alt={ventaAbierta.titulo} className="w-full h-full object-cover" />
              <button
                onClick={() => setVentaAbierta(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <span className="absolute top-3 left-3 bg-white text-primary text-[10px] font-label-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[13px]">straighten</span>{ventaAbierta.area}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <span className="w-fit bg-primary-fixed text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full uppercase tracking-wider">{ventaAbierta.tipo}</span>
              <h3 className="font-headline-lg text-xl text-on-surface leading-tight">{ventaAbierta.titulo}</h3>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(ventaAbierta.zona + ', Pucallpa')}`}
                target="_blank"
                rel="noreferrer"
                className="text-secondary font-label-md text-[13px] flex items-center gap-1.5 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {ventaAbierta.zona}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
              {ventaAbierta.extras.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ventaAbierta.extras.map((x) => (
                    <span key={x} className="bg-surface-container-low text-secondary text-[10px] font-label-md px-2 py-0.5 rounded-full border border-surface-container-highest">{x}</span>
                  ))}
                </div>
              )}
              {ventaAbierta.descripcion && (
                <p className="text-on-surface font-body-md text-sm leading-relaxed border-t border-surface-container pt-3">
                  {ventaAbierta.descripcion}
                </p>
              )}
              <div className="flex items-center justify-between border-t border-surface-container pt-3 mt-1">
                <div className="flex flex-col">
                  <span className="font-price-lg text-primary text-lg leading-none">
                    {ventaAbierta.moneda === 'USD' ? 'US$ ' : 'S/ '}{ventaAbierta.precio.toLocaleString('es-PE')}
                  </span>
                  <span className="text-secondary font-label-md text-[10px] mt-0.5">precio de venta</span>
                </div>
                <a
                  href={waLink(ventaAbierta.wsp, `Hola, vi tu aviso "${ventaAbierta.titulo}" (${ventaAbierta.zona}) en Inmuebles de BogaHub. ¿Sigue disponible?`)}
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
