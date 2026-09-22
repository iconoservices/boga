// Ficha de UN aviso de empleo, en su propia URL (/trabajos/<slug>). Server
// Component, separado de /trabajos (que sigue siendo del lado del cliente, sin
// tocarse): esto NO cambia nada de la lista, solo agrega una página aparte por
// aviso para que Google pueda indexarlos uno por uno y, con el JSON-LD de
// JobPosting, puedan salir en la sección de empleos de Google (Google for Jobs).
//
// Revalida cada 5 min, igual que /api/chamba (misma fuente de datos).

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { getEmpleoPorSlug, getEmpleosActivos } from '@/lib/chamba.data';
import { slugEmpleo, haceCuanto, fechaAviso } from '@/lib/chamba';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bogahub.app';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const empleos = await getEmpleosActivos();
  return empleos.map((e) => ({ slug: slugEmpleo(e) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEmpleoPorSlug(slug);
  if (!e) return { title: 'Aviso no encontrado' };
  const titulo = `${e.puesto}${e.negocio ? ` · ${e.negocio}` : ''}`;
  const desc = e.descripcion?.slice(0, 160) || `${e.puesto} en ${e.negocio || 'Pucallpa'}. ${e.tipo || ''} · ${e.pago || 'Pago a convenir'}.`;
  return {
    title: titulo,
    description: desc,
    alternates: { canonical: `/trabajos/${slug}` },
    openGraph: { type: 'website', locale: 'es_PE', url: `/trabajos/${slug}`, siteName: 'BogaHub', title: `${titulo} · BogaHub`, description: desc },
    twitter: { card: 'summary', title: `${titulo} · BogaHub`, description: desc },
  };
}

// "Tiempo completo" / "Medio tiempo" / "Por día"… -> el enum que pide el schema.org
// de JobPosting. Texto libre en la base, así que se mapea por coincidencia parcial;
// si no calza con ninguno, se omite el campo antes que declarar uno incorrecto.
function tipoEmpleoSchema(tipo?: string): string | undefined {
  const t = (tipo || '').toLowerCase();
  if (!t) return undefined;
  if (t.includes('completo')) return 'FULL_TIME';
  if (t.includes('medio')) return 'PART_TIME';
  if (t.includes('practica') || t.includes('práctica')) return 'INTERN';
  if (t.includes('temporal') || t.includes('eventual')) return 'TEMPORARY';
  if (t.includes('por día') || t.includes('por dia') || t.includes('destajo')) return 'PER_DIEM';
  if (t.includes('freelance') || t.includes('independiente') || t.includes('contrato')) return 'CONTRACTOR';
  return 'OTHER';
}

// Intenta extraer un monto numérico del campo libre "pago" (ej. "S/1,500",
// "S/.1500 + horas extras", "1200 mensual"). Devuelve el objeto baseSalary de
// schema.org si lo consigue, o undefined si no hay número claro.
function parsearSalario(pago?: string): Record<string, any> | undefined {
  if (!pago) return undefined;
  // Buscar el primer número (con posibles comas/puntos de miles)
  const m = pago.replace(/\./g, '').match(/(\d[\d,]*)/); // "S/1,500" → "1,500"
  if (!m) return undefined;
  const valor = Number(m[1].replace(/,/g, ''));
  if (!valor || valor < 100) return undefined; // descartar números pequeños ("2 personas", etc.)
  // Detectar periodicidad
  const t = pago.toLowerCase();
  let unidad = 'MONTH';
  if (t.includes('diario') || t.includes('por día') || t.includes('por dia') || t.includes('al día')) unidad = 'DAY';
  else if (t.includes('semanal') || t.includes('por semana')) unidad = 'WEEK';
  else if (t.includes('hora') || t.includes('/h')) unidad = 'HOUR';
  return {
    '@type': 'MonetaryAmount',
    currency: 'PEN',
    value: { '@type': 'QuantitativeValue', value: valor, unitText: unidad },
  };
}

// validThrough: la fecha de expiración del aviso. Si la BD tiene `expira_el`,
// la usa; si no, calcula datePosted + 60 días como fallback (Google penaliza
// avisos sin fecha de vencimiento).
function calcValidThrough(expiraEl?: string, fechaPublicado?: string): string | undefined {
  if (expiraEl && expiraEl.length >= 10) return expiraEl;
  if (!fechaPublicado || fechaPublicado.length < 10) return undefined;
  const d = new Date(fechaPublicado);
  if (isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

function waLink(numero: string, texto: string) {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}

export default async function EmpleoPage({ params }: Props) {
  const { slug } = await params;
  const e = await getEmpleoPorSlug(slug);
  if (!e) notFound();

  const descripcion = e.descripcion?.trim() ||
    `${e.negocio || 'Este negocio'} busca cubrir el puesto de ${e.puesto} en ${e.zona || 'Pucallpa'}.`;
  const fecha = e.publicado || e.subido || '';
  const tipoSchema = tipoEmpleoSchema(e.tipo);

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: e.puesto,
    description: descripcion,
    ...(fecha && { datePosted: fecha }),
    ...(tipoSchema && { employmentType: tipoSchema }),
    hiringOrganization: { '@type': 'Organization', name: e.negocio || 'Empleador en Pucallpa' },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: e.zona || 'Pucallpa',
        addressRegion: 'Ucayali',
        addressCountry: 'PE',
      },
    },
    directApply: true,
    url: `${SITE_URL}/trabajos/${slug}`,
    ...(calcValidThrough(e.expira_el, fecha) && { validThrough: calcValidThrough(e.expira_el, fecha) }),
    ...(parsearSalario(e.pago) && { baseSalary: parsearSalario(e.pago) }),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BogaHub', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Trabajos', item: `${SITE_URL}/trabajos` },
      { '@type': 'ListItem', position: 3, name: e.puesto, item: `${SITE_URL}/trabajos/${slug}` },
    ],
  };

  const link = e.link || (e.wsp && waLink(e.wsp, `Hola, vi el aviso de "${e.puesto}" en ${e.negocio} por BogaHub. Me interesa postular.`)) || '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <AppHeader />

      <main className="max-w-[720px] mx-auto px-container-margin pt-6 pb-16">
        <Link href="/trabajos" className="inline-flex items-center gap-1 text-secondary hover:text-primary font-label-md text-label-md mb-5">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Todos los avisos
        </Link>

        <div className="bg-white rounded-2xl border border-surface-container-highest p-5 md:p-7 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            {e.img ? (
              <img src={e.img} alt="" referrerPolicy="no-referrer" className="w-24 h-24 rounded-xl object-cover object-top shrink-0 border border-surface-container-highest" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[32px]">work</span>
              </div>
            )}
            <div className="min-w-0 flex flex-col gap-1">
              <h1 className="font-headline-lg text-xl md:text-2xl font-extrabold text-on-surface leading-tight">{e.puesto}</h1>
              {(e.negocio || e.zona) && (
                <p className="text-secondary font-body-md text-sm">{[e.negocio, e.zona].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {e.tipo && <span className="bg-surface-container-low text-secondary text-[11px] font-label-md px-2.5 py-1 rounded-full border border-surface-container-highest">{e.tipo}</span>}
            {e.pago && <span className="bg-primary-fixed text-primary text-[11px] font-label-md px-2.5 py-1 rounded-full">{e.pago}</span>}
            {haceCuanto(e.subido) && (
              <span className="text-secondary/70 font-label-md text-[11px] flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">schedule</span>{haceCuanto(e.subido)}</span>
            )}
            {fechaAviso(e.publicado) && (
              <span className="text-secondary/70 font-label-md text-[11px] flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">event</span>{fechaAviso(e.publicado)}</span>
            )}
          </div>

          <p className="font-body-md text-sm text-on-surface leading-relaxed whitespace-pre-line">{descripcion}</p>

          <p className="flex items-center gap-1 text-[11px] font-label-md text-red-600/80">
            <span className="material-symbols-outlined text-[13px]">error</span>
            BogaHub solo indexa este aviso, no es el empleador. Ninguna empresa seria te pedirá dinero por examen médico, uniforme o capacitación.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-label-md px-4 py-3 rounded-full active:scale-95 transition-transform"
              >
                {e.link ? 'Ver aviso' : 'Postular por WhatsApp'}
                <span className="material-symbols-outlined text-[18px]">{e.link ? 'open_in_new' : 'arrow_forward'}</span>
              </a>
            )}
            {e.email && (
              <a
                href={`mailto:${e.email}?subject=${encodeURIComponent(`Postulación: ${e.puesto}`)}`}
                className="flex items-center justify-center gap-1.5 bg-primary-fixed text-primary text-sm font-label-md px-4 py-3 rounded-full active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                Enviar CV
              </a>
            )}
          </div>
        </div>

        <p className="text-secondary/70 font-body-md text-[11px] text-center pt-4">
          BogaHub conecta, pero no es empleador ni responsable de los acuerdos. Verifica siempre con quién tratas.
        </p>
      </main>
    </>
  );
}
