'use client';

import { useEffect, useState } from 'react';

// Instalar BogaHub como app (PWA). El estado vive a nivel de módulo, no de
// componente: `beforeinstallprompt` se dispara UNA sola vez al cargar la web, y el
// AppHeader (donde está el botón) se vuelve a montar en cada página; si cada
// montaje escuchara por su cuenta, después de navegar el navegador ya no lo
// repetiría y el botón caería siempre en las instrucciones manuales.

type Estado = { prompt: any; instalada: boolean };
let estado: Estado = { prompt: null, instalada: false };
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

// Solo cuenta como instalada ESTA app, no "estamos dentro de alguna PWA": si estás
// dentro de la app de una tienda, BogaHub sigue sin instalarse y el botón tiene que
// aparecer. En iOS no existe `appinstalled`, así que si está en standalone se
// asume que es esta.
const revisarInstalada = () => {
  try {
    return localStorage.getItem('boga_pwa_installed') === 'true' || !!(window.navigator as any).standalone;
  } catch {
    return !!(window.navigator as any).standalone;
  }
};

if (typeof window !== 'undefined') {
  estado = { ...estado, instalada: revisarInstalada() };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    estado = { ...estado, prompt: e };
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('boga_pwa_installed', 'true'); } catch { /* sin storage */ }
    estado = { prompt: null, instalada: true };
    avisar();
  });
}

function instalar() {
  if (estado.prompt) {
    const p = estado.prompt;
    p.prompt();
    p.userChoice.then(() => { estado = { ...estado, prompt: null }; avisar(); });
    return;
  }

  // Ya estamos dentro de OTRA app instalada (la de una tienda, por ejemplo): el
  // navegador no ofrece instalar una segunda PWA desde acá adentro. Hay que sacar
  // el link afuera.
  const yaEnStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (yaEnStandalone) {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).catch(() => {});
    if (navigator.share) {
      navigator.share({ title: 'BogaHub', text: 'Instala la app de BogaHub', url }).catch(() => {});
    } else {
      alert(`Para instalar BogaHub como app aparte, abre este link en tu navegador (Chrome o Safari), no desde aquí adentro. Se copió el link:\n\n${url}`);
    }
    return;
  }

  const ua = navigator.userAgent.toLowerCase();
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (/iphone|ipad|ipod/.test(ua) && isSafari) {
    alert('Para instalar:\n\n1. Toca el icono Compartir (📤) abajo\n2. Desliza y toca "Agregar a pantalla de inicio"\n3. Toca "Agregar"');
  } else {
    alert('Para instalar:\n\n1. Abre el menú del navegador (⋯)\n2. Busca "Agregar a pantalla de inicio"\n3. Confirma la instalación');
  }
}

/** `mostrar` es false una vez instalada (o mientras no se sabe, para no parpadear). */
export function useInstalarBoga() {
  const [, forzar] = useState(0);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const f = () => forzar((n) => n + 1);
    oyentes.add(f);
    setListo(true);
    return () => { oyentes.delete(f); };
  }, []);
  return { mostrar: listo && !estado.instalada, instalar };
}
