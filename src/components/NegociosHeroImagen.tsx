'use client';

import { useEffect, useState } from 'react';
import { fetchBanners } from '@/lib/catalogo';

// Flyer oficial subido para /negocios
const FLYER_SUBIDO = 'https://fotos.bogahub.app/store-assets/market-banners/1790086291626-2g58vg.webp';

export default function NegociosHeroImagen() {
  const [src, setSrc] = useState(FLYER_SUBIDO);
  useEffect(() => {
    fetchBanners('negocios').then(({ banners }) => {
      if (banners[0]?.image) setSrc(banners[0].image);
    });
  }, []);
  return (
    <img 
      src={src} 
      alt="Tu negocio en una sola plataforma - Boga Market" 
      className="w-full h-auto block object-contain" 
    />
  );
}
