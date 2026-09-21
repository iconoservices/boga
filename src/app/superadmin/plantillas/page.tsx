'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `plantillas`,
// "Gestión de Plantillas"). Solo necesita de las tiendas el slug + template
// (para contar uso), no el StoreConfig completo que usa la pestaña Tiendas.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import { supabase } from '@/lib/supabase';
import { getTemplate, getAllTemplates } from '@/lib/templates.config';
import { uploadFile } from '@/lib/uploadClient';

// Datos de presentacion comercial que no viven en templates.config (descripcion
// e imagen de portada). Si una plantilla no esta aca, cae a su heroImage.
const TEMPLATE_PRESENTATION: Record<string, { category?: string; description: string; previewUrl: string }> = {
  menudirecto: {
    category: 'Restaurantes',
    description: 'Abre directo en la carta, sin pantalla de inicio. Menos pasos entre entrar y pedir: ideal para delivery y comida rápida.',
    previewUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  },
  iniciocatalogo: {
    category: 'Restaurantes',
    description: 'Portada de bienvenida con los platos justo debajo. El home clásico de tienda: presenta el local y muestra qué se puede pedir.',
    previewUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  },
  default: {
    category: 'Negocios',
    description: 'Diseño minimalista que prioriza el contenido visual y la simplicidad estructural.',
    previewUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&q=80',
  },
  sunset: {
    category: 'Gourmet',
    description: 'Enfoque visual y misterioso en gastronomía y bar, ideal para restaurantes con menús dinámicos y luz tenue.',
    previewUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
  },
  natura: {
    category: 'Salud',
    description: 'Estilo claro y fresco con toques verdes ideal para clínicas, consultorios y venta de productos orgánicos.',
    previewUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80',
  },
  amazonia: {
    category: 'Comercio',
    description: 'Experiencia de compra vibrante con galerías de alta resolución y colores inspirados en la naturaleza.',
    previewUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
  },
  sweetkittynails: {
    category: 'Salud',
    description: 'Estilo rosa pastel optimizado para reservas de citas y servicios estéticos o salones de belleza.',
    previewUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
  },
  estilosmirka: {
    category: 'Comercio',
    description: 'Diseño de boutique de moda premium con gran espacio para fotos de prendas, catálogos y colecciones de temporada.',
    previewUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
  },
  polleria: {
    category: 'Gourmet',
    description: 'Estilo cálido y rústico optimizado para pollerías, parrilladas y restaurantes de comida rápida con fotos grandes y navegación fluida.',
    previewUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&q=80',
  },
  mercado: {
    category: 'Comercio',
    description: 'El look del marketplace de BogaHub para una sola tienda: banners, categorías y catálogo amplio. Ideal para minimarket, ferretería, farmacia o distribuidora.',
    previewUrl: 'https://images.unsplash.com/photo-1580913428735-bd3c269d6a82?w=600&q=80',
  },
  flores: {
    category: 'Comercio',
    description: 'Estilo delicado en tonos rosa con categorías para ramos, arreglos, plantas y detalles. Pensado para florerías y regalos.',
    previewUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&q=80',
  },
  fichadigital: {
    category: 'Restaurantes',
    description: 'Ficha de negocio tipo reemplazo del PDF de carta: portada superpuesta con logo, horario y dirección, categorías en círculo y menú debajo. Pedido por WhatsApp o llamada en un toque.',
    previewUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80',
  },
  fichaplana: {
    category: 'Restaurantes',
    description: 'Misma ficha de negocio que Ficha Digital, con la portada integrada a la página en vez de superpuesta. Categorías en círculo, menú debajo y pedido por WhatsApp o llamada en un toque.',
    previewUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  },
  terreno1: {
    category: 'Inmuebles',
    description: 'Estilo inmobiliaria moderna: cabecera blanca redondeada sobre la portada, buscador por zona en una tarjeta y terrenos en tarjetas limpias. Consulta por WhatsApp.',
    previewUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80',
  },
  terreno2: {
    category: 'Inmuebles',
    description: 'Estilo portal de tierras: portada a sangre con título en serif, barra de búsqueda grande y grilla de fotos con el precio bien visible. Consulta por WhatsApp.',
    previewUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
  },
  veterinaria: {
    category: 'Salud',
    description: 'Veterinaria y pet shop: portada, ficha del local, tienda de productos y una Cartilla digital de mascota con semáforo de vacunas y botón de cita por WhatsApp.',
    previewUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
  },
};

