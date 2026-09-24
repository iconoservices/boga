'use client';

import { usePathname } from 'next/navigation';
import { esRutaHub } from '@/lib/rutasHub';

// El botón de compartir sale en las pantallas de BogaHub (lib/rutasHub.ts); fuera de ellas (admin,
// superadmin, login…) no va. Instalar no está acá: vive en la cabecera (AppHeader), junto a notificaciones.

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

  if (!esRutaHub(pathname)) return null;
  // Leyendo una nota de la Revista tampoco: pantalla limpia.
  if (pathname?.startsWith('/revista/')) return null;

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
