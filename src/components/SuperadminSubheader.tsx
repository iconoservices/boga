import Link from 'next/link';

// Cabecera compartida de las subrutas de /superadmin que se fueron sacando del
// page.tsx gigante (facturacion, mapa, modulos, choferes, revista…).

export default function SuperadminSubheader({ title, icon }: { title: string; icon: string }) {
  return (
    <header className="border-b border-[#c2c6d6] bg-white">
      <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center gap-2">
        <Link href="/superadmin" className="text-[#424754] hover:text-[#0058be] text-xs font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Superadmin
        </Link>
        <span className="text-[#c2c6d6]">/</span>
        <span className="material-symbols-outlined text-[18px] text-[#424754]">{icon}</span>
        <span className="text-sm font-bold text-[#191b23]">{title}</span>
      </div>
    </header>
  );
}
