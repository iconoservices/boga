'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `mapa`,
// "Mapa de Apps"). Auditoría de cumplimiento por plantilla: qué reglas del
// ecosistema cumple cada plantilla y cuántas tiendas la usan.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import { getAllTemplates, getTemplate } from '@/lib/templates.config';
import SuperadminSubheader from '@/components/SuperadminSubheader';

// Plantillas con botón de pedido por WhatsApp implementado en su código.
const TEMPLATES_WITH_WHATSAPP = new Set([
  'polleria', 'estilosmirka', 'sweetkittynails', 'mercado', 'menudirecto', 'iniciocatalogo', 'flores',
  'fichadigital', 'fichaplana',
]);

// Plantillas que montan <StoreFloatingActions/> (compartir + instalar PWA).
const TEMPLATES_WITH_SHARE_INSTALL = new Set([
  'polleria', 'estilosmirka', 'mercado', 'sunset', 'natura', 'amazonia', 'sweetkittynails',
  'menudirecto', 'iniciocatalogo', 'flores', 'fichadigital', 'fichaplana',
]);

const META: Record<string, { emoji: string }> = {
  sunset: { emoji: '🥂' }, delva: { emoji: '🌿' }, natura: { emoji: '🪴' },
  amazonia: { emoji: '🏺' }, estilosmirka: { emoji: '👗' }, sweetkittynails: { emoji: '💅' },
  menudirecto: { emoji: '🍔' }, iniciocatalogo: { emoji: '🔥' }, flores: { emoji: '🌸' },
};

function getTemplateChecks(templateId: string): boolean[] {
  const tpl = getTemplate(templateId);
  return [
    true,  // PWA: la provee la plataforma a toda tienda
    true,  // Módulo de Productos: todas las plantillas reales consultan Supabase
    false, // Recuadro de Características: todavía no existe ficha técnica por producto
    (tpl?.categories?.length || 0) >= 3, // Categorías Estructuradas
    TEMPLATES_WITH_WHATSAPP.has(templateId), // Botón de Pedidos WhatsApp
    true,  // Estilos y Branding: toda plantilla trae un tema completo
    TEMPLATES_WITH_SHARE_INSTALL.has(templateId), // Compartir e Instalar (PWA)
  ];
}

const GLOSARIO = [
  { group: 'App Instalable', items: [
    { title: 'PWA para Formar Ícono', desc: 'Toda tienda debe tener PWA: se instala en el celular del cliente con su propio ícono, sin pasar por App Stores.' },
    { title: 'Botones de Compartir e Instalar', desc: 'Botones flotantes al costado para compartir la tienda e instalar el PWA con un toque.' },
  ] },
  { group: 'Catálogo de Productos', items: [
    { title: 'Módulo de Productos', desc: 'Estructura unificada de productos en base de datos, cada uno enlazado a su tienda, con imágenes de alta resolución.' },
    { title: 'Recuadro de Características', desc: 'Ficha técnica del producto: tallas, colores, materiales, peso o descripción rica.' },
  ] },
  { group: 'Categorías Estructuradas', items: [
    { title: 'Navegación por Categorías', desc: 'Al menos 3 categorías en el menú para navegación fluida.' },
  ] },
  { group: 'Botón de Pedidos WhatsApp', items: [
    { title: 'Conversión a Pedido', desc: 'Botón activo de WhatsApp en el carrito/reserva para derivar la orden directo al comercio.' },
  ] },
  { group: 'Estilos y Branding', items: [
    { title: 'Identidad Visual', desc: 'Tema de color único por tienda configurado en el archivo de diseño.' },
  ] },
];

const RULE_TAGS = [
  { label: 'PWA', icon: 'phone_android' }, { label: 'PROD', icon: 'shopping_bag' },
  { label: 'FICHA', icon: 'assignment' }, { label: 'CAT', icon: 'category' },
  { label: 'WSP', icon: 'chat' }, { label: 'ESTILO', icon: 'palette' }, { label: 'SHARE', icon: 'ios_share' },
];

