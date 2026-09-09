// Landing B2B única de Boga. Marketing puro; el formulario está en su propia
// página (/negocios/registro). Los CTA linkean ahí con ?i= para pre-seleccionar
// "¿Qué te interesa?".
//
// Estructura: hero → 2 caminos (tienda propia / Boga Market) → cómo funciona →
// soluciones → precios. `/vende-con-boga` redirige a /negocios/registro.

import React from 'react';
import Link from 'next/link';

const REGISTRO = '/negocios/registro';

const PLANES = [
  {
    id: 'tienda',
    icon: 'storefront',
    nombre: 'Tu Tienda Boga',
    precio: 'S/ 50',
    periodo: '/mes',
    nota: 'Precio de lanzamiento · luego S/ 80/mes',
    body: 'Tu página de pedidos con tu propio link (bogahub.app/tu-negocio) para compartir en WhatsApp o Instagram. Tú vendes y cobras directo — Boga no toca tu plata.',
    bullets: [
      'Catálogo con tus productos, precios y fotos',
      'Inventario y gestión de pedidos',
      'Pedidos directo a tu WhatsApp, sin comisión',
      'Funciona en cualquier ciudad',
    ],
    featured: false,
  },
  {
    id: 'marketplace',
    icon: 'travel_explore',
    nombre: 'Tu Tienda + Boga Market',
    precio: 'S/ 100',
    periodo: '/mes',
    nota: 'Solo donde Boga opera',
    body: 'Todo lo de Tu Tienda Boga y, además, tu negocio aparece en el Market de tu ciudad, junto a otros comercios locales, frente a gente que todavía no te conoce.',
    bullets: [
      'Todo lo del plan Tu Tienda Boga',
      'Clientes de tu ciudad te descubren',
      'Lo activas y lo apagas desde tu panel',
      'Coordinación de entrega',
    ],
    featured: true,
  },
];

const STEPS = [
  { n: '1', title: 'Cuéntanos de tu negocio', body: 'Llenas el formulario: qué vendes, dónde y tu WhatsApp. 2 minutos.' },
  { n: '2', title: 'Lo montamos contigo', body: 'Armamos tu catálogo y tu link propio. Sin código, sin complicarte.' },
  { n: '3', title: 'Empiezas a vender', body: 'Compartes tu link y —si quieres— activas el Market para que te descubran.' },
];

const FEATURES = [
  { icon: 'storefront',   title: 'Tu catálogo propio',           body: 'Tu propia página de pedidos para compartir donde quieras. Gestionas tus productos, pedidos y clientes sin depender de nadie.' },
  { icon: 'extension',    title: 'Módulos que sumas al crecer',  body: 'Empieza con lo básico y agrega fidelización, facturación electrónica, inventario o notificaciones cuando lo necesites.' },
  { icon: 'military_tech',title: 'Fidelización real',            body: 'Puntos, niveles y notificaciones automáticas para que tus clientes vuelvan — sin que tengas que acordarte de nada.' },
  { icon: 'travel_explore',title: 'Más gente de tu ciudad te encuentra', body: 'Activa el Marketplace de Boga cuando quieras y tus productos aparecen frente a clientes de tu zona que aún no te conocían.' },
];

