'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useInstalarBoga, navegadorIPhone } from '@/lib/useInstalarBoga';
import { RUTAS_HUB } from '@/lib/rutasHub';

/**
 * Tarjeta «Agregar BogaHub a tu pantalla principal» que sale al entrar a la web desde el navegador.
 *
 * Reglas: solo en pantallas de BogaHub (nunca dentro de una tienda, el panel ni el login), solo si se
 * puede instalar (Chrome/Android con el aviso del navegador listo, o Safari de iPhone con instrucciones),
 * nunca si BogaHub ya está instalada ni si ya se abrió como app. Sale a los pocos segundos y, se instale
 * o no, no vuelve a salir hasta pasados unos días. En iPhone no hay instalación con un toque: se muestran
 * los dos pasos en la misma tarjeta.
 *
 * Convive con la invitación a los avisos (AvisosBogaPrompt): mientras esta tarjeta está abierta esa no sale.
 */

const LLAVE = 'boga_instalar_aviso';
const ESPERA_DIAS = 3;
const ESPERA_INICIAL_MS = 3_000;
const RUTAS = new Set(['', 'explore', 'promotions', ...RUTAS_HUB.map((r) => r.slice(1))]);

// Solo cambia el texto: en laptop (Chrome/Edge) y en Android se instala directo con el botón; solo el iPhone lleva pasos.
const esMovil = () => typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

const enModoApp = () =>
  typeof window !== 'undefined' &&
  (!!(window.navigator as unknown as { standalone?: boolean }).standalone || window.matchMedia('(display-mode: standalone)').matches);


export default function InstalarBogaPrompt() {
  const pathname = usePathname();
  const { mostrar, puede, instalar } = useInstalarBoga();
  const [visible, setVisible] = useState(false);

  const permitida = RUTAS.has((pathname || '').split('/')[1] || '');
  const elegible = permitida && mostrar && puede;

  useEffect(() => {
    if (!elegible || enModoApp()) { setVisible(false); return; }
    try { if (Date.now() < Number(localStorage.getItem(LLAVE) || 0)) return; } catch { /* sin almacenamiento */ }
    const timer = setTimeout(() => {
      // Se anota al mostrarla (no al cerrarla): sale una sola vez por período aunque la ignoren.
      try { localStorage.setItem(LLAVE, String(Date.now() + ESPERA_DIAS * 86_400_000)); } catch { /* sin almacenamiento */ }
      setVisible(true);
    }, ESPERA_INICIAL_MS);
    return () => clearTimeout(timer);
  }, [elegible]);

  // Avisa a la invitación de avisos que no debe salir encima mientras esta tarjeta está abierta.
  const abierta = visible && elegible;
  useEffect(() => {
    if (abierta) document.documentElement.dataset.instalarBoga = '1';
    else delete document.documentElement.dataset.instalarBoga;
    return () => { delete document.documentElement.dataset.instalarBoga; };
  }, [abierta]);

  if (!abierta) return null;

  // En iPhone no hay instalación con un toque: los pasos se muestran de una vez y no hay botón «Agregar».
  const navIPhone = navegadorIPhone();
  const enIPhone = navIPhone !== null;
  const enCelular = esMovil();
  const cerrar = () => setVisible(false);
  const agregar = () => { instalar(); cerrar(); };

  // iPhone: tarjeta centrada con los pasos (no hay instalación con un toque). Android y laptop: hoja compacta pegada
  // abajo (en laptop, tarjeta al centro) con título a la izquierda y los dos botones, que instala directo.
  return (
    <div
      className={`fixed inset-0 z-[70] flex justify-center bg-black/45 ${enIPhone ? 'items-end md:items-center p-3 pb-[92px] md:pb-3' : 'items-end md:items-center md:p-3'}`}
      onClick={cerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Instalar BogaHub"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full bg-[#fff6f4] border border-primary/15 shadow-[0_12px_40px_rgba(0,0,0,0.28)] ${
          enIPhone ? 'max-w-[440px] rounded-3xl px-5 pt-6 pb-5 text-center' : 'max-w-none md:max-w-[520px] rounded-t-3xl md:rounded-3xl px-5 pt-5 pb-5 text-left'
        }`}
      >
        <button
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-black/5"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {enIPhone && <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-2xl mx-auto shadow-sm border border-primary/10" />}
        <h2 className={`font-headline-sm font-extrabold text-on-surface leading-tight ${enIPhone ? 'text-xl mt-3 px-4' : 'text-lg pr-8'}`}>
          {enCelular ? 'Agregar BogaHub a tu pantalla principal' : 'Instalar BogaHub en tu computadora'}
        </h2>
        <p className="text-sm text-secondary mt-2 leading-relaxed">
          {enCelular
            ? 'Accede más rápido a tiendas, pedidos, taxi y la agenda de Pucallpa instalando BogaHub en tu dispositivo.'
            : 'Ábrela como una app en su propia ventana, sin buscarla en el navegador: tiendas, taxi seguro, agenda y sorteos de Pucallpa.'}
        </p>

        {enIPhone && (
          <ol className="text-sm text-on-surface text-left mt-4 leading-relaxed list-decimal pl-9 pr-4 py-3.5 space-y-2 rounded-2xl bg-black/[0.04]">
            {navIPhone === 'chrome'
              ? <li>Toca el ícono <b>Compartir</b> (el cuadrado con la flecha) arriba, junto a la dirección.</li>
              : <li>Toca el ícono <b>Compartir</b> (el cuadrado con la flecha) abajo en Safari.</li>}
            <li>Desliza y toca <b>«Agregar a pantalla de inicio»</b>.</li>
            <li>Toca <b>Agregar</b>. ¡Listo!</li>
          </ol>
        )}

        <div className={`flex gap-2 mt-5 ${enIPhone ? '' : 'justify-end'}`}>
          {enIPhone ? (
            <button onClick={cerrar} className="w-full rounded-full border-2 border-primary/50 ring-4 ring-primary/10 bg-white text-on-surface font-bold text-base px-5 py-3 active:scale-95 transition-transform">
              Ahora no
            </button>
          ) : (
            <>
              <button onClick={cerrar} className="rounded-full border-2 border-primary/50 ring-4 ring-primary/10 bg-white text-on-surface font-bold text-sm px-4 py-2.5 whitespace-nowrap shrink-0 active:scale-95 transition-transform">
                Ahora no
              </button>
              <button onClick={agregar} className="rounded-full bg-primary text-on-primary font-bold text-[13px] sm:text-sm px-3.5 sm:px-5 py-2.5 flex flex-1 sm:flex-none items-center justify-center gap-1.5 active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[18px]">download</span>
                {enCelular ? 'Agregar a pantalla principal' : 'Instalar BogaHub'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
