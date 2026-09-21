'use client';

import { usePathname } from 'next/navigation';

// Rutas del lado consumidor de BogaHub donde sale el botón de compartir (las mismas
// del riel lateral del layout). Fuera de estas (admin, superadmin, login…) no va.
// Instalar ya no está acá: vive en la cabecera (AppHeader), junto a notificaciones.
const RUTAS = ['/market', '/pension', '/trabajos', '/taxi-seguro', '/inmuebles', '/viajes', '/eventos', '/sorteos', '/mostrador', '/pandero', '/revista', '/guia'];

export default function HomeFloatingActions() {
  const pathname = usePathname();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title || 'BogaHub',
        text: 'Descubre Pucallpa en BogaHub',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Enlace copiado ✅');
    }
  };

  if (!pathname || !(pathname === '/' || RUTAS.some((r) => pathname.startsWith(r)))) return null;

  // Pegado a la esquina, justo debajo de la cabecera (móvil ~64 px, escritorio ~56 px + barra de secciones).
  return (
    <div className="fixed top-[72px] lg:top-[104px] right-2 z-40">
      <button
        onClick={handleShare}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/60 text-on-surface shadow-lg active:scale-90 hover:bg-white/80 transition-all"
        title="Compartir"
        aria-label="Compartir"
      >
        <span className="material-symbols-outlined text-[20px]">share</span>
      </button>
    </div>
  );
}
