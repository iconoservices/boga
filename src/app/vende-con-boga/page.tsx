'use client';

// La landing B2B se unificó en /negocios; el formulario vive en
// /negocios/registro. Esta ruta se mantiene viva (buen slug para compartir /
// anuncios) y redirige directo al formulario.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VendeConBogaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/negocios/registro');
  }, [router]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
      Redirigiendo…
    </div>
  );
}