// Que significa cada categoria visual: se muestra como ayuda al elegir la
// categoria de una plantilla y al filtrar la grilla. Deriva de como se usan
// hoy en TEMPLATE_PRESENTATION, no es una taxonomia inventada aparte.
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Comercio: 'Venta de productos físicos con catálogo visual: moda, mercado, artesanías. Fotos grandes, checkout simple.',
  Gourmet: 'Restaurantes y bares de ambiente cuidado, con identidad visual fuerte propia (no genérica).',
  Negocios: 'Diseño neutro y minimalista para cualquier rubro que todavía no tiene una plantilla especializada.',
  Restaurantes: 'Comida rápida y delivery: menos pasos entre entrar y pedir, categorías de platos siempre a la vista.',
  Inmuebles: 'Terrenos, lotes y casas en venta: buscador por zona, fotos grandes y precio visible; el contacto es por WhatsApp.',
  Salud: 'Servicios con cita previa: clínicas, salones de belleza, bienestar. Foco en horarios y reservas.',
};

interface AdminTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  previewUrl: string;
  featured: boolean;
}

export default function PlantillasPage() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/plantillas');
  }, [cargando, esSuperadmin, router]);

  // Solo slug + template de cada tienda, para el conteo de uso — no hace
  // falta el StoreConfig completo que arma la pestaña Tiendas.
  const [storeTemplates, setStoreTemplates] = useState<{ slug: string; template: string | null }[]>([]);
  useEffect(() => {
    supabase.from('stores').select('slug, template').then(({ data }) => {
      if (data) setStoreTemplates(data as { slug: string; template: string | null }[]);
    });
  }, []);

  // La lista se deriva de templates.config (fuente unica). Antes estaba duplicada
  // a mano aca, asi que cada plantilla nueva no aparecia y los nombres se
  // desincronizaban. Aca solo viven los campos que la config no tiene:
  // la descripcion comercial y la imagen de portada.
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, Partial<AdminTemplate>>>({});
  const [hiddenTemplates, setHiddenTemplates] = useState<string[]>([]);

  // Plantillas en foco de trabajo activo (no es popularidad de uso real, eso ya
  // lo muestra "usage" por tienda). Arranca con las dos de Restaurantes mas
  // nuevas para diferenciarlas del resto mientras se terminan de pulir.
  const [featuredTemplates, setFeaturedTemplates] = useState<string[]>(['menudirecto', 'iniciocatalogo']);
  const toggleFeaturedTemplate = (id: string) =>
    setFeaturedTemplates(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const adminTemplates: AdminTemplate[] = useMemo(() => {
    const base = getTemplate('default');
    const todas = base ? [base, ...getAllTemplates()] : getAllTemplates();

    return todas
      .filter(t => !hiddenTemplates.includes(t.id))
      .map(t => {
        const extra = TEMPLATE_PRESENTATION[t.id];
        const override = templateOverrides[t.id] || {};
        return {
          id: t.id,
          name: override.name ?? t.name,
          category: override.category ?? extra?.category ?? t.category,
          description: override.description ?? extra?.description ?? `Plantilla ${t.name} para el rubro ${t.category}.`,
          previewUrl: override.previewUrl ?? extra?.previewUrl ?? t.heroImage,
          featured: featuredTemplates.includes(t.id),
        };
      });
  }, [templateOverrides, hiddenTemplates, featuredTemplates]);

  // Se deriva de las categorias reales de adminTemplates (antes era una lista
  // fija a mano que se desincronizo: le faltaba "Restaurantes" -por eso Menu
  // Directo y Pollería nunca aparecian al filtrar- y sobraba "Tecnología", que
  // ninguna plantilla usa.
  const templateCategories = useMemo(
    () => ['Todas', ...Array.from(new Set(adminTemplates.map(t => t.category))).sort()],
    [adminTemplates]
  );

  const [templateFilter, setTemplateFilter] = useState<string>('Todas');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    category: 'Comercio',
    description: '',
    previewUrl: ''
  });
  const [templateImageFile, setTemplateImageFile] = useState<File | null>(null);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const templateImageInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      id: '',
      name: '',
      category: 'Comercio',
      description: '',
      previewUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80'
    });
    setTemplateImageFile(null);
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = (tpl: AdminTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      description: tpl.description,
      previewUrl: tpl.previewUrl
    });
    setTemplateImageFile(null);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.id || !templateForm.name) return;

    if (editingTemplate) {
      let previewUrl = templateForm.previewUrl;

      // Si el superadmin subio un archivo, va al mismo bucket que usan las
      // portadas de tienda ('store-assets'); si falla la subida se guarda con
      // la URL que ya estaba en el campo en vez de perder el resto del cambio.
      if (templateImageFile) {
        setIsTemplateSaving(true);
        try {
          previewUrl = await uploadFile(templateImageFile, 'store-assets/templates');
        } catch (err) {
          console.error('Error subiendo imagen de plantilla:', err);
        }
        setIsTemplateSaving(false);
      }

      setTemplateOverrides(prev => ({
        ...prev,
        [editingTemplate.id]: {
          name: templateForm.name,
          category: templateForm.category,
          description: templateForm.description,
          previewUrl,
        },
      }));
      setTemplateImageFile(null);
      setShowTemplateModal(false);
      return;
    }

    // Una plantilla no es un registro: es un componente en src/templates/ mas su
    // entrada en templates.config.ts. No se puede crear desde aca.
    alert(
      'Las plantillas se crean en el código, no desde el panel.\n\n' +
      'Para agregar una:\n' +
      '1. Creá el componente en src/templates/<id>/\n' +
      '2. Registralo en src/lib/templates.config.ts y en StoreRenderer\n\n' +
      'Una vez hecho eso aparece acá automáticamente.'
    );
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm(`¿Ocultar la plantilla "${id}" del panel?\n\nNo se borra del código: seguirá disponible hasta que la quites de templates.config.ts.`)) {
      setHiddenTemplates(prev => [...prev, id]);
    }
  };

  const getTemplateUsageCount = (tplId: string) => {
    return storeTemplates.filter(s => s.template === tplId).length;
  };

  if (cargando) return <div className="p-10 text-center text-[#424754] text-sm font-semibold">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23]">
      <SuperadminSubheader title="Gestión de Plantillas" icon="layers" />
      <main className="max-w-[1100px] mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b border-[#c2c6d6] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#191b23]">Gestión de Plantillas</h2>
            <p className="text-xs text-[#424754] mt-1">Crea y personaliza la experiencia visual de los sitios del ecosistema.</p>
          </div>
          <button
            onClick={handleOpenCreateTemplate}
            className="h-10 px-4 bg-[#0058be] text-white font-bold text-xs rounded-md flex items-center gap-1.5 hover:shadow-lg transition-all active:scale-95 shrink-0 self-start"
          >
            <span className="material-symbols-outlined text-sm">add_box</span>
            Crear Nueva Plantilla
          </button>
        </div>

        {/* Summary Cards (Bento Style) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Total Plantillas</span>
              <div className="text-2xl font-bold mt-1 text-[#191b23]">{adminTemplates.length}</div>
              <div className="flex items-center gap-1 text-[#0058be] text-[10px] font-semibold mt-2">
                <span className="material-symbols-outlined text-[14px]">layers</span>
                <span>Disponibles en el portal</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Más Populares</span>
              <div className="text-base font-bold mt-1 text-[#0058be] truncate">
                {(() => {
                  const sorted = [...adminTemplates].sort((a, b) => getTemplateUsageCount(b.id) - getTemplateUsageCount(a.id));
                  return sorted[0] ? `${sorted[0].name} (${getTemplateUsageCount(sorted[0].id)} usos)` : 'Ninguna';
                })()}
              </div>
              <span className="text-[10px] text-[#424754] mt-2 block">Mayor adopción por comercios</span>
            </div>
          </div>

          <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Tasa de Adopción</span>
              <div className="text-2xl font-bold mt-1 text-[#191b23]">
                {(() => {
                  const totalStoresCount = storeTemplates.length || 1;
                  const storesWithTemplate = storeTemplates.filter(s => s.template && s.template !== 'default').length;
                  const pct = Math.round((storesWithTemplate / totalStoresCount) * 100);
                  return `${pct}% personalizadas`;
                })()}
              </div>
              <span className="text-[10px] text-[#424754] mt-2 block">Uso de plantillas avanzadas</span>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {templateCategories.map(cat => {
            const isActive = templateFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setTemplateFilter(cat)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0058be] text-white shadow-sm'
                    : 'bg-[#ecedf7] text-[#424754] hover:bg-[#e6e7f2]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Templates Grid */}
        <section className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {adminTemplates
            .filter(t => templateFilter === 'Todas' || t.category === templateFilter)
            .map((tpl) => {
              const usage = getTemplateUsageCount(tpl.id);
              return (
                <div
                  key={tpl.id}
                  className="group bg-white border border-[#c2c6d6] rounded-sm overflow-hidden hover:shadow-sm transition-all duration-200 flex flex-col"
                >
                  {/* Preview Image */}
                  <div className="h-24 overflow-hidden relative bg-neutral-100 shrink-0">
                    {tpl.previewUrl ? (
                      <img
                        alt={tpl.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src={tpl.previewUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#c2c6d6]">
                        <span className="material-symbols-outlined text-3xl">broken_image</span>
                      </div>
                    )}
                    <div className="absolute top-1 left-1">
                      <span className="bg-[#0058be]/90 text-white text-[7px] font-extrabold px-1 py-0.5 rounded backdrop-blur-xs uppercase tracking-wider">
                        {tpl.category}
                      </span>
                    </div>
                    {tpl.featured && (
                      <div className="absolute top-1 right-1">
                        <span className="bg-[#f2ca50]/95 text-[#3c2f00] text-[7px] font-extrabold px-1 py-0.5 rounded backdrop-blur-xs uppercase tracking-wider flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          Destacada
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-2 flex flex-col gap-1 flex-1">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="text-[11px] font-bold text-[#191b23] leading-tight line-clamp-1">{tpl.name}</h4>
                      <span className="text-[7px] font-bold bg-[#f2f3fd] text-[#0058be] border border-[#c2c6d6]/60 px-1 py-0.2 rounded shrink-0">
                        {tpl.id}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#424754] font-medium leading-normal line-clamp-2">
                      {tpl.description}
                    </p>

                    <div className="flex items-center gap-1 mt-auto pt-1 text-[8px] font-bold text-[#424754]">
                      <span className="material-symbols-outlined text-xs text-[#0058be]">storefront</span>
                      <span>{usage} {usage === 1 ? 'tienda' : 'tiendas'}</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-1 border-t border-[#ecedf7] bg-[#f2f3fd]/40 flex justify-end gap-0.5">
                    <button
                      onClick={() => toggleFeaturedTemplate(tpl.id)}
                      className={`p-1 rounded transition-colors flex items-center justify-center ${
                        tpl.featured
                          ? 'text-[#f2ca50] hover:bg-[#f2ca50]/10'
                          : 'text-[#545f73] hover:text-[#f2ca50] hover:bg-[#ecedf7]'
                      }`}
                      title={tpl.featured ? 'Quitar de destacadas' : 'Marcar como destacada'}
                    >
                      <span className="material-symbols-outlined text-[12px]" style={tpl.featured ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {tpl.featured ? 'star' : 'star_outline'}
                      </span>
                    </button>
                    <a
                      href={`/preview/${tpl.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-[#545f73] hover:text-[#0058be] hover:bg-[#ecedf7] rounded transition-colors flex items-center justify-center"
                      title="Ver Vista Previa / Demo"
                    >
                      <span className="material-symbols-outlined text-[12px]">visibility</span>
                    </a>

                    <button
                      onClick={() => handleOpenEditTemplate(tpl)}
                      className="p-1 text-[#545f73] hover:text-[#0058be] hover:bg-[#ecedf7] rounded transition-colors flex items-center justify-center"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[12px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      disabled={usage > 0}
                      className={`p-1 rounded transition-colors flex items-center justify-center ${
                        usage > 0
                          ? 'text-[#c2c6d6] cursor-not-allowed opacity-50'
                          : 'text-[#545f73] hover:text-[#ba1a1a] hover:bg-red-50'
                      }`}
                      title={usage > 0 ? "No se puede eliminar porque está en uso" : "Eliminar"}
                    >
                      <span className="material-symbols-outlined text-[12px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </section>
      </main>

      {/* ── CREATE / EDIT TEMPLATE MODAL ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-[#191b23]">
                {editingTemplate ? 'Editar Plantilla Visual' : 'Crear Nueva Plantilla'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-7 h-7 flex items-center justify-center text-[#424754] hover:bg-[#e6e7f2] rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre de la Plantilla</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sunset Dark, Corporate Pro"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({
                    ...prev,
                    name: e.target.value,
                    id: editingTemplate ? prev.id : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Identificador (ID / Slug)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingTemplate}
                  placeholder="Ej. sunset-dark"
                  value={templateForm.id}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9\-]+/g, '') }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors disabled:bg-[#e6e7f2] disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Categoría Visual</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                >
                  {templateCategories.filter(cat => cat !== 'Todas').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {CATEGORY_DESCRIPTIONS[templateForm.category] && (
                  <p className="text-[10px] text-[#424754] mt-1.5 leading-snug">
                    {CATEGORY_DESCRIPTIONS[templateForm.category]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Descripción</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe brevemente el estilo y para qué tipos de comercios se recomienda esta plantilla..."
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide font-sans">Imagen de Vista Previa</label>
                <input
                  type="file"
                  ref={templateImageInputRef}
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setTemplateImageFile(e.target.files[0]);
                      setTemplateForm(prev => ({ ...prev, previewUrl: URL.createObjectURL(e.target.files![0]) }));
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => templateImageInputRef.current?.click()}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-[#c2c6d6] overflow-hidden cursor-pointer relative group hover:border-[#0058be] transition-colors bg-[#f9f9ff]"
                >
                  {templateForm.previewUrl ? (
                    <>
                      <img src={templateForm.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-opacity">
                        Cambiar Imagen
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#424754]">
                      <span className="material-symbols-outlined text-2xl mb-1">landscape</span>
                      <span className="text-xs font-bold">Clic para subir imagen</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTemplateSaving}
                  className="flex-1 py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-lg transition-all disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  {isTemplateSaving ? 'Subiendo imagen...' : 'Guardar Plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
