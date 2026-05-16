"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { stores } from '@/lib/stores.config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  id: string;
  name: string;
  store: string;
  price: number;
  category: string;
  subcategory?: string;
  stock: number;
  status: string;
  image: string;
  description?: string;
  created_at: string;
}

export default function DashboardPage() {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    store: selectedStore === 'all' ? 'sunset' : selectedStore,
    price: '',
    category: '',
    subcategory: '',
    image: '',
    desc: '',
  });

  const resetForm = () => {
    setEditingProductId(null);
    setNewProduct({ name: '', store: selectedStore === 'all' ? 'sunset' : selectedStore, price: '', category: '', subcategory: '', image: '', desc: '' });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Cargar productos al iniciar
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !editingProductId) {
      alert("Por favor selecciona una imagen");
      return;
    }
    setIsSaving(true);

    try {
      let finalImageUrl = newProduct.image;

      // 1. Subir la imagen si hay una nueva
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${newProduct.store.replace(/\s+/g, '-').toLowerCase()}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrlData.publicUrl;
      }

      // 2. Guardar en la base de datos
      if (editingProductId) {
        const { error: dbError } = await supabase.from('products').update({
          name: newProduct.name,
          store: newProduct.store,
          price: parseFloat(newProduct.price),
          category: newProduct.category,
          subcategory: newProduct.subcategory,
          image: finalImageUrl,
          description: newProduct.desc,
        }).eq('id', editingProductId);

        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('products').insert([
          {
            name: newProduct.name,
            store: newProduct.store,
            price: parseFloat(newProduct.price),
            category: newProduct.category,
            subcategory: newProduct.subcategory,
            image: finalImageUrl,
            description: newProduct.desc,
            stock: 0,
            status: 'Activo'
          }
        ]);

        if (dbError) throw dbError;
      }

      // Éxito: Limpiar formulario y recargar
      await fetchProducts();
      setIsModalOpen(false);
      resetForm();
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Hubo un error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      store: product.store,
      price: product.price.toString(),
      category: product.category,
      subcategory: product.subcategory || '',
      image: product.image,
      desc: product.description || '',
    });
    setPreviewUrl(product.image);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"? Esta acción no se puede deshacer.`)) {
      setIsDeleting(id);
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        await fetchProducts();
      } catch (error: any) {
        alert('Error al eliminar: ' + error.message);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const getBase64Image = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const exportStoreMenuPDF = async (storeSlug: string) => {
    if (isExporting) return;
    const storeObj = Object.values(stores).find(s => s.slug === storeSlug);
    if (!storeObj) return;

    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(20, 20, 20);
      doc.text(`Menú - ${storeObj.name}`, 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(storeObj.tagline, 14, 28);
      
      let yOffset = 35;
      const storeProducts = products.filter(p => p.store === storeSlug);

      // Preload all images
      const imagesMap: Record<string, string> = {};
      await Promise.all(storeProducts.map(async (p) => {
        if (p.image) {
          const b64 = await getBase64Image(p.image);
          if (b64) imagesMap[p.id] = b64;
        }
      }));
      
      // Process each category
      storeObj.categories.forEach(cat => {
        const catProducts = storeProducts.filter(p => p.category === cat.name || p.category === cat.href);
        if (catProducts.length === 0) return;
        
        autoTable(doc, {
          startY: yOffset,
          head: [['', cat.name.toUpperCase(), 'Descripción', 'Precio']],
          body: catProducts.map(p => [
            '', // placeholder for image
            p.name + (p.subcategory ? `\n(Sección: ${p.subcategory})` : ''), 
            p.description || '-', 
            `S/ ${Number(p.price).toFixed(2)}`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4, minCellHeight: 18, valign: 'middle' },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 45, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
          },
          margin: { top: 10, left: 14, right: 14 },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const product = catProducts[data.row.index];
              const b64 = imagesMap[product.id];
              if (b64) {
                try {
                  // The image format can usually be detected, but we specify 'JPEG' as a fallback
                  doc.addImage(b64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 14, 14);
                } catch(e) {}
              }
            }
          }
        });
        
        yOffset = (doc as any).lastAutoTable.finalY + 15;
        
        // Add page if needed
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 20;
        }
      });
      
      doc.save(`Menu_${storeObj.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Outfit'] flex flex-col md:flex-row">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Sidebar (Visible en Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xl">B</div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">Workspace</span>
        </div>
        <nav className="p-4 flex flex-col gap-2 flex-1">
          <button className="flex items-center gap-3 px-4 py-3 bg-black text-white rounded-xl font-semibold shadow-md shadow-black/10 transition-all hover:scale-[1.02]">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            Productos
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-gray-500 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            Pedidos
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-gray-500 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            Mis Tiendas
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-gray-900 font-semibold transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver a Boga
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Gestión de Productos</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">Administra el inventario de tus tiendas.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-white border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5 cursor-pointer"
            >
              <option value="all">Todas las tiendas (Super Admin)</option>
              {Object.values(stores).map(s => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-black/15 hover:shadow-black/25 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full md:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nuevo Producto
            </button>
          </div>
        </header>

        {/* Stats Row */}
        {(() => {
          const filteredProducts = selectedStore === 'all' ? products : products.filter(p => p.store === selectedStore);
          return (
            <>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3 min-w-[150px] flex-1">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium text-[11px] mb-0.5">Total Productos</p>
                    <h3 className="text-xl font-extrabold text-gray-900 leading-none">{filteredProducts.length}</h3>
                  </div>
                </div>
                {selectedStore === 'all' && (
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3 min-w-[150px] flex-1">
                    <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">storefront</span>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium text-[11px] mb-0.5">Tiendas Activas</p>
                      <h3 className="text-xl font-extrabold text-gray-900 leading-none">
                        {new Set(products.map(p => p.store)).size || 0}
                      </h3>
                    </div>
                  </div>
                )}
                <div className="hidden lg:block flex-1 border-2 border-dashed border-gray-200 rounded-xl bg-transparent"></div>
              </div>

              {/* Products Table */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white flex-wrap gap-4">
                  <h2 className="text-base font-bold text-gray-900">Catálogo Actual {selectedStore !== 'all' ? `- ${stores[selectedStore]?.name}` : ''}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-500">Exportar PDF:</span>
                    <div className="flex gap-2 flex-wrap">
                      {Object.values(stores)
                        .filter(store => selectedStore === 'all' || store.slug === selectedStore)
                        .map(store => (
                        <button
                          key={store.slug}
                          onClick={() => exportStoreMenuPDF(store.slug)}
                          disabled={isExporting}
                          className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${isExporting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isExporting ? 'animate-pulse' : ''}`}>
                            {isExporting ? 'hourglass_empty' : 'picture_as_pdf'}
                          </span>
                          {isExporting ? 'Generando...' : (selectedStore === 'all' ? store.name : 'Descargar')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-400">Cargando productos...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-gray-400">inventory_2</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">No hay productos</h3>
                      <p className="text-gray-500 text-sm max-w-sm">No se encontraron productos para esta tienda. Empieza añadiendo el primero.</p>
                      <button 
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="mt-6 px-4 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors"
                      >
                        Añadir Producto
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[#F8F9FA] text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                          <th className="p-3 font-bold w-1/3">Producto</th>
                          {selectedStore === 'all' && <th className="p-3 font-bold">Tienda</th>}
                          <th className="p-3 font-bold">Categoría</th>
                          <th className="p-3 font-bold">Precio</th>
                          <th className="p-3 font-bold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="material-symbols-outlined text-gray-400">image</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{p.name}</p>
                                  {p.subcategory && (
                                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100 mt-1 inline-block">
                                      {p.subcategory}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            {selectedStore === 'all' && (
                              <td className="p-3">
                                <span className="text-sm font-medium text-gray-600">{stores[p.store]?.name || p.store}</span>
                              </td>
                            )}
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                {p.category}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-gray-900">
                              S/ {Number(p.price).toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => editProduct(p)}
                                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button 
                                  onClick={() => handleDelete(p.id, p.name)}
                                  disabled={isDeleting === p.id}
                                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <span className={`material-symbols-outlined text-[18px] ${isDeleting === p.id ? 'animate-spin' : ''}`}>
                                    {isDeleting === p.id ? 'refresh' : 'delete'}
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          );
        })()}

      </main>

      {/* Modal for New Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
          
          <div className="relative bg-white w-[90vw] md:w-[550px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{editingProductId ? 'Editar Producto' : 'Añadir Producto'}</h2>
              <button 
                onClick={() => { if (!isSaving) { setIsModalOpen(false); resetForm(); } }}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                disabled={isSaving}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Image Uploader */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-200 rounded-2xl mb-8 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors cursor-pointer bg-gray-50/50 overflow-hidden relative group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">
                      Cambiar Imagen
                    </div>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl mb-2">add_a_photo</span>
                    <span className="font-bold text-sm">Clic para subir foto</span>
                    <span className="text-xs mt-1 opacity-70">Recomendado cuadrado (1:1)</span>
                  </>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Producto</label>
                  <input 
                    required
                    type="text" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Ej: Sunset Ribeye"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción Corta</label>
                  <textarea 
                    value={newProduct.desc}
                    onChange={(e) => setNewProduct({...newProduct, desc: e.target.value})}
                    placeholder="Breve descripción de los ingredientes o detalles..."
                    rows={2}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Precio (S/)</label>
                    <input 
                      required
                      type="number" 
                      step="0.10"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Asignar a Tienda</label>
                    <select 
                      value={newProduct.store}
                      onChange={(e) => {
                        const newStore = e.target.value;
                        const storeObj = Object.values(stores).find(s => s.slug === newStore);
                        setNewProduct({
                          ...newProduct, 
                          store: newStore,
                          // Seleccionar la primera categoría por defecto si cambia de tienda
                          category: storeObj?.categories[0]?.name || ''
                        });
                      }}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                    >
                      {Object.values(stores).map(store => (
                        <option key={store.slug} value={store.slug}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                    <select 
                      required
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                    >
                      <option value="" disabled>Selecciona...</option>
                      {Object.values(stores).find(s => s.slug === newProduct.store)?.categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Sección (Ej: Entradas)</label>
                    <input 
                      type="text" 
                      list="existing-subcategories"
                      value={newProduct.subcategory}
                      onChange={(e) => setNewProduct({...newProduct, subcategory: e.target.value})}
                      placeholder="Título separador..."
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black transition-all"
                    />
                    <datalist id="existing-subcategories">
                      {Array.from(new Set(products.filter(p => p.store === newProduct.store && p.category === newProduct.category && p.subcategory).map(p => p.subcategory))).map(sub => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 sticky bottom-0">
              <button 
                type="button"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                disabled={isSaving}
                className="px-6 py-3.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3.5 bg-black text-white rounded-xl font-bold shadow-lg shadow-black/15 hover:shadow-black/25 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    Guardando...
                  </>
                ) : editingProductId ? (
                  'Guardar Cambios'
                ) : (
                  'Crear Producto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
