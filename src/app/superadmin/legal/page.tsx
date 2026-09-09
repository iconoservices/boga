'use client';

// Panel interno del Centro Legal — SOLO superadmin. Acá ves el estado real de
// cada documento (borrador / revisión interna / requiere abogado / vigente),
// por qué necesita revisión y qué falta completar. Lo de cara al usuario vive
// en /legal (limpio, sin nada de esto).

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import { DOCS, ESTADO_META, TIPO_META, EMPRESA, docHref } from '@/lib/legal';

function contarPlaceholders(): number {
  let n = 0;
  for (const d of DOCS) {
    for (const s of d.secciones) {
      for (const b of s.bloques) {
        const txt = b.tipo === 'lista' ? b.items.join(' ') : b.texto;
        n += (txt.match(/\[\[[^\]]+\]\]/g) || []).length;
      }
    }
  }
  return n + 6; // + los de EMPRESA
}

export default function SuperadminLegal() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  React.useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/legal');
  }, [cargando, esSuperadmin, router]);

  if (cargando) return <div className="p-10 text-center text-sm text-[#6b7280]">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const vigentes = DOCS.filter((d) => d.estado === 'vigente').length;
  const abogado = DOCS.filter((d) => d.estado === 'requiere-abogado');

  return (
    <>
      <SuperadminSubheader title="Legal — control interno" icon="gavel" />
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <div className="rounded-lg border border-[#f0c000]/40 bg-[#fdf6e3] p-4">
          <p className="text-sm font-bold text-[#8a5a00]">
            {vigentes} de {DOCS.length} documentos vigentes · {contarPlaceholders()} datos{' '}
            <code className="rounded bg-black/5 px-1">[[ ]]</code> sin completar
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#5c4a1a]">
            Nada se publica como "vigente" sin que lo revise un abogado peruano.
            Completá primero los <code className="rounded bg-black/5 px-1">[[placeholders]]</code> en{' '}
            <code className="rounded bg-black/5 px-1">src/lib/legal.ts</code> (empresa:{' '}
            {EMPRESA.razonSocial}, RUC, domicilio, correos).
          </p>
          {abogado.length > 0 && (
            <p className="mt-2 text-[13px] text-[#5c4a1a]">
              <strong>Prioridad de abogado:</strong> {abogado.map((d) => d.titulo.replace('Anexo · ', '')).join(' → ')}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/legal" className="rounded-lg bg-[#e6e7f2] px-3 py-1.5 text-xs font-bold text-[#424754]">
            Ver como usuario (/legal)
          </Link>
          <Link href="/legal/completo" className="rounded-lg bg-[#e6e7f2] px-3 py-1.5 text-xs font-bold text-[#424754]">
            Documento único para clientes
          </Link>
        </div>

        <ul className="mt-6 flex flex-col gap-4">
          {DOCS.map((d, i) => {
            const m = ESTADO_META[d.estado];
            return (
              <li key={d.slug} className="rounded-lg border border-[#c2c6d6] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#191b23]">{i + 1}. {d.titulo}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{ color: m.color, backgroundColor: m.bg }}
                  >
                    {m.label}
                  </span>
                  <span className="text-[11px] text-[#6b7280]">{TIPO_META[d.tipo].label}</span>
                  <Link href={docHref(d.slug)} className="ml-auto text-[11px] font-semibold text-[#2170e4] hover:underline">
                    abrir →
                  </Link>
                </div>

                <p className="mt-2 text-[13px] leading-relaxed text-[#424754]">
                  <strong>Por qué necesita revisión:</strong> {d.revisionNota}
                </p>

                {d.pendientes && d.pendientes.length > 0 && (
                  <>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                      Falta definir / completar
                    </p>
                    <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5">
                      {d.pendientes.map((p, j) => (
                        <li key={j} className="text-[13px] text-[#424754]">{p}</li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-[12px] text-[#6b7280]">
          Documentos para descargar: <code>docs/legal/boga-legal-INTERNO.md</code> (este contenido) y{' '}
          <code>docs/legal/boga-terminos-CLIENTES.md</code> (limpio). Regenerar con{' '}
          <code>node scripts/gen-legal-md.mts</code>.
        </p>
      </div>
    </>
  );
}
