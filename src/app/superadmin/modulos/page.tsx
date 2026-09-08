'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `modulos`,
// "Módulos y Estrategia"). Referencia interna del socio fundador sobre el
// modelo de negocio — no la ve el comercio.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';

// Notas de modelo de negocio: por qué se cobra así, no qué es cada campo.
// Agrupado por tema: primero cómo se cobra, después por qué no te dejan,
// después cómo escala, al final la salida.
const BUSINESS_STRATEGY = [
  {
    category: 'Cómo Cobrar',
    icon: 'stars',
    title: 'El Modelo Híbrido — la solución ganadora',
    body: 'Suscripción base fija (ej. S/ 80-100/mes) que cubre servidores y soporte y asegura flujo de caja, + una comisión de éxito de 1-2% sobre la venta bruta procesada por la app — bajísimo comparado al 30% de Rappi, así que el dueño lo acepta feliz. El contrato debe fijar el % sobre venta bruta, no sobre ganancia neta. Si vende S/ 10,000/mes, el 1% son S/ 100 — casi no se siente; si escala a S/ 1,000,000/mes, son S/ 10,000 mensuales por un solo cliente.',
  },
  {
    category: 'Cómo Cobrar',
    icon: 'layers',
    title: 'Cobrar por "escalones de capacidad", no por ancho de banda',
    body: 'Nunca le hables de tráfico o bandwidth, es muy técnico para el dueño. Cobrá por escalones: Plan Básico (hasta 500 usuarios registrados), Plan Pro (usuarios ilimitados + mapas de calor de dónde viven sus clientes), Plan Enterprise (varias sedes sincronizadas). Es justo para los dos: si el negocio crece a 5,000 usuarios, gasta más de tus servidores, así que le toca pasar al siguiente plan.',
  },
  {
    category: 'Cómo Cobrar',
    icon: 'request_quote',
    title: 'La psicología del cobro Enterprise',
    body: 'A un cliente grande no se le habla de soles sueltos. Se le habla de: Licenciamiento Anual (ej. USD 5,000/año), Costo por Pedido (ej. S/ 0.20 por cada pedido procesado) y Soporte Premium 24/7 como extra fijo.',
  },
  {
    category: 'Por Qué No Te Van a Dejar',
    icon: 'lock',
    title: 'Lock-in (Retención)',
    body: 'Cambiar de software le cuesta al negocio meses y miles de dólares. La data histórica, los puntos de fidelización de sus clientes y las costumbres de sus empleados viven en tu sistema. Eso da poder de negociación real para ajustar precios cada año sin perder al cliente.',
  },
  {
    category: 'Por Qué No Te Van a Dejar',
    icon: 'shield',
    title: 'Arquitectura anti-bypass',
    body: 'La app que tiene el cliente es solo un "cascarón". El cálculo de puntos, los algoritmos de fidelización y la base de datos viven en tu servidor central. Si intentan copiar la app, no se llevan el "cerebro" — reconstruirlo desde cero les sale más caro que seguir pagándote.',
  },
  {
    category: 'Por Qué No Te Van a Dejar',
    icon: 'power_settings_new',
    title: 'El "Kill Switch" — lo valioso es la data',
    body: 'Controlar la infraestructura da poder real: si no pagan la comisión o la mensualidad, el sistema se suspende automáticamente. Y en B2B lo más valioso no es la app, es la data — si el dueño tiene 100,000 clientes registrados con correos, gustos, direcciones y cumpleaños, jamás va a querer dejar de pagar, porque perder el acceso es perder su activo más grande: su comunidad fiel.',
  },
  {
    category: 'Cómo Escala el Negocio',
    icon: 'extension',
    title: 'Módulos de Expansión',
    body: 'Una tienda de barrio no necesita lo mismo que una franquicia. A medida que el negocio crece, se cobra por necesidades nuevas: panel de franquicias, facturación electrónica, Business Intelligence predictivo y el resto del catálogo de abajo.',
  },
  {
    category: 'Cómo Escala el Negocio',
    icon: 'dns',
    title: '¿Servidores propios o SaaS? El dilema de la propiedad',
    body: 'Vender el software e instalarlo en el servidor del cliente no conviene: te pagan una vez y si el negocio explota a 1 millón de usuarios, vos no ganás nada extra. Mejor White Label multi-tenant en tu propia infraestructura — la app lleva su logo y su nombre, pero el motor y los datos corren en tus servidores. Cobrás mensualidad Enterprise + mantenimiento, y si se quieren ir se llevan sus datos, no el código: la tecnología sigue siendo tuya.',
  },
  {
    category: 'Cómo Escala el Negocio',
    icon: 'hub',
    title: 'Escalabilidad a 100k usuarios (Isolating)',
    body: 'Con base de datos compartida, un cliente que llega a 100,000 usuarios puede volver lenta la app de la tienda chica que recién empieza. Se lo aísla en una instancia de servidor dedicada solo para él, vendido como "Plan Infraestructura Dedicada": sus costos de servidor los paga él dentro de su mensualidad, y vos te quedás con la ganancia.',
  },
  {
    category: 'La Salida',
    icon: 'sell',
    title: '¿Y si quieren comprarte el software?',
    body: 'Cuando el cliente crece, a veces pide comprar la app entera para dejar de pagar mensualidad. No vendas el código barato: pedí una cifra de 6 o 7 dígitos, o mejor — no vendas el código, dales una licencia exclusiva de por vida por un pago único (ej. $50,000) + mantenimiento mensual.',
  },
] as const;

export default function ModulosPage() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const [abierto, setAbierto] = useState<string | null>(BUSINESS_STRATEGY[0]?.title ?? null);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/modulos');
  }, [cargando, esSuperadmin, router]);

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const categorias = Array.from(new Set(BUSINESS_STRATEGY.map((i) => i.category)));

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Módulos y Estrategia" icon="extension" />
      <main className="max-w-[900px] mx-auto px-4 py-8 flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="border-b border-[#c2c6d6] pb-4">
            <h2 className="text-xl font-bold text-[#191b23]">Modelo de Negocio</h2>
            <p className="text-xs text-[#424754] mt-1">Por qué cobramos así, no solo qué cobramos. Referencia interna — no la ve el comercio.</p>
          </div>
          <div className="flex flex-col gap-4">
            {categorias.map((category) => (
              <div key={category} className="flex flex-col gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#0058be] pl-1">{category}</h3>
                {BUSINESS_STRATEGY.filter((i) => i.category === category).map((item) => {
                  const isOpen = abierto === item.title;
                  return (
                    <div key={item.title} className="bg-white border border-[#c2c6d6] rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setAbierto(isOpen ? null : item.title)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f2f3fd]/40 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-[#0058be] shrink-0">{item.icon}</span>
                        <span className="flex-1 text-xs font-bold text-[#191b23]">{item.title}</span>
                        <span className={`material-symbols-outlined text-[18px] text-[#424754] transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                      {isOpen && <p className="px-4 pb-4 pl-11 text-xs text-[#424754] leading-relaxed">{item.body}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="bg-[#f2f3fd] border border-[#c2c6d6] rounded-md p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[18px] text-[#0058be] shrink-0">lightbulb</span>
            <p className="text-xs text-[#424754] leading-relaxed">
              <span className="font-bold text-[#191b23]">Ejemplo Shopify: </span>
              no cobra "ancho de banda" — cobra mensualidad fija + % de cada venta + apps extra. No se vende el código, se vende el servicio.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
