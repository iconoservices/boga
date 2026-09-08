'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `facturacion`).
// Placeholder — la facturación real se maneja junto con los planes de Paquetes.

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';

export default function FacturacionPage() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/facturacion');
  }, [cargando, esSuperadmin, router]);

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Facturación" icon="payments" />
      <main className="max-w-[900px] mx-auto px-4 py-8">
        <div className="bg-white rounded-md border border-[#c2c6d6] flex flex-col items-center justify-center py-16 px-4 gap-4">
          <div className="w-14 h-14 bg-[#d5e0f8] rounded-lg flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-3xl text-[#0058be]">payments</span>
          </div>
          <div className="text-center max-w-[320px]">
            <h2 className="text-sm font-bold text-[#191b23]">Módulo de Facturación</h2>
            <p className="text-[#424754] text-xs font-semibold mt-2 leading-relaxed">
              Las pasarelas de pago y las facturas se asocian directamente con los planes
              administrados en la pestaña de{' '}
              <Link href="/superadmin" className="text-[#0058be] hover:underline font-bold">Paquetes</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
