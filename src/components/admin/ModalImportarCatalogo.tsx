'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface ModalImportarCatalogoProps {
  isOpen: boolean;
  onClose: () => void;
  targetStoreSlug: string;
  targetStoreName?: string;
  userStores?: Array<{ slug: string; name: string }>;
  onProductosImportados: () => void;
}

interface ProveedorStore {
  slug: string;
  name: string;
  marketplace_category?: string;
  logo_image?: string;
  whatsapp?: string;
  notas_revendedores?: string;
  esPropia?: boolean;
}

interface ProductoProveedor {
  id: string | number;
  name: string;
  price: number;
  category?: string;
  subcategory?: string;
  image?: string;
  description?: string;
  stock?: number;
  status?: string;
}

export default function ModalImportarCatalogo({
  isOpen,
  onClose,
  targetStoreSlug,
  targetStoreName,
  userStores = [],
  onProductosImportados,
}: ModalImportarCatalogoProps) {
  const [proveedores, setProveedores] = useState<ProveedorStore[]>([]);
  const [selectedProveedorSlug, setSelectedProveedorSlug] = useState<string>('');
  const [cargandoProveedores, setCargandoProveedores] = useState(false);

  const [productos, setProductos] = useState<ProductoProveedor[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [filtroTexto, setFiltroTexto] = useState('');

  // Ajuste de precios: 'mismo' | 'subir' | 'bajar'
  const [ajusteTipo, setAjusteTipo] = useState<'mismo' | 'subir' | 'bajar'>('mismo');
  const [porcentajeAjuste, setPorcentajeAjuste] = useState<number>(15);

  const [importando, setImportando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Cargar lista de tiendas que permiten revendedores + otras tiendas del usuario
  useEffect(() => {
    if (!isOpen) return;
    setMensajeExito(null);
    setErrorMsg(null);
    setCargandoProveedores(true);

    const cargar = async () => {
      try {
        // Consultar tiendas con permite_revendedores = true
        const { data: dbData } = await supabase
          .from('stores')
          .select('slug,name,marketplace_category,logo_image,whatsapp,notas_revendedores,permite_revendedores')
          .eq('permite_revendedores', true)
          .neq('slug', targetStoreSlug)
          .limit(50);

        const lista: ProveedorStore[] = (dbData || []).map((s: any) => ({
          slug: s.slug,
          name: s.name,
          marketplace_category: s.marketplace_category,
          logo_image: s.logo_image,
          whatsapp: s.whatsapp,
          notas_revendedores: s.notas_revendedores,
          esPropia: false,
        }));

        // Sumar las propias tiendas del usuario (para auto-competencia / remates)
        (userStores || []).forEach((us) => {
          if (us.slug !== targetStoreSlug && !lista.some((x) => x.slug === us.slug)) {
            lista.unshift({
              slug: us.slug,
              name: us.name,
              esPropia: true,
              notas_revendedores: 'Tu propia tienda (ideal para remate/outlet)',
            });
          } else if (us.slug !== targetStoreSlug) {
            const item = lista.find((x) => x.slug === us.slug);
            if (item) item.esPropia = true;
          }
        });

        setProveedores(lista);
        if (lista.length > 0 && !selectedProveedorSlug) {
          setSelectedProveedorSlug(lista[0].slug);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setCargandoProveedores(false);
      }
    };

    cargar();
  }, [isOpen, targetStoreSlug, userStores]);

  // 2. Al seleccionar una tienda proveedora, cargar sus productos activos
  useEffect(() => {
    if (!selectedProveedorSlug || !isOpen) return;
    setCargandoProductos(true);
    setErrorMsg(null);

    const cargarProds = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id,name,price,category,subcategory,image,description,stock,status')
          .eq('store', selectedProveedorSlug)
          .neq('status', 'Inactivo')
          .limit(300);

        if (error) throw error;
        const prods = (data || []) as ProductoProveedor[];
        setProductos(prods);
        // Por defecto: TODOS seleccionados
        setSelectedIds(new Set(prods.map((p) => p.id)));
      } catch (err: any) {
        setErrorMsg('No se pudieron cargar los productos: ' + err.message);
        setProductos([]);
        setSelectedIds(new Set());
      } finally {
        setCargandoProductos(false);
      }
    };

    cargarProds();
  }, [selectedProveedorSlug, isOpen]);

  // Proveedor actualmente seleccionado
  const proveedorActual = useMemo(() => {
    return proveedores.find((p) => p.slug === selectedProveedorSlug);
  }, [proveedores, selectedProveedorSlug]);

  // Productos filtrados por texto
  const productosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return productos;
    const q = filtroTexto.toLowerCase();
    return productos.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [productos, filtroTexto]);

  // Función para calcular precio ajustado
  const calcularPrecioAjustado = (precioOriginal: number): number => {
    if (ajusteTipo === 'mismo') return precioOriginal;
    const factor = ajusteTipo === 'subir' ? 1 + porcentajeAjuste / 100 : 1 - porcentajeAjuste / 100;
    const nuevo = Math.round(precioOriginal * factor * 10) / 10;
    return Math.max(0.5, nuevo);
  };

  // Toggle de selección individual
  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle todos
  const toggleTodos = () => {
    if (selectedIds.size === productos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(productos.map((p) => p.id)));
    }
  };

  // 3. Ejecutar importación
  const handleImportar = async () => {
    if (selectedIds.size === 0 || !selectedProveedorSlug || importando) return;
    setImportando(true);
    setErrorMsg(null);

    try {
      const prodsToClone = productos.filter((p) => selectedIds.has(p.id));

      // Extraer categorías únicas para clonar en la tienda destino
      const categoriasNuevas = Array.from(
        new Set(prodsToClone.map((p) => p.category).filter(Boolean) as string[])
      );

      // Cargar categorías actuales de la tienda destino
      const { data: storeActual } = await supabase
        .from('stores')
        .select('categories')
        .eq('slug', targetStoreSlug)
        .maybeSingle();

      const catsActuales: Array<{ name: string; icon: string; href: string }> =
        (storeActual?.categories as any) || [];

      // Añadir categorías que falten
      const catsActualizadas = [...catsActuales];
      categoriasNuevas.forEach((catName) => {
        if (!catsActualizadas.some((c) => c.name.toLowerCase() === catName.toLowerCase())) {
          catsActualizadas.push({
            name: catName,
            icon: 'inventory_2',
            href: catName.toLowerCase().replace(/\s+/g, '-'),
          });
        }
      });

      // Actualizar categorías y marcar tienda_proveedora en Supabase
      await supabase
        .from('stores')
        .update({
          categories: catsActualizadas,
          tienda_proveedora: selectedProveedorSlug,
          es_revendedor: !proveedorActual?.esPropia,
        })
        .eq('slug', targetStoreSlug);

      // Preparar payload de productos
      const rowsToInsert = prodsToClone.map((p) => ({
        name: p.name,
        store: targetStoreSlug,
        price: calcularPrecioAjustado(Number(p.price) || 0),
        category: p.category || 'General',
        subcategory: p.subcategory || null,
        image: p.image || null,
        description: p.description || '',
        stock: p.stock ?? null,
        status: 'Activo',
        proveedor_store: selectedProveedorSlug,
        proveedor_product_id: String(p.id),
      }));

      // Insertar en la tabla products
      const { error: insertError } = await supabase.from('products').insert(rowsToInsert);
      if (insertError) throw insertError;

      setMensajeExito(`¡Éxito! Se importaron ${rowsToInsert.length} productos a tu tienda.`);
      onProductosImportados();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg('Error al importar: ' + (err.message || 'Error desconocido'));
    } finally {
      setImportando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#18171c] w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-[#18171c]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[24px]">handshake</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                Importar Productos de Tienda Aliada
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Copia catálogo para reventa (Dropshipping) o para tu tienda de remates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PASO 1: Elegir Tienda Proveedora */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              1. Selecciona la Tienda de Origen (Proveedor o Tu Otra Tienda)
            </label>

            {cargandoProveedores ? (
              <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                Buscando tiendas aliadas...
              </div>
            ) : proveedores.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 text-amber-900 dark:text-amber-200 text-xs">
                <p className="font-bold">Aún no hay tiendas con catálogo abierto para revendedores.</p>
                <p className="mt-1 opacity-90">
                  Puedes activar la opción <b>«Permitir catálogo para revendedores»</b> en tu tienda principal, o si tienes varias tiendas aparecerán aquí para clonarse.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {proveedores.map((p) => {
                  const activa = selectedProveedorSlug === p.slug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setSelectedProveedorSlug(p.slug)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        activa
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1 ring-primary'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-neutral-900/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 font-bold text-gray-500 text-sm">
                        {p.logo_image ? (
                          <img src={p.logo_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                            {p.name}
                          </span>
                          {p.esPropia ? (
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                              Mi tienda
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                              Proveedor
                            </span>
                          )}
                        </div>
                        {p.notas_revendedores && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                            {p.notas_revendedores}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PASO 2: Ajuste de Precios */}
          {selectedProveedorSlug && (
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-neutral-900/80 border border-gray-200/70 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  2. Estrategia de Precios para tu Tienda
                </label>
                <span className="text-[11px] text-gray-500">
                  {ajusteTipo === 'mismo' && 'Precios iguales al proveedor'}
                  {ajusteTipo === 'subir' && `+${porcentajeAjuste}% ganancia de revendedor`}
                  {ajusteTipo === 'bajar' && `-${porcentajeAjuste}% precio de remate / outlet`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAjusteTipo('mismo')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    ajusteTipo === 'mismo'
                      ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white border-primary shadow-xs'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  🔵 Mismo Precio
                </button>

                <button
                  type="button"
                  onClick={() => setAjusteTipo('subir')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    ajusteTipo === 'subir'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  🟢 Subir Margen (+%)
                </button>

                <button
                  type="button"
                  onClick={() => setAjusteTipo('bajar')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    ajusteTipo === 'bajar'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-500 shadow-xs'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  🔴 Rebajar / Remate (-%)
                </button>
              </div>

              {ajusteTipo !== 'mismo' && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {ajusteTipo === 'subir' ? 'Aumentar en:' : 'Descontar en:'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPorcentajeAjuste(pct)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          porcentajeAjuste === pct
                            ? 'bg-primary text-white'
                            : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400 ml-auto">
                    Ej: S/ 50.00 → S/ {calcularPrecioAjustado(50).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Selección de Productos */}
          {selectedProveedorSlug && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  3. Selecciona los Productos a Importar ({selectedIds.size} de {productos.length})
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTodos}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {selectedIds.size === productos.length ? 'Desmarcar todos' : 'Marcar todos [✓]'}
                  </button>
                </div>
              </div>

              {/* Buscador de productos */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o categoría..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                />
              </div>

              {/* Lista con checkboxes */}
              {cargandoProductos ? (
                <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  Cargando productos de la tienda...
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  No se encontraron productos para esta búsqueda.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5 border border-gray-200 dark:border-neutral-800 rounded-2xl">
                  {productosFiltrados.map((prod) => {
                    const checked = selectedIds.has(prod.id);
                    const precioAjustado = calcularPrecioAjustado(Number(prod.price) || 0);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleSelect(prod.id)}
                        className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                          checked
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-gray-50 dark:hover:bg-neutral-900/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}} // controlado por div
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 shrink-0 cursor-pointer"
                        />

                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.image ? (
                            <img src={prod.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-gray-400 text-lg">
                              image
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {prod.category || 'General'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {ajusteTipo === 'mismo' ? (
                            <span className="font-bold text-xs text-gray-900 dark:text-white">
                              S/ {Number(prod.price).toFixed(2)}
                            </span>
                          ) : (
                            <div>
                              <span className="text-[10px] text-gray-400 line-through mr-1.5">
                                S/ {Number(prod.price).toFixed(2)}
                              </span>
                              <span className="font-black text-xs text-primary">
                                S/ {precioAjustado.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {mensajeExito && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {mensajeExito}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-[#1f1e24]">
          <div className="text-xs text-gray-500">
            Importando hacia: <span className="font-bold text-gray-800 dark:text-gray-200">{targetStoreName || targetStoreSlug}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={importando}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleImportar}
              disabled={selectedIds.size === 0 || importando || !selectedProveedorSlug}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-primary to-[#d82a20] text-white shadow-md hover:shadow-lg disabled:opacity-40 active:scale-95 transition-all flex items-center gap-1.5"
            >
              {importando ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Importando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Importar {selectedIds.size} Productos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

