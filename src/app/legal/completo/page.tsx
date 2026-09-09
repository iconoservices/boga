import type { Metadata } from 'next';
import Link from 'next/link';
import PrintButton from '@/components/PrintButton';
import {
  DOCS, TIPO_META, EMPRESA, FECHA_BORRADOR,
  type Bloque,
} from '@/lib/legal';

// Documento único para clientes: TODO el Centro Legal concatenado y LIMPIO
// (sin las notas internas de revisión), pensado para leer o "Guardar como PDF".
// Es la versión web de docs/legal/boga-terminos-CLIENTES.md.
// Mientras el contenido no esté aprobado por abogado, va noindex.

const TODOS_VIGENTES = DOCS.every((d) => d.estado === 'vigente');

export const metadata: Metadata = {
  title: 'Términos, Políticas y Anexos',
  description: 'Todos los términos, políticas y anexos de Boga en un solo documento.',
  alternates: { canonical: '/legal/completo' },
  robots: TODOS_VIGENTES ? { index: true, follow: true } : { index: false, follow: false },
};

function Texto({ children }: { children: string }) {
  const partes = children.split(/(\[\[[^\]]+\]\])/g);
  return (
    <>
      {partes.map((p, i) =>
        /^\[\[[^\]]+\]\]$/.test(p) ? (
          <mark key={i} className="rounded bg-[#fff3bf] px-1 text-[#8a5a00]">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function BloqueView({ b }: { b: Bloque }) {
  if (b.tipo === 'sub') return <h4 className="mt-4 font-headline-sm text-[13px] font-bold text-on-surface"><Texto>{b.texto}</Texto></h4>;
  if (b.tipo === 'lista')
    return (
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
        {b.items.map((it, i) => (
          <li key={i} className="font-body-lg text-[14px] leading-[1.65] text-on-surface/90"><Texto>{it}</Texto></li>
        ))}
      </ul>
    );
  return <p className="mt-2 font-body-lg text-[14px] leading-[1.65] text-on-surface/90"><Texto>{b.texto}</Texto></p>;
}

export default function LegalCompleto() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-container-margin pb-20 pt-8 lg:px-8">
      <div className="print:hidden">
        <Link href="/legal" className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary hover:text-on-surface">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Centro Legal
        </Link>
      </div>

      <h1 className="mt-4 font-headline-lg text-3xl font-extrabold tracking-tight text-on-surface">
        Términos, Políticas y Anexos de Boga
      </h1>
      <p className="mt-2 font-body-md text-[13px] text-secondary">
        Última actualización: {FECHA_BORRADOR}.
      </p>
      <p className="mt-2 font-body-md text-[13px] text-secondary">
        {EMPRESA.razonSocial} · RUC {EMPRESA.ruc} · {EMPRESA.domicilio} · {EMPRESA.email}
      </p>

      <div className="mt-4 print:hidden">
        <PrintButton />
      </div>

      {/* Índice */}
      <ol className="mt-8 flex list-decimal flex-col gap-1 pl-5">
        {DOCS.map((d) => (
          <li key={d.slug} className="font-body-md text-[13px] text-on-surface/80">
            {d.titulo}
          </li>
        ))}
      </ol>

      {DOCS.map((d, idx) => (
        <section key={d.slug} className="mt-12 break-before-page">
          <h2 className="font-headline-lg text-2xl font-extrabold tracking-tight text-on-surface">
            {idx + 1}. {d.titulo}
          </h2>
          <p className="mt-1 font-label-md text-[11px] uppercase tracking-wider text-secondary">
            {TIPO_META[d.tipo].label}
          </p>
          <p className="mt-1 font-body-md text-[12px] italic text-secondary">Aplica a: {d.aplicaA}</p>

          {d.secciones.map((s) => (
            <div key={s.n} className="mt-5">
              <h3 className="font-headline-sm text-[15px] font-bold text-on-surface">
                {s.n}. {s.titulo}
              </h3>
              {s.bloques.map((b, i) => (
                <BloqueView key={i} b={b} />
              ))}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
