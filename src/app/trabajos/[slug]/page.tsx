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
import AficheModal from '@/components/AficheModal';
import { getEmpleoPorSlug, getEmpleosActivos } from '@/lib/chamba.data';
import { slugEmpleo, haceCuanto, fechaAviso } from '@/lib/chamba';
import PixelEvent from '@/components/PixelEvent';

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
      <PixelEvent
        event="ViewContent"
        data={{
          content_name: `${e.puesto}${e.negocio ? ` · ${e.negocio}` : ''}`,
          content_category: 'Empleo',
          content_type: 'job',
          content_ids: [slug],
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <AppHeader />

      <main className="max-w-[1240px] mx-auto px-container-margin lg:px-6 pt-5 pb-16 flex flex-col gap-5">
        {/* Navegación superior / volver */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/trabajos"
            className="inline-flex items-center gap-1.5 text-secondary hover:text-primary font-label-md text-xs sm:text-sm transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            Volver a Trabajos
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-secondary font-label-md">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/trabajos" className="hover:text-primary transition-colors">Trabajos</Link>
            <span>/</span>
            <span className="text-on-surface font-semibold truncate max-w-[260px]">{e.puesto}</span>
          </div>
        </div>

        {/* Layout de 2 columnas en escritorio: Foto a la izquierda, detalles a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ── Columna izquierda: Afiche / Fotografía ── */}
          <div className="lg:col-span-5 flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-surface-container-highest p-3 sm:p-4 shadow-[0_10px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3">
              {e.img ? (
                <AficheModal imgSrc={e.img} altText={`Afiche de ${e.puesto}`} />
              ) : (
                <div className="w-full min-h-[240px] sm:min-h-[380px] rounded-xl bg-gradient-to-br from-primary/10 via-surface-container-low to-primary/5 border border-primary/20 flex flex-col items-center justify-center p-6 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[30px]">work</span>
                  </div>
                  <p className="font-headline-sm text-sm font-bold text-on-surface">Aviso sin afiche gráfico</p>
                  <p className="text-secondary text-xs">Todos los detalles y requisitos están especificados en la ficha de la derecha.</p>
                </div>
              )}

              {/* Meta rápida bajo la foto */}
              <div className="flex items-center justify-between text-[11px] font-label-md text-secondary px-1 pt-0.5">
                <span className="flex items-center gap-1 text-on-surface font-semibold">
                  <span className="material-symbols-outlined text-[15px] text-primary">verified</span>
                  Aviso en BogaHub Pucallpa
                </span>
                {e.expira_el && (
                  <span className="text-secondary/70">
                    Vence: {e.expira_el}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Columna derecha: Detalles, requisitos y postulación ── */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Tarjeta 1: Cabecera compacta con métricas unificadas en el mismo espacio */}
            <div className="bg-white rounded-2xl border border-surface-container-highest p-4 sm:p-6 shadow-[0_10px_20px_rgba(0,0,0,0.03)] flex flex-col gap-3 sm:gap-3.5">
              {/* Negocio y zona */}
              <div className="flex flex-wrap items-center gap-1.5">
                {e.negocio && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-label-md text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[13px]">store</span>
                    {e.negocio}
                  </span>
                )}
                {e.zona && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium font-label-md text-secondary bg-surface-container-low px-2.5 py-0.5 rounded-full border border-surface-container-highest">
                    <span className="material-symbols-outlined text-[13px]">location_on</span>
                    {e.zona}
                  </span>
                )}
              </div>

              {/* Título del puesto */}
              <h1 className="font-headline-lg text-xl sm:text-2xl font-black text-on-surface leading-tight tracking-tight">
                {e.puesto}
              </h1>

              {/* Barra unificada: Modalidad, Sueldo y Fecha en el mismo espacio */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 py-2 px-2.5 rounded-xl bg-surface-container-low/75 border border-surface-container-highest items-center">
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-secondary/70 truncate">Modalidad</span>
                  <span className="text-[11px] sm:text-xs font-bold text-on-surface truncate flex items-center gap-1 mt-0.5" title={e.tipo || 'Completo'}>
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">schedule</span>
                    <span className="truncate">{e.tipo || 'Completo'}</span>
                  </span>
                </div>

                <div className="flex flex-col min-w-0 border-x border-surface-container-highest px-2">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-700/90 truncate">Sueldo / Pago</span>
                  <span className="text-[11px] sm:text-xs font-black text-emerald-800 truncate flex items-center gap-1 mt-0.5" title={e.pago || 'Por confirmar'}>
                    <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">payments</span>
                    <span className="truncate">{e.pago || 'Por confirmar'}</span>
                  </span>
                </div>

                <div className="flex flex-col min-w-0 pl-1">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-secondary/70 truncate">Publicación</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-secondary truncate flex items-center gap-1 mt-0.5" title={fechaAviso(e.publicado) || haceCuanto(e.subido)}>
                    <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">calendar_today</span>
                    <span className="truncate">{fechaAviso(e.publicado) || haceCuanto(e.subido)}</span>
                  </span>
                </div>
              </div>

              {/* Botones de acción principales */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-5 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    {e.link ? (
                      <>
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        Ver aviso oficial
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                        Postular por WhatsApp
                      </>
                    )}
                  </a>
                )}
                {e.email && (
                  <a
                    href={`mailto:${e.email}?subject=${encodeURIComponent(`Postulación: ${e.puesto}`)}`}
                    className="flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container border border-surface-container-highest text-on-surface text-xs sm:text-sm font-semibold py-2.5 sm:py-3 px-4 rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">mail</span>
                    Enviar CV
                  </a>
                )}
              </div>
            </div>

            {/* Tarjeta 2: Descripción y Requisitos */}
            <div className="bg-white rounded-2xl border border-surface-container-highest p-5 sm:p-7 shadow-[0_10px_20px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-container-highest">
                <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                <h2 className="font-headline-sm font-bold text-base sm:text-lg text-on-surface">Descripción y requisitos</h2>
              </div>
              <div className="font-body-md text-sm sm:text-[15px] text-on-surface/90 leading-relaxed whitespace-pre-line space-y-2">
                {descripcion}
              </div>
            </div>

            {/* Tarjeta 3: Consejo de seguridad */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div className="flex flex-col gap-1 text-xs sm:text-[13px] leading-relaxed text-amber-950">
                <span className="font-bold text-amber-900">Consejo de seguridad BogaHub</span>
                <span>
                  BogaHub solo indexa este aviso, no es el empleador. <strong>Ninguna empresa seria te pedirá dinero</strong> por examen médico, uniforme o capacitación. Si notas algo sospechoso, no continúes con el proceso.
                </span>
              </div>
            </div>

            {/* Nota al pie */}
            <p className="text-secondary/60 font-body-md text-xs text-center pt-1">
              BogaHub conecta, pero no es empleador ni responsable de los acuerdos. Verifica siempre con quién tratas.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
