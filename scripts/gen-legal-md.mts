// Genera el Centro Legal de Boga como Markdown. Fuente única: src/lib/legal.ts.
// Salen DOS archivos:
//   docs/legal/boga-legal-INTERNO.md    — con notas de revisión y pendientes (para vos / el abogado)
//   docs/legal/boga-terminos-CLIENTES.md — limpio, sin notas internas (para publicar / mostrar a clientes)
//
// Uso:  node scripts/gen-legal-md.ts
// Node 24 corre TypeScript directo (type stripping), no hace falta compilar.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS, ESTADO_META, TIPO_META, EMPRESA, FECHA_BORRADOR, type DocLegal } from '../src/lib/legal.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs', 'legal');

function seccionesDe(d: DocLegal, L: string[], w: (s?: string) => void) {
  for (const s of d.secciones) {
    w(`### ${s.n}. ${s.titulo}`);
    w();
    for (const b of s.bloques) {
      if (b.tipo === 'p') { w(b.texto); w(); }
      else if (b.tipo === 'sub') { w(`**${b.texto}**`); w(); }
      else { b.items.forEach((it) => w(`- ${it}`)); w(); }
    }
  }
}

// --- 1. Versión INTERNA (con revisión + pendientes) ----------------------
function interno(): string {
  const L: string[] = [];
  const w = (s = '') => L.push(s);

  w('# Boga · Centro Legal — BORRADOR INTERNO (para revisión)');
  w();
  w(`_Generado el ${FECHA_BORRADOR}. Texto redactado por Boga, no por un abogado. Este archivo lleva las notas de revisión y lo que falta; el que se muestra a clientes es \`boga-terminos-CLIENTES.md\`._`);
  w();
  w(`**Empresa:** ${EMPRESA.razonSocial} · RUC ${EMPRESA.ruc} · ${EMPRESA.domicilio}`);
  w(`**Contacto legal:** ${EMPRESA.email} · **Datos personales:** ${EMPRESA.emailPrivacidad}`);
  w();
  w('> Los textos entre `[[corchetes]]` son datos o decisiones que Boga tiene que completar.');
  w();
  w('## Estado de cada documento');
  w();
  w('| # | Documento | Tipo | Estado |');
  w('|---|-----------|------|--------|');
  DOCS.forEach((d, i) => w(`| ${i + 1} | ${d.titulo} | ${TIPO_META[d.tipo].label} | ${ESTADO_META[d.estado].label} |`));
  w();
  w('---');
  w();
  DOCS.forEach((d, idx) => {
    w(`## ${idx + 1}. ${d.titulo}`);
    w();
    w(`- **Tipo:** ${TIPO_META[d.tipo].label}  ·  **Estado:** ${ESTADO_META[d.estado].label}  ·  **v${d.version}** (${d.actualizado})`);
    w(`- **Aplica a:** ${d.aplicaA}`);
    w();
    w(`> **Revisión — ${ESTADO_META[d.estado].label}:** ${d.revisionNota}`);
    w();
    if (d.pendientes?.length) {
      w('> **Boga tiene que definir / completar:**');
      d.pendientes.forEach((p) => w(`> - ${p}`));
      w();
    }
    seccionesDe(d, L, w);
    w('---');
    w();
  });
  w('_Regenerar con `node scripts/gen-legal-md.ts` cada vez que cambie `src/lib/legal.ts`._');
  w();
  return L.join('\n');
}

// --- 2. Versión CLIENTES (limpia) --------------------------------------
function clientes(): string {
  const L: string[] = [];
  const w = (s = '') => L.push(s);

  w('# Boga · Términos, Políticas y Anexos');
  w();
  w(`_Última actualización: ${FECHA_BORRADOR}._`);
  w();
  w(`${EMPRESA.razonSocial} · RUC ${EMPRESA.ruc} · ${EMPRESA.domicilio} · ${EMPRESA.email}`);
  w();
  w('## Contenido');
  DOCS.forEach((d, i) => w(`${i + 1}. ${d.titulo}`));
  w();
  w('---');
  w();
  DOCS.forEach((d, idx) => {
    w(`## ${idx + 1}. ${d.titulo}`);
    w();
    w(`_Aplica a: ${d.aplicaA}_`);
    w();
    seccionesDe(d, L, w);
    w('---');
    w();
  });
  return L.join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });
const a = join(OUT_DIR, 'boga-legal-INTERNO.md');
const b = join(OUT_DIR, 'boga-terminos-CLIENTES.md');
writeFileSync(a, interno(), 'utf8');
writeFileSync(b, clientes(), 'utf8');
console.log(`OK -> ${a}`);
console.log(`OK -> ${b}`);
console.log(`(${DOCS.length} documentos)`);
