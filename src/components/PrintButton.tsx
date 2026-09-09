'use client';

// Botón "Imprimir / Guardar PDF": usa el diálogo de impresión del navegador,
// que ya permite "Guardar como PDF". Sin librerías.
export default function PrintButton({ label = 'Imprimir / Guardar PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full border border-surface-container-highest px-4 py-2 font-label-md text-[12px] uppercase tracking-wider text-secondary transition-colors hover:text-on-surface print:hidden"
    >
      <span className="material-symbols-outlined text-[16px]">print</span>
      {label}
    </button>
  );
}
