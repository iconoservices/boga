import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import PrintButton from '@/components/PrintButton';
import {
  DOCS, getDoc, docHref, EMPRESA, EMPRESA_INCOMPLETA,
  type Bloque, type Seccion,
} from '@/lib/legal';

// Un documento legal en su propia URL (/legal/<slug>). Server Component:
// contenido estático desde src/lib/legal.ts, prerender en build.
//
// Esta vista es SIEMPRE la de cara al usuario: limpia, sin notas internas.
// El estado de cada documento y qué falta revisar vive en /superadmin/legal.
// noindex mientras el documento no esté "vigente" (invisible para el usuario).

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: 'Documento no encontrado' };
  const url = docHref(slug);
  const indexable = doc.estado === 'vigente';
  return {
    title: doc.titulo,
    description: doc.resumen,
    alternates: { canonical: url },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'article', title: doc.titulo, description: doc.resumen, url },
  };
}

// Los placeholders [[...]] que quedan en la vista pública son solo datos de la
// empresa sin completar. Se muestran discretos (no en amarillo de alarma); el
// aviso de "documento en preparación" arriba de la página explica el porqué.
function Texto({ children }: { children: string }) {
  const partes = children.split(/(\[\[[^\]]+\]\])/g);
  return (
    <>
      {partes.map((p, i) =>
        /^\[\[[^\]]+\]\]$/.test(p) ? (
          <span key={i} className="text-secondary underline decoration-dotted underline-offset-2">
            {p.replace(/^\[\[|\]\]$/g, '')}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function BloqueView({ b }: { b: Bloque }) {
  if (b.tipo === 'sub') {
    return <h4 className="mt-5 font-headline-sm text-[14px] font-bold text-on-surface"><Texto>{b.texto}</Texto></h4>;
  }
  if (b.tipo === 'lista') {
    return (
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
        {b.items.map((it, i) => (
          <li key={i} className="font-body-lg text-[15px] leading-[1.7] text-on-surface/90"><Texto>{it}</Texto></li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mt-3 font-body-lg text-[15px] leading-[1.7] text-on-surface/90"><Texto>{b.texto}</Texto></p>
  );
}

function SeccionView({ s }: { s: Seccion }) {
  return (
    <section id={`s-${s.n}`} className="mt-8 scroll-mt-24">
      <h3 className="font-headline-lg text-lg font-extrabold tracking-tight text-on-surface">
        {s.n}. {s.titulo}
      </h3>
      {s.bloques.map((b, i) => (
        <BloqueView key={i} b={b} />
      ))}
    </section>
  );
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />
      <main className="mx-auto w-full max-w-[760px] px-container-margin pb-20 pt-6 lg:px-8">
        <Link
          href="/legal"
          className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary transition-colors hover:text-on-surface print:hidden"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Términos y Políticas
        </Link>

        <p className="mt-5 font-label-md text-[11px] text-secondary">
          Última actualización: {doc.actualizado}
        </p>
        <h1 className="mt-1 font-headline-lg text-3xl font-extrabold tracking-tight text-on-surface lg:text-[38px]">
          {doc.titulo}
        </h1>
        <p className="mt-3 font-body-lg text-base leading-relaxed text-on-surface/70">{doc.resumen}</p>
        <p className="mt-2 font-label-md text-[12px] italic text-secondary">Aplica a: {doc.aplicaA}</p>

        {EMPRESA_INCOMPLETA && (
          <p className="mt-4 rounded-md bg-surface-container-low px-3 py-2 font-body-md text-[12px] leading-relaxed text-secondary">
            Documento en preparación: algunos datos de la empresa (razón social, RUC, domicilio)
            todavía se están completando.
          </p>
        )}

        <div className="mt-4 print:hidden">
          <PrintButton />
        </div>

        <nav className="mt-8 rounded-md bg-surface-container-low p-4">
          <p className="font-label-md text-[11px] font-bold uppercase tracking-wider text-secondary">Contenido</p>
          <ol className="mt-2 flex flex-col gap-1">
            {doc.secciones.map((s) => (
              <li key={s.n}>
                <a href={`#s-${s.n}`} className="font-body-md text-[13px] text-on-surface/80 hover:text-on-surface hover:underline">
                  {s.n}. {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-4">
          {doc.secciones.map((s) => (
            <SeccionView key={s.n} s={s} />
          ))}
        </article>

        <hr className="mt-12 border-on-surface/15" />
        <p className="mt-4 font-body-md text-[12px] leading-relaxed text-secondary">
          {EMPRESA.razonSocial} · RUC {EMPRESA.ruc} · {EMPRESA.domicilio}. Contacto: {EMPRESA.email}.
        </p>
        <p className="mt-2 font-body-md text-[12px] text-secondary">
          Ver todos los documentos en{' '}
          <Link href="/legal" className="underline hover:text-on-surface">Términos y Políticas</Link>.
        </p>
      </main>
    </>
  );
}
