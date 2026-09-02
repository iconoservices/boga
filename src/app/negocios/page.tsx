import Link from 'next/link';

// Landing B2B (/negocios): la puerta de entrada para dueños de negocio que
// quieren crear su tienda. Separada del lado consumidor (/inicio, /market…).
// La raíz "/" redirige a /inicio; acá se entra desde el footer o un link
// "Vende con Boga".

const FEATURES = [
  {
    icon: 'storefront',
    title: 'Tu catálogo propio',
    body: 'Tu propia página de pedidos (boga.la/tu-negocio) para compartir en WhatsApp o Instagram. Es tuya: gestionas tus productos, tus pedidos y tus clientes sin depender de nadie.',
  },
  {
    icon: 'extension',
    title: 'Módulos que sumas cuando creces',
    body: 'Empieza con lo básico y agrega fidelización, facturación electrónica, inventario inteligente o notificaciones a medida que tu negocio lo necesite.',
  },
  {
    icon: 'military_tech',
    title: 'Fidelización real',
    body: 'Puntos, niveles y notificaciones automáticas para que tus clientes vuelvan — sin que tengas que acordarte de mandarles nada.',
  },
  {
    icon: 'travel_explore',
    title: 'Más gente te encuentra',
    body: 'Activa el Marketplace de Boga cuando quieras y tus productos aparecen también frente a miles de clientes nuevos que no te conocían todavía.',
  },
];

const STEPS = [
  { n: '1', title: 'Subes tu catálogo', body: 'Fotos, precios y tu WhatsApp de pedidos. 10 minutos y ya tienes tu link propio.' },
  { n: '2', title: 'Activas módulos si quieres', body: 'Fidelización, facturación, Marketplace — solo lo que tu negocio necesite hoy.' },
  { n: '3', title: 'Empiezas a vender', body: 'Comparte tu link o deja que te encuentren en el Marketplace de Boga.' },
];

export default function NegociosPage() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-md border-b border-surface-container-highest/70">
        <div className="max-w-[1200px] mx-auto px-container-margin py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-on-primary font-black text-sm">B</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-background">Boga</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#soluciones" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors">Soluciones</a>
            <a href="#precios" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors">Precios</a>
            <a href="#como-funciona" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors">Recursos</a>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block font-label-md text-label-md text-secondary hover:text-primary transition-colors">
              Iniciar sesión
            </Link>
            <Link
              href="/inicio"
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
          {/* Decorative blurred blobs */}
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-primary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute top-40 -left-32 w-[320px] h-[320px] bg-tertiary/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            {/* Hero visual: arriba en mobile, a la derecha en desktop */}
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
                Tu propio catálogo online, sistema de pedidos y fidelización de clientes.
                Y si quieres, más gente nueva te encuentra a través de nuestro Marketplace.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
                <Link
                  href="/vende-con-boga"
                  className="bg-primary text-on-primary font-bold text-sm px-7 py-3.5 rounded-full shadow-[0_8px_24px_-6px_rgba(184,19,14,0.5)] hover:opacity-90 hover:shadow-[0_10px_28px_-6px_rgba(184,19,14,0.6)] transition-all active:scale-95"
                >
                  Crear tu tienda
                </Link>
                <Link
                  href="/inicio"
                  className="text-on-background font-semibold text-sm px-7 py-3.5 rounded-full border border-surface-container-highest hover:border-primary hover:text-primary transition-colors"
                >
                  Ver la app
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1200px] mx-auto px-container-margin">
          {/* Cómo funciona */}
          <section id="como-funciona" className="scroll-mt-24 pb-14 md:pb-16">
            <div className="text-center max-w-[560px] mx-auto mb-10">
              <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold text-on-background">Cómo funciona Boga</h2>
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

          {/* Features */}
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

          {/* Pricing teaser */}
          <section id="precios" className="scroll-mt-24 relative bg-gradient-to-br from-inverse-surface to-[#1c1e1f] text-inverse-on-surface rounded-3xl p-8 md:p-12 flex flex-col items-center text-center gap-4 mb-14 md:mb-16 overflow-hidden">
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-primary/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
            <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
            <span className="material-symbols-outlined text-primary text-4xl relative">bolt</span>
            <h2 className="font-headline-md text-2xl md:text-3xl font-extrabold relative">Sin comisión en tus pedidos directos</h2>
            <p className="text-inverse-on-surface/70 font-body-md text-sm md:text-base max-w-[520px] relative">
              Si el pedido llega por tu link propio, es 100% tuyo. Solo cobramos una comisión cuando el pedido viene
              de gente que te descubrió a través del Marketplace de Boga.
            </p>
            <Link
              href="/vende-con-boga"
              className="relative bg-primary text-on-primary font-bold text-sm px-7 py-3.5 rounded-full mt-2 shadow-[0_8px_24px_-6px_rgba(184,19,14,0.5)] hover:opacity-90 transition-opacity active:scale-95"
            >
              Quiero mi catálogo
            </Link>
          </section>
        </div>
      </main>

      <footer className="w-full px-container-margin py-8 text-center border-t border-surface-container-highest">
        <p className="text-secondary font-body-md text-xs">© {new Date().getFullYear()} Boga. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