export default function NegociosPage() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-surface-container-highest/70">
        <div className="max-w-[1200px] mx-auto px-container-margin py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.svg" alt="" className="w-8 h-8 shrink-0" />
            <span className="font-headline-sm text-headline-sm text-on-background">Boga</span>
            <span className="hidden sm:inline text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">Negocios</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#precios" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors">Planes</a>
            <a href="#como-funciona" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors">Cómo funciona</a>
            <a href="#soluciones" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors">Soluciones</a>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href={REGISTRO}
              className="hidden sm:block font-label-md text-label-md text-secondary hover:text-primary transition-colors"
            >
              Registrar negocio
            </Link>
            <Link href="/login?redirect=/admin" className="hidden sm:block font-label-md text-label-md text-secondary hover:text-primary transition-colors">
              Iniciar sesión
            </Link>
            {/* Mantiene conectado el lado negocios con la app de consumo. */}
            <Link
              href="/"
              className="font-label-md text-label-md px-4 py-2 rounded-full border border-surface-container-highest text-on-background hover:border-primary hover:text-primary transition-colors"
            >
              Abrir Boga
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative max-w-[1200px] mx-auto px-container-margin pt-10 md:pt-14 pb-10 md:pb-14">
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-40 -left-32 w-[320px] h-[320px] bg-tertiary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            <div className="relative order-1 lg:order-2">
              <div className="relative rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden shadow-2xl aspect-[16/10] lg:aspect-[4/3] lg:max-w-[440px] lg:ml-auto lg:rotate-2">
                <img
                  src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=900&q=80"
                  alt="Negocio local usando Boga"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
              </div>
              <div className="hidden lg:flex absolute -bottom-6 -left-8 bg-surface-container-lowest border border-surface-container-highest rounded-2xl shadow-xl p-4 items-center gap-3 -rotate-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">trending_up</span>
                </div>
                <div>
                  <p className="font-headline-sm text-headline-sm text-on-background leading-none">Tu negocio, online</p>
                  <p className="text-secondary font-body-md text-xs mt-1">Sin depender de terceros</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start text-left gap-5 order-2 lg:order-1">
              <span className="font-label-md text-label-md text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                Infraestructura digital para negocios locales
              </span>
              <h1 className="font-headline-lg text-on-background text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Digitaliza tu negocio con <span className="text-primary">Boga</span>
              </h1>
              <p className="text-secondary font-body-lg text-base md:text-lg max-w-[480px]">
                Tu propio catálogo online, pedidos por WhatsApp y fidelización de clientes.
                Y cuando Boga Market abra en tu ciudad, entras al grupo de comercios locales
                donde te encuentra gente nueva.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
                <Link
                  href={REGISTRO}
                  className="bg-primary text-on-primary font-bold text-sm px-7 py-3.5 rounded-full shadow-[0_8px_24px_-6px_rgba(184,19,14,0.5)] hover:opacity-90 hover:shadow-[0_10px_28px_-6px_rgba(184,19,14,0.6)] transition-all active:scale-95"
                >
                  Crear tu tienda
                </Link>
                <Link
                  href="/"
                  className="text-on-background font-semibold text-sm px-7 py-3.5 rounded-full border border-surface-container-highest hover:border-primary hover:text-primary transition-colors"
                >
                  Ver la app
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1200px] mx-auto px-container-margin">
          {/* Planes y precios */}
          <section id="precios" className="scroll-mt-24 pb-14 md:pb-16">
            <div className="text-center max-w-[560px] mx-auto mb-10">
              <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">Un plan fijo, sin comisión</h2>
              <p className="text-secondary font-body-md text-sm md:text-base mt-2">
                Empieza con tu tienda propia y suma el Market cuando quieras. Lo que vendes es 100% tuyo:
                cobras tú, directo a tu cliente — Boga solo te cobra el plan.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[720px] mx-auto">
              {PLANES.map((p) => (
                <div
                  key={p.id}
                  className={`relative bg-surface-container-lowest rounded-2xl p-6 flex flex-col gap-3 ${
                    p.featured ? 'border-[1.5px] border-primary' : 'border border-surface-container-highest'
                  }`}
                >
                  {p.featured && (
                    <span className="absolute top-4 right-4 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wide">
                      Más alcance
                    </span>
                  )}
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">{p.icon}</span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-background">{p.nombre}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-md text-3xl font-extrabold text-on-background">{p.precio}</span>
                    <span className="text-secondary font-body-md text-sm">{p.periodo}</span>
                  </div>
                  <p className="text-primary font-label-md text-[11px] font-bold uppercase tracking-wide -mt-1">{p.nota}</p>
                  <p className="text-secondary font-body-md text-sm leading-relaxed">{p.body}</p>
                  <ul className="flex flex-col gap-2 my-1">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-sm text-on-background/80">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0">check</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${REGISTRO}?i=${p.id}`}
                    className={`w-full mt-auto py-3 rounded-xl font-bold text-sm text-center transition-all active:scale-95 ${
                      p.featured
                        ? 'bg-primary text-on-primary hover:opacity-90'
                        : 'border-[1.5px] border-primary text-primary hover:bg-primary/5'
                    }`}
                  >
                    Empezar
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-secondary/80 font-body-md text-xs text-center mt-4 max-w-[560px] mx-auto">
              El Market es un módulo que activas o apagas desde tu panel — no hace falta registrarte de nuevo.
              ¿Quieres una tienda con diseño a medida? La armamos contigo: plan más una puesta en marcha que conversamos según lo que necesites.
            </p>
          </section>

          {/* Cómo funciona */}
          <section id="como-funciona" className="scroll-mt-24 pb-14 md:pb-16">
            <div className="text-center max-w-[560px] mx-auto mb-10">
              <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">Cómo funciona</h2>
              <p className="text-secondary font-body-md text-sm md:text-base mt-2">Tres pasos simples para llevar tu negocio al siguiente nivel digital.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((s) => (
                <div key={s.n} className="flex flex-col gap-3">
                  <div className="w-9 h-9 rounded-full bg-on-background text-background font-headline-sm text-headline-sm flex items-center justify-center">
                    {s.n}
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-background">{s.title}</h3>
                  <p className="text-secondary font-body-md text-sm leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Soluciones */}
          <section id="soluciones" className="scroll-mt-24 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-14 md:pb-16">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-surface-container-lowest border border-surface-container-highest rounded-2xl p-5 flex flex-col gap-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">{f.icon}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-background">{f.title}</h3>
                <p className="text-secondary font-body-md text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </section>

          <div className="pb-16 md:pb-24" />
        </div>
      </main>

      <footer className="w-full px-container-margin py-8 text-center border-t border-surface-container-highest">
        <p className="text-secondary font-body-md text-xs">© {new Date().getFullYear()} Boga. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
