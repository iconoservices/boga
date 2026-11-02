'use client';

import React, { useState, useEffect } from 'react';

interface AficheModalProps {
  imgSrc: string;
  altText: string;
}

export default function AficheModal({ imgSrc, altText }: AficheModalProps) {
  const [abierto, setAbierto] = useState(false);

  // Cerrar con Escape y bloquear scroll del fondo cuando el modal esté abierto
  useEffect(() => {
    if (!abierto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto]);

  return (
    <>
      {/* Contenedor de la foto en la tarjeta: al tocarla se abre el visor */}
      <div
        onClick={() => setAbierto(true)}
        className="relative rounded-xl overflow-hidden bg-surface-container-low border border-surface-container-highest group cursor-pointer select-none active:scale-[0.99] transition-transform"
        role="button"
        tabIndex={0}
        aria-label="Tocar para ver afiche completo"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setAbierto(true);
          }
        }}
      >
        <div className="w-full flex items-center justify-center bg-zinc-950/5 min-h-[220px] sm:min-h-[360px] max-h-[460px]">
          <img
            src={imgSrc}
            alt={altText}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain max-h-[460px] group-hover:scale-[1.01] transition-transform duration-200"
          />
        </div>

        {/* Botón flotante para ver afiche completo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAbierto(true);
          }}
          className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-black/90 text-white text-xs font-label-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-sm transition-all shadow-md active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">fullscreen</span>
          Ver afiche completo
        </button>
      </div>

      {/* Modal / Lightbox estilo Marketplace in-app */}
      {abierto && (
        <div
          className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setAbierto(false)}
        >
          {/* Botón flotante cerrar en esquina superior derecha */}
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
            aria-label="Cerrar visor de afiche"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>

          {/* Imagen ampliada centrada */}
          <div
            className="relative max-w-[96vw] max-h-[92vh] flex items-center justify-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imgSrc}
              alt={altText}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
            />
          </div>

          {/* Barra inferior informativa */}
          <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
            <span className="bg-black/60 text-white/90 text-[11px] font-medium px-3.5 py-1 rounded-full backdrop-blur-md shadow-sm">
              Toca afuera o pulsa (✕) para cerrar
            </span>
          </div>
        </div>
      )}
    </>
  );
}

