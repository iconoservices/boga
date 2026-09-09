import type { Metadata } from 'next';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { docsPorTipo, docHref, ESTADO_META, EMPRESA, DOCS, type DocLegal } from '@/lib/legal';

// Índice del Centro Legal de Boga. Lista todos los documentos agrupados por tipo,
// con su estado (borrador / revisión interna / requiere abogado / vigente).
//
// Mientras haya documentos sin abogado, TODO /legal va con noindex: es material
// de trabajo, no la versión pública final.

const HAY_NO_VIGENTES = DOCS.some((d) => d.estado !== 'vigente');

export const metadata: Metadata = {
  title: 'Centro Legal',
  description:
    'Términos y Condiciones, Política de Privacidad, Cookies, Libro de Reclamaciones y anexos por servicio de Boga.',
  alternates: { canonical: '/legal' },
  robots: HAY_NO_VIGENTES ? { index: false, follow: false } : { index: true, follow: true },
};

function EstadoPill({ d }: { d: DocLegal }) {
  const m = ESTADO_META[d.estado];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 font-label-md text-[10px] uppercase tracking-wider"
      style={{ color: m.color, backgroundColor: m.bg }}
    >
      {m.label}
    </span>
  );
}

export default function LegalIndex() {
  const grupos = docsPorTipo();
  const total = DOCS.length;
  const vigentes = DOCS.filter((d) => d.estado === 'vigente').length;

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />
      <main className="mx-auto w-full max-w-[860px] px-container-margin pb-20 pt-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary transition-colors hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver a Boga
        </Link>

        <h1 className="mt-5 font-headline-lg text-3xl font-extrabold tracking-tight text-on-surface lg:text-[40px]">
          Centro Legal
        </h1>
        <p className="mt-3 font-body-lg text-base leading-relaxed text-on-surface/70">
          Los términos que rigen el uso de Boga. Hay un documento principal para toda la app, políticas
          transversales y un anexo por cada servicio. Si un anexo dice algo distinto al documento
          principal, para ese servicio manda el anexo.
        </p>

        {/* Aviso de trabajo en progreso — se quita cuando todo esté "vigente". */}
        {HAY_NO_VIGENTES && (
          <div className="mt-6 rounded-md border border-[#f0c000]/40 bg-[#fdf6e3] p-4">
            <p className="font-label-md text-[11px] font-bold uppercase tracking-wider text-[#8a5a00]">
              Borrador — no vigente
            </p>
            <p className="mt-1 font-body-md text-[13px] leading-relaxed text-on-surface/80">
              {vigentes} de {total} documentos están aprobados. El resto es texto redactado por Boga
              que todavía tiene que revisar un abogado peruano. Cada documento explica arriba qué le
              falta y por qué. Datos entre <code className="rounded bg-black/5 px-1">[[corchetes]]</code>{' '}
              (razón social {EMPRESA.razonSocial}, RUC, domicilio, plazos) son lo que Boga tiene que
              completar.
            </p>
          </div>
        )}

        <div className="mt-4">
          <Link
            href="/legal/completo"
            className="inline-flex items-center gap-2 rounded-full border border-surface-container-highest px-4 py-2 font-label-md text-[12px] uppercase tracking-wider text-secondary transition-colors hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            Ver / guardar todo en un documento
          </Link>
        </div>

        {grupos.map(
          (g) =>
            g.docs.length > 0 && (
              <section key={g.tipo} className="mt-10">
                <h2 className="border-b border-on-surface/15 pb-2 font-headline-lg text-lg font-extrabold tracking-tight text-on-surface">
                  {g.label}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {g.docs.map((d) => (
                    <li key={d.slug}>
                      <Link
                        href={docHref(d.slug)}
                        className="group flex flex-col gap-1.5 rounded-md border border-surface-container-high p-4 transition-colors hover:border-on-surface/30"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-headline-sm text-[15px] font-bold text-on-surface group-hover:underline">
                            {d.titulo}
                          </span>
                          <EstadoPill d={d} />
                        </div>
                        <p className="font-body-md text-[13px] leading-snug text-on-surface/70">
                          {d.resumen}
                        </p>
                        <p className="font-label-md text-[11px] text-secondary">
                          Aplica a: {d.aplicaA}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}

        <p className="mt-12 font-body-md text-[12px] leading-relaxed text-secondary">
          ¿Dudas sobre estos términos? Escribí a {EMPRESA.email}. Para temas de datos personales,{' '}
          <Link href="/legal/privacidad" className="underline hover:text-on-surface">
            Política de Privacidad
          </Link>
          .
        </p>
      </main>
    </>
  );
}
