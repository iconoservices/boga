import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import PrintButton from '@/components/PrintButton';
import {
  DOCS, getDoc, docHref, ESTADO_META, EMPRESA,
  type Bloque, type Seccion,
} from '@/lib/legal';

// Un documento legal en su propia URL (/legal/<slug>). Server Component:
// contenido estático desde src/lib/legal.ts, prerender en build.
// noindex mientras el documento no esté "vigente".

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

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

// Resalta los placeholders [[...]] para que salten a la vista en el borrador.
function Texto({ children }: { children: string }) {
  const partes = children.split(/(\[\[[^\]]+\]\])/g);
  return (
    <>
      {partes.map((p, i) =>
        /^\[\[[^\]]+\]\]$/.test(p) ? (
          <mark key={i} className="rounded bg-[#fff3bf] px-1 text-[#8a5a00]">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function BloqueView({ b }: { b: Bloque }) {
  if (b.tipo === 'sub') {
    return (
      <h4 className="mt-5 font-headline-sm text-[14px] font-bold text-on-surface">
        <Texto>{b.texto}</Texto>
      </h4>
    );
  }
  if (b.tipo === 'lista') {
    return (
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
        {b.items.map((it, i) => (
          <li key={i} className="font-body-lg text-[15px] leading-[1.7] text-on-surface/90">
            <Texto>{it}</Texto>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mt-3 font-body-lg text-[15px] leading-[1.7] text-on-surface/90">
      <Texto>{b.texto}</Texto>
    </p>
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

  const m = ESTADO_META[doc.estado];

  return (
    <>
      <AppHeader showSearch={false} showLocation={false} showChat={false} showCart={false} />
      <main className="mx-auto w-full max-w-[760px] px-container-margin pb-20 pt-6 lg:px-8">
        <Link
          href="/legal"
          className="flex items-center gap-1.5 font-label-md text-[12px] uppercase tracking-wider text-secondary transition-colors hover:text-on-surface print:hidden"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Centro Legal
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span
            className="inline-block rounded-full px-2 py-0.5 font-label-md text-[10px] uppercase tracking-wider"
            style={{ color: m.color, backgroundColor: m.bg }}
          >
            {m.label}
          </span>
          <span className="font-label-md text-[11px] text-secondary">
            v{doc.version} · actualizado {doc.actualizado}
          </span>
        </div>

        <h1 className="mt-2 font-headline-lg text-3xl font-extrabold tracking-tight text-on-surface lg:text-[38px]">
          {doc.titulo}
        </h1>
        <p className="mt-3 font-body-lg text-base leading-relaxed text-on-surface/70">{doc.resumen}</p>
        <p className="mt-2 font-label-md text-[12px] text-secondary">Aplica a: {doc.aplicaA}</p>

        {/* Banner de estado: qué le falta y por qué. Se oculta al imprimir solo
            si el doc ya está vigente; en borrador conviene que salga en el PDF. */}
        {doc.estado !== 'vigente' && (
          <div
            className="mt-6 rounded-md border p-4"
            style={{ borderColor: `${m.color}40`, backgroundColor: `${m.bg}80` }}
          >
            <p className="font-label-md text-[11px] font-bold uppercase tracking-wider" style={{ color: m.color }}>
              Estado: {m.label} — revisar antes de publicar
            </p>
            <p className="mt-1.5 font-body-md text-[13px] leading-relaxed text-on-surface/85">
              {doc.revisionNota}
            </p>
            {doc.pendientes && doc.pendientes.length > 0 && (
              <>
                <p className="mt-3 font-label-md text-[11px] font-bold uppercase tracking-wider text-on-surface/70">
                  Boga tiene que definir / completar:
                </p>
                <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
                  {doc.pendientes.map((p, i) => (
                    <li key={i} className="font-body-md text-[13px] leading-snug text-on-surface/85">
                      {p}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="mt-4 print:hidden">
          <PrintButton />
        </div>

        {/* Índice de la norma */}
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
          {EMPRESA.razonSocial} · RUC {EMPRESA.ruc} · {EMPRESA.domicilio}. Contacto legal: {EMPRESA.email}.
        </p>
        <p className="mt-2 font-body-md text-[12px] text-secondary">
          Ver todos los documentos en el{' '}
          <Link href="/legal" className="underline hover:text-on-surface">
            Centro Legal
          </Link>
          .
        </p>
      </main>
    </>
  );
}
