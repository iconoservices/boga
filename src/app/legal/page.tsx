import type { Metadata } from 'next';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { docsPorTipo, docHref, EMPRESA, DOCS } from '@/lib/legal';

// Índice de Términos y Políticas — vista de cara al usuario, limpia.
// El panel interno (estados, qué falta revisar) está en /superadmin/legal.
// noindex mientras algún documento no esté 'vigente'.

const TODOS_VIGENTES = DOCS.every((d) => d.estado === 'vigente');

export const metadata: Metadata = {
  title: 'Términos y Políticas',
  description:
    'Términos y Condiciones, Política de Privacidad, Cookies, Libro de Reclamaciones y anexos por servicio de Boga.',
  alternates: { canonical: '/legal' },
  robots: TODOS_VIGENTES ? { index: true, follow: true } : { index: false, follow: false },
};

export default function LegalIndex() {
  const grupos = docsPorTipo();

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
          Términos y Políticas
        </h1>
        <p className="mt-3 font-body-lg text-base leading-relaxed text-on-surface/70">
          Las reglas que rigen el uso de Boga. Hay un documento principal para toda la app, políticas
          transversales y un anexo por cada servicio. Si un anexo dice algo distinto al documento
          principal, para ese servicio manda el anexo.
        </p>

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
                        <span className="font-headline-sm text-[15px] font-bold text-on-surface group-hover:underline">
                          {d.titulo}
                        </span>
                        <p className="font-body-md text-[13px] leading-snug text-on-surface/70">
                          {d.resumen}
                        </p>
                        <p className="font-label-md text-[11px] text-secondary">Aplica a: {d.aplicaA}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}

        <p className="mt-12 font-body-md text-[12px] leading-relaxed text-secondary">
          ¿Dudas? Escribí a {EMPRESA.email}. Para dejar un reclamo formal,{' '}
          <Link href="/libro-de-reclamaciones" className="underline hover:text-on-surface">
            Libro de Reclamaciones
          </Link>
          .
        </p>
      </main>
    </>
  );
}