export default function MapaPage() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const [usos, setUsos] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/mapa');
  }, [cargando, esSuperadmin, router]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(({ stores }) => {
        const c: Record<string, number> = {};
        (stores ?? []).forEach((s: { template?: string }) => {
          if (s.template) c[s.template] = (c[s.template] || 0) + 1;
        });
        setUsos(c);
      })
      .catch(() => {});
  }, []);

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const allTemplates = getAllTemplates();
  const promedio = Math.round(
    allTemplates.reduce((sum, tpl) => {
      const checks = getTemplateChecks(tpl.id);
      return sum + (checks.filter(Boolean).length / checks.length) * 100;
    }, 0) / allTemplates.length,
  );

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Mapa de Apps" icon="account_tree" />
      <main className="max-w-[1100px] mx-auto px-4 py-8 space-y-4">
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-lg p-5 shadow-lg border border-neutral-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-400">gavel</span>
                <h2 className="text-base font-extrabold tracking-tight">Reglas del Ecosistema Boga Market</h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-[650px] leading-relaxed">
                Las tiendas se crean a partir de una plantilla base. Por eso la auditoría de cumplimiento
                mira cada plantilla, no cada tienda: si la plantilla cumple una regla, toda tienda que la use la hereda.
              </p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-md border border-white/10 shrink-0 text-center md:text-right">
              <p className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 leading-none">Promedio Global</p>
              <p className="text-2xl font-black text-white mt-1">{promedio}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white border border-[#c2c6d6] rounded-lg p-4 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs text-[#191b23] border-b border-[#ecedf7] pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#424754] font-bold">menu_book</span>
              Glosario de Reglas
            </h3>
            <p className="text-[9px] text-[#424754] leading-snug font-semibold -mt-1">
              Todas gratis, vienen incluidas en cualquier tienda — no confundir con los módulos <em>pagos</em>.
            </p>
            <div className="space-y-4">
              {GLOSARIO.map((section) => (
                <div key={section.group} className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#0058be]">{section.group}</p>
                  {section.items.map((rule) => (
                    <div key={rule.title} className="space-y-1 bg-[#f2f3fd]/55 p-2.5 rounded-md border border-[#c2c6d6]/65">
                      <p className="font-bold text-[11px] text-[#191b23]">{rule.title}</p>
                      <p className="text-[10px] text-[#424754] leading-relaxed font-semibold">{rule.desc}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-[#c2c6d6] rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#f2f3fd] border-b border-[#c2c6d6] flex justify-between items-center">
              <h3 className="font-bold text-xs text-[#191b23]">Estado de Cumplimiento por Plantilla</h3>
              <span className="text-[9px] font-bold text-[#424754] bg-[#ecedf7] px-2 py-0.5 rounded border border-[#c2c6d6] leading-none">Auditoría Real</span>
            </div>
            <div className="divide-y divide-[#ecedf7]">
              {allTemplates.map((tpl) => {
                const checks = getTemplateChecks(tpl.id);
                const usage = usos[tpl.id] || 0;
                const missing: string[] = [];
                if (!checks[2]) missing.push('ficha técnica de producto');
                if (!checks[4]) missing.push('botón de pedidos por WhatsApp');
                if (!checks[6]) missing.push('botones de compartir/instalar');
                const passed = checks.filter(Boolean).length;
                const pct = Math.round((passed / checks.length) * 100);
                const isGold = pct === 100;
                const notes = missing.length === 0
                  ? '¡Totalmente compatible! 100% de las reglas verificables.'
                  : `Le falta: ${missing.join(', ')}. Usada por ${usage} ${usage === 1 ? 'tienda' : 'tiendas'}.`;
                return (
                  <div key={tpl.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#f2f3fd]/10 transition-colors">
                    <div className="space-y-1 sm:max-w-[280px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{META[tpl.id]?.emoji || '🎨'}</span>
                        <span className="font-bold text-xs text-[#191b23]">{tpl.name}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isGold ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>{pct}%</span>
                      </div>
                      <p className="text-[10px] text-[#424754] font-semibold truncate leading-tight">plantilla/{tpl.id} · {passed} de {checks.length} reglas</p>
                      <p className="text-[10px] text-[#424754] leading-normal italic">{notes}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {RULE_TAGS.map((rule, idx) => {
                        const ok = checks[idx];
                        return (
                          <div key={idx} title={`${rule.label}: ${ok ? 'Cumplido' : 'Pendiente'}`}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold cursor-help ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-[#ba1a1a]'}`}>
                            <span className="material-symbols-outlined text-[10px] font-bold">{ok ? 'check' : 'warning'}</span>
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
