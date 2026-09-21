'use client';

import { useEffect, useState } from 'react';
import { fetchBanners } from '@/lib/catalogo';

// Foto de portada de /negocios. Se cambia desde superadmin (Banners → pestaña
// "Foto de /negocios"; se usa la primera activa). Mientras carga, o si no hay
// ninguna cargada, queda la foto de siempre.
const FOTO_DEFECTO = 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=900&q=80';

export default function NegociosHeroImagen() {
  const [src, setSrc] = useState(FOTO_DEFECTO);
  useEffect(() => {
    fetchBanners('negocios').then(({ banners }) => {
      if (banners[0]?.image) setSrc(banners[0].image);
    });
  }, []);
  return <img src={src} alt="Negocio local usando BogaHub" className="w-full h-full object-cover" />;
}
