'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `paquetes`): paquetes comerciales
// y catálogo de módulos de expansión. Todo vive en memoria por ahora (no hay tablas todavía).

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import Toggle from '@/components/superadmin/Toggle';


interface Package {
  id: string | number;
  name: string;
  badge: string;
  features: string[];
  price: number;
  active: boolean;
  bannerUrl?: string;
  isPopular?: boolean;
}

// useSearchParams (para ?nuevo=1) exige un Suspense a su alrededor al compilar.
export default function PaquetesAdmin() {
  return (
    <Suspense fallback={null}>
      <PaquetesContenido />
    </Suspense>
  );
}

function PaquetesContenido() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/paquetes');
  }, [cargando, esSuperadmin, router]);

  // Paquetes state: los 4 paquetes oficiales de Boga Market para Perú
  const [packages, setPackages] = useState<Package[]>([
    {
      id: 'carta',
      name: 'Plan Carta',
      badge: 'Huariques & Menús',
      features: ['Hasta 100 productos', 'Catálogo QR', 'Pedidos WhatsApp sin comisión', 'PWA Instalable', 'Comprobante PDF'],
      price: 50,
      active: true,
      bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 'app',
      name: 'Plan App / Tienda',
      badge: 'Más Popular',
      features: ['Hasta 1,000 productos', 'Subdominio propio (.bogahub.app)', 'Notificaciones Push (2/sem)', 'Instalable en celular', 'Soporte prioritario'],
      price: 100,
      active: true,
      isPopular: true,
      bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 'supermercado',
      name: 'Plan Supermercado / Pro',
      badge: 'Alta Capacidad',
      features: ['Hasta 5,000 productos', 'Sincronización Loyverse POS en vivo', 'Soporte Dominio Propio (.pe / .com)', 'Inventario masivo en tiempo real', 'Alertas de stock bajo'],
      price: 199,
      active: true,
      bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 'franquicia',
      name: 'Plan Multi-Sede / Franquicia',
      badge: 'Empresarial',
      features: ['Múltiples sucursales', 'Métricas consolidadas por sede', 'Acceso gerentes y cajeros', 'Marca blanca incluida', 'Soporte VIP 24/7'],
      price: 399,
      active: true,
      bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60'
    }
  ]);
  // Packages management modals state
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    badge: '',
    price: 0,
    features: '',
    isPopular: false,
    active: true,
    bannerUrl: ''
  });

  // Package Actions
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: '',
      badge: '',
      price: 29,
      features: '10 Users, Core Analytics, Standard Support',
      isPopular: false,
      active: true,
      bannerUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKn9iOD2YOzoyu_3J71aa9z9RyJ3IfQV78LugrlEPkQNFCgDy-MnaS0g7s3nKXYulJhuJeY0JF69gjJo7xEerprAOkByz4HFKxNTw_bspTl4JL6BQ4NRADjhJe8LR4PTruCAcwipMaBqTM9YmKnPEVeXyhnJcd3DsN9GEFomdnMWqU21ild6RpWmeDmL57autUZD8geIwztAIFGBmaW_waD29_A3h1spjp4cS45g4cb1Si57yQ8Ht5IXYVEvO5_pZBFMSKneY35g'
    });
    setShowPackageModal(true);
  };

  const handleOpenEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      badge: pkg.badge,
      price: pkg.price,
      features: pkg.features.join(', '),
      isPopular: !!pkg.isPopular,
      active: pkg.active,
      bannerUrl: pkg.bannerUrl || ''
    });
    setShowPackageModal(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const splitFeatures = packageForm.features.split(',').map(f => f.trim()).filter(Boolean);
    
    if (editingPackage) {
      // Edit mode
      setPackages(prev => prev.map(p => p.id === editingPackage.id ? {
        ...p,
        name: packageForm.name,
        badge: packageForm.badge,
        price: Number(packageForm.price),
        features: splitFeatures,
        isPopular: packageForm.isPopular,
        active: packageForm.active,
        bannerUrl: packageForm.bannerUrl
      } : p));
    } else {
      // Create mode
      setPackages(prev => [...prev, {
        id: Date.now(),
        name: packageForm.name,
        badge: packageForm.badge,
        price: Number(packageForm.price),
        features: splitFeatures,
        isPopular: packageForm.isPopular,
        active: packageForm.active,
        bannerUrl: packageForm.bannerUrl
      }]);
    }
    setShowPackageModal(false);
  };

  const handleDeletePackage = (id: string | number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este paquete?')) {
      setPackages(prev => prev.filter(p => p.id !== id));
    }
  };

  const togglePackageActive = (id: string | number) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  // Desde el botón "Nuevo Paquete" del dashboard: /superadmin/paquetes?nuevo=1 abre el formulario.
  useEffect(() => {
    if (searchParams.get('nuevo') === '1') handleOpenCreatePackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <SuperadminSubheader title="Paquetes" icon="inventory_2" />
      <main className="max-w-[900px] mx-auto px-4 py-8">
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b border-[#c2c6d6] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#191b23]">Niveles de Suscripción</h2>
                  <p className="text-xs text-[#424754] mt-1">Define y administra los paquetes comerciales para las tiendas del ecosistema.</p>
                </div>
                <button 
                  onClick={handleOpenCreatePackage}
                  className="h-10 px-4 bg-[#0058be] text-white font-bold text-xs rounded-md flex items-center gap-1.5 hover:shadow-lg transition-all active:scale-95 shrink-0 self-start"
                >
                  <span className="material-symbols-outlined text-sm">add_box</span>
                  Crear Nuevo Paquete
                </button>
              </div>

              {/* Los precios (incluidos los paquetes de carga de productos) ahora se editan en Cobros → Precios */}
              <div className="p-4 bg-white border border-[#c2c6d6] rounded-md flex items-center justify-between gap-3">
                <p className="text-xs text-[#424754] font-semibold">
                  Los precios, lo que trae cada plan, los módulos que se venden y los niveles se ven y se editan en <b>Cobros → Precios</b>.
                </p>
                <a href="/superadmin/cobros" className="shrink-0 h-9 px-4 bg-[#0058be] text-white font-bold text-xs rounded-md inline-flex items-center">Ir a Precios</a>
              </div>

              {/* Paquetes Comerciales Oficiales de Boga Market */}
              <div className="border border-[#c2c6d6] rounded-md bg-white p-5 flex flex-col gap-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#c2c6d6] pb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#191b23] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#0058be]">package_2</span>
                      Paquetes Comerciales Oficiales Boga Market (Perú)
                    </h3>
                    <p className="text-xs text-[#424754] mt-0.5">
                      Planes mensuales en Soles (S/) adaptados al comercio local y escalonados por volumen de catálogo.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#0058be] bg-[#d8e2ff] px-2.5 py-1 rounded-full w-fit">
                    Moneda: Soles (PEN)
                  </span>
                </div>

              {/* Metrics Bento Grid */}
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 p-5 bg-[#f8f9ff] border border-[#c2c6d6] rounded-md flex flex-col justify-between relative overflow-hidden">
                  <div className="z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Total de Paquetes</span>
                    <div className="text-2xl font-bold mt-1 text-[#191b23]">{packages.length}</div>
                    <div className="flex items-center gap-1 text-[#0058be] text-[10px] font-semibold mt-2">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      <span>4 niveles escalonados</span>
                    </div>
                  </div>
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-[100px]">inventory_2</span>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Activos</span>
                    <div className="text-2xl font-bold mt-1 text-[#0058be]">{packages.filter(p => p.active).length}</div>
                  </div>
                  <div className="h-1.5 w-full bg-[#ecedf7] rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#0058be]" style={{ width: `${(packages.filter(p => p.active).length / packages.length) * 100}%` }}></div>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#c2c6d6] rounded-md flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Inactivos</span>
                    <div className="text-2xl font-bold mt-1 text-[#595c5e]">{packages.filter(p => !p.active).length}</div>
                  </div>
                  <div className="h-1.5 w-full bg-[#ecedf7] rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#595c5e]" style={{ width: `${(packages.filter(p => !p.active).length / packages.length) * 100}%` }}></div>
                  </div>
                </div>
              </section>

              {/* Package Grid */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#191b23]">Tiers Publicados en Boga</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => {
                    const isPopular = pkg.isPopular;
                    return (
                      <div 
                        key={pkg.id} 
                        className={`group bg-white border rounded-md overflow-hidden transition-all duration-200 flex flex-col hover:translate-y-[-2px] hover:shadow-md ${
                          isPopular ? 'border-[#0058be] ring-2 ring-[#0058be]' : 'border-[#c2c6d6]'
                        }`}
                      >
                        {/* Header banner */}
                        <div className={`h-24 p-4 flex items-end relative overflow-hidden ${isPopular ? 'bg-[#0058be]' : 'bg-[#f2f3fd]'}`}>
                          {pkg.bannerUrl && (
                            <img className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-25" src={pkg.bannerUrl} alt="" />
                          )}
                          <div className="z-10 flex flex-col">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold w-fit mb-1 ${
                              isPopular ? 'bg-white text-[#0058be]' : 'bg-[#2170e4] text-white'
                            }`}>
                              {pkg.badge}
                            </span>
                            <h4 className={`text-base font-bold leading-tight ${isPopular ? 'text-white' : 'text-[#191b23]'}`}>
                              {pkg.name}
                            </h4>
                          </div>
                        </div>

                        {/* Specs */}
                        <div className="p-4 flex flex-col gap-4 flex-1">
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.features.map((feat, idx) => (
                              <span 
                                key={idx} 
                                className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                                  isPopular 
                                    ? 'bg-[#d8e2ff] text-[#004395] border-[#adc6ff]' 
                                    : 'bg-[#ecedf7] text-[#424754] border-[#c2c6d6]'
                                }`}
                              >
                                {feat}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-2">
                            <div>
                              <span className="text-xl font-extrabold text-[#191b23]">S/ {pkg.price}</span>
                              <span className="text-[10px] text-[#424754] font-medium">/mes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${pkg.active ? 'text-[#0058be]' : 'text-[#595c5e]'}`}>
                                {pkg.active ? 'Activo' : 'Inactivo'}
                              </span>
                              <Toggle on={pkg.active} onChange={() => togglePackageActive(pkg.id)} />
                            </div>
                          </div>
                        </div>

                        {/* Actions footer */}
                        <div className={`p-2 border-t flex justify-end gap-1 ${
                          isPopular ? 'bg-[#d8e2ff]/20 border-[#0058be]/20' : 'bg-[#f2f3fd]/50 border-[#c2c6d6]/50'
                        }`}>
                          <button 
                            onClick={() => handleOpenEditPackage(pkg)} 
                            className="p-1.5 text-[#424754] hover:text-[#0058be] hover:bg-[#ecedf7] rounded transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)} 
                            className="p-1.5 text-[#424754] hover:text-[#ba1a1a] hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              </div>
            </div>
      </main>

    {showPackageModal && (
      <div className="fixed inset-0 z-[200] bg-[#191b23]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-[#c2c6d6] shadow-2xl w-[90vw] md:w-[460px] max-w-[460px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#c2c6d6] bg-[#f2f3fd] flex items-center justify-between shrink-0">
            <h3 className="font-bold text-sm text-[#191b23]">
              {editingPackage ? 'Editar Nivel de Suscripción' : 'Crear Nuevo Nivel'}
            </h3>
            <button 
              onClick={() => setShowPackageModal(false)}
              className="w-7 h-7 flex items-center justify-center text-[#424754] hover:bg-[#e6e7f2] rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          
          <form onSubmit={handleSavePackage} className="p-5 space-y-4 flex-1 overflow-y-auto min-h-0">
            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Nombre del Plan</label>
              <input
                type="text"
                required
                placeholder="Ej. Pro Bundle, Basic Tier"
                value={packageForm.name}
                onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Precio Mensual ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ej. 129"
                  value={packageForm.price}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Etiqueta</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Entry Level, Scale"
                  value={packageForm.badge}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, badge: e.target.value }))}
                  className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Características (separadas por comas)</label>
              <textarea
                required
                rows={2}
                placeholder="Ej. 25 Users, Priority Support, API Access"
                value={packageForm.features}
                onChange={(e) => setPackageForm(prev => ({ ...prev, features: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#424754] mb-1.5 uppercase tracking-wide">Imagen del Banner (URL)</label>
              <input
                type="text"
                placeholder="Ej. https://url-de-la-imagen.png"
                value={packageForm.bannerUrl}
                onChange={(e) => setPackageForm(prev => ({ ...prev, bannerUrl: e.target.value }))}
                className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#0058be] transition-colors"
              />
            </div>

            <div className="space-y-3 bg-[#f2f3fd]/55 p-4 rounded-md border border-[#c2c6d6]/60">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-[#424754]">¿Plan Destacado / Popular?</span>
                <Toggle on={packageForm.isPopular} onChange={() => setPackageForm(prev => ({ ...prev, isPopular: !prev.isPopular }))} />
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[#c2c6d6]/40 pt-2">
                <span className="text-xs font-bold text-[#424754]">¿Plan Activo?</span>
                <Toggle on={packageForm.active} onChange={() => setPackageForm(prev => ({ ...prev, active: !prev.active }))} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="flex-1 py-2.5 bg-[#ecedf7] text-[#424754] rounded-lg font-bold text-xs hover:bg-[#e6e7f2] transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 bg-[#0058be] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                Guardar Nivel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
}
