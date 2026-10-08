'use client';

// Paquetes ya no administra nada por su cuenta: los planes que se venden en /negocios, sus precios, ofertas,
// el catálogo de módulos, los paquetes de carga y el WhatsApp de contacto se editan en Cobros → Precios.
// Esta página queda como aviso para quien llegue por un enlace o favorito viejo.

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';

export default function PaquetesAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/paquetes');
  }, [cargando, esSuperadmin, router]);

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <SuperadminSubheader title="Paquetes" icon="inventory_2" />
      <main className="max-w-[640px] mx-auto px-4 py-10">
        <div className="bg-white border border-[#c2c6d6] rounded-lg p-6 flex flex-col gap-3">
          <span className="material-symbols-outlined text-[28px] text-[#0058be]">sell</span>
          <h2 className="text-lg font-bold text-[#191b23]">Los paquetes ahora se editan en Cobros → Precios</h2>
          <p className="text-sm text-[#424754]">
            Ahí están los planes que se venden en <b>/negocios</b> (precio, oferta, «Recomendado», qué incluye), los módulos con sus precios,
            los paquetes de carga de productos y el WhatsApp de contacto. Lo que cambies se ve en la landing.
          </p>
          <Link href="/superadmin/cobros?vista=precios" className="self-start mt-1 h-10 px-5 bg-[#0058be] text-white font-bold text-sm rounded-md inline-flex items-center hover:bg-[#004395]">
            Ir a Precios
          </Link>
        </div>
      </main>
    </div>
  );
}
