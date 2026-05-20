"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { stores } from '@/lib/stores.config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('all');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'metrics'>('products');
  
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

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Activo' ? 'Agotado' : 'Activo';
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    try {
      const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: currentStatus } : p));
      alert('Error al actualizar el estado.');
    }
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
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === 'products' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === 'orders' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === 'metrics' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">bar_chart</span>
            Métricas
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
            <span className="material-symbols-outlined text-[20px]">store</span>
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
        {activeTab === 'products' && (
          <>
            {/* Store Selector Global for Dashboard */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedStore('all')}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedStore === 'all' 
                    ? 'bg-black text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                Todas las tiendas
              </button>
              {Object.values(stores).map((store) => (
                <button
                  key={store.slug}
                  onClick={() => setSelectedStore(store.slug)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 border ${
                    selectedStore === store.slug 
                      ? 'bg-black text-white border-black shadow-md' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>

            {/* Stats Row */}
            {(() => {
              const storeFiltered = selectedStore === 'all' ? products : products.filter(p => p.store === selectedStore);
              const availableCategories = Array.from(new Set(storeFiltered.map(p => p.category)));
              
              const filteredProducts = storeFiltered.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      (p.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = selectedFilterCategory === 'all' || p.category === selectedFilterCategory;
                return matchesSearch && matchesCategory;
              });

              return (
                <>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3 min-w-[150px] flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium text-[11px] mb-0.5">Total Productos</p>
                        <h3 className="text-xl font-extrabold text-gray-900 leading-none">{storeFiltered.length}</h3>
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
                    <div className="p-4 border-b border-gray-100 flex flex-col gap-4 bg-white">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-base font-bold text-gray-900">Catálogo Actual {selectedStore !== 'all' ? `- ${stores[selectedStore]?.name}` : ''}</h2>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-500">Acciones:</span>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setIsQRModalOpen(true)}
                              className="px-3 py-1.5 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 bg-black text-white hover:bg-gray-800"
                            >
                              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                              Código QR
                            </button>
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

                      {/* Search and Filters */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="relative w-full md:w-96 shrink-0">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                          <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar nombre o categoría..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                          />
                        </div>
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0" style={{ scrollbarWidth: 'none' }}>
                          <button 
                            onClick={() => setSelectedFilterCategory('all')}
                            className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors uppercase tracking-wider border ${
                              selectedFilterCategory === 'all' 
                                ? 'bg-[#FF6B00] text-white border-transparent' 
                                : 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            Todos
                          </button>
                          {availableCategories.map(cat => (
                            <button 
                              key={cat}
                              onClick={() => setSelectedFilterCategory(cat)}
                              className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors border ${
                                selectedFilterCategory === cat 
                                  ? 'bg-[#FF6B00] text-white border-transparent' 
                                  : 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {cat}
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
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-[#F8F9FA] text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                              <th className="p-3 font-bold w-1/3">Producto</th>
                              {selectedStore === 'all' && <th className="p-3 font-bold">Tienda</th>}
                              <th className="p-3 font-bold">Categoría</th>
                              <th className="p-3 font-bold">Estado</th>
                              <th className="p-3 font-bold">Precio</th>
                              <th className="p-3 font-bold text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map((p) => (
                              <tr key={p.id} className={`group border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${p.status === 'Agotado' ? 'opacity-70' : ''}`}>
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
                                <td className="p-3">
                                  <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                      <input type="checkbox" className="sr-only" checked={p.status === 'Activo'} onChange={() => toggleStatus(p.id, p.status)} />
                                      <div className={`block w-10 h-6 rounded-full transition-colors ${p.status === 'Activo' ? 'bg-[#25D366]' : 'bg-red-500'}`}></div>
                                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${p.status === 'Activo' ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className={`ml-2 text-xs font-bold ${p.status === 'Activo' ? 'text-green-700' : 'text-red-600'}`}>{p.status === 'Activo' ? 'ACTIVO' : 'AGOTADO'}</span>
                                  </label>
                                </td>
                                <td className="p-3 font-bold text-gray-900">
                                  S/ {Number(p.price).toFixed(2)}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleEdit(p)}
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
                      </div>

                      {/* Mobile Cards View */}
                      <div className="md:hidden flex flex-col p-4 gap-3">
                        {filteredProducts.map((p) => (
                          <div key={p.id} className={`bg-white border border-gray-100 rounded-xl p-3 flex gap-4 shadow-sm relative ${p.status === 'Agotado' ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                            {/* Image */}
                            <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-gray-400">image</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Details */}
                            <div className="flex flex-col flex-1 min-w-0 py-0.5">
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2">{p.name}</h3>
                                <span className="font-bold text-primary text-[13px] whitespace-nowrap">S/ {Number(p.price).toFixed(2)}</span>
                              </div>
                              
                              <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider truncate">
                                {p.category} {p.subcategory ? `• ${p.subcategory}` : ''}
                              </p>
                              
                              <div className="flex justify-between items-center mt-auto">
                                <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={p.status === 'Activo'} onChange={() => toggleStatus(p.id, p.status)} />
                                    <div className={`block w-8 h-5 rounded-full transition-colors ${p.status === 'Activo' ? 'bg-[#25D366]' : 'bg-red-500'}`}></div>
                                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${p.status === 'Activo' ? 'translate-x-3' : ''}`}></div>
                                  </div>
                                  <span className={`ml-1.5 text-[9px] font-extrabold ${p.status === 'Activo' ? 'text-green-700' : 'text-red-600'}`}>
                                    {p.status === 'Activo' ? 'STOCK' : 'AGOTADO'}
                                  </span>
                                </label>
                                
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                  <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                    <span className={`material-symbols-outlined text-[16px] ${isDeleting === p.id ? 'animate-spin' : ''}`}>
                                      {isDeleting === p.id ? 'refresh' : 'delete'}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          );
        })()}
          </>
        )}

        {activeTab === 'orders' && (
          <div className="flex flex-col gap-4 max-w-2xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Buscar ID de Pedido, Cliente..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#5244e1] focus:border-[#5244e1] shadow-sm transition-all"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button className="px-5 py-2 rounded-full text-xs font-bold bg-[#5244e1] text-white">Todos</button>
              <button className="px-5 py-2 rounded-full text-xs font-bold bg-[#e6ebf5] text-[#4a5568]">Pendiente</button>
              <button className="px-5 py-2 rounded-full text-xs font-bold bg-[#e6ebf5] text-[#4a5568]">Enviado</button>
              <button className="px-5 py-2 rounded-full text-xs font-bold bg-[#e6ebf5] text-[#4a5568]">Entregado</button>
            </div>

            <h3 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mt-2">Pedidos Recientes</h3>

            <div className="flex flex-col gap-3">
              {/* Mock Order 1 */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[#5244e1] font-bold text-xs tracking-wide">#ORD-94210</span>
                    <span className="text-gray-900 font-extrabold text-base mt-1">Elena Rodriguez</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 border border-orange-200 bg-orange-50 px-2.5 py-1 rounded-full uppercase tracking-wider">PENDIENTE</span>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <span className="text-gray-500 text-xs font-medium">24 Oct, 2023 • 2 Ítems</span>
                  <span className="text-gray-900 font-black text-xl">S/ 142.50</span>
                </div>
              </div>

              {/* Mock Order 2 */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[#5244e1] font-bold text-xs tracking-wide">#ORD-94209</span>
                    <span className="text-gray-900 font-extrabold text-base mt-1">Marcus Sterling</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 border border-blue-200 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">ENVIADO</span>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <span className="text-gray-500 text-xs font-medium">23 Oct, 2023 • 1 Ítem</span>
                  <span className="text-gray-900 font-black text-xl">S/ 89.00</span>
                </div>
              </div>

              {/* Mock Order 3 */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[#5244e1] font-bold text-xs tracking-wide">#ORD-94208</span>
                    <span className="text-gray-900 font-extrabold text-base mt-1">Sarah Chen</span>
                  </div>
                  <span className="text-[10px] font-bold text-green-600 border border-green-200 bg-green-50 px-2.5 py-1 rounded-full uppercase tracking-wider">ENTREGADO</span>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <span className="text-gray-500 text-xs font-medium">23 Oct, 2023 • 4 Ítems</span>
                  <span className="text-gray-900 font-black text-xl">S/ 310.25</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Métricas y Rendimiento</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Ventas de Hoy</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">S/ 0.00</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">shopping_bag</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Pedidos Completados</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">0</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">visibility</span>
                </div>
                <p className="text-sm font-bold text-gray-500">Vistas del Perfil</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">24</h3>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm mt-4">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900">Productos Más Vendidos</h3>
              </div>
              <div className="p-8 text-center">
                <p className="text-gray-500">Aún no hay suficientes datos para mostrar métricas. ¡Comparte tu código QR para recibir más pedidos!</p>
              </div>
            </div>
          </div>
        )}

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

      {/* QR Modal */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsQRModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col w-[350px]" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center border-b border-gray-100 relative">
              <button onClick={() => setIsQRModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Código QR</h2>
              <p className="text-xs text-gray-500 mt-1">Imprímelo para tus mesas o local</p>
            </div>
            <div className="p-8 flex flex-col items-center gap-6" id="qr-container">
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="text-lg font-black tracking-tight mb-4">{selectedStore !== 'all' ? stores[selectedStore]?.name : 'Boga Market'}</div>
                <QRCodeSVG 
                  value={selectedStore !== 'all' ? `https://boga.com/${selectedStore}` : `https://boga.com/explore`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
                <div className="text-[10px] text-gray-400 mt-4 font-bold tracking-widest uppercase">Escanéame para ordenar</div>
              </div>
              <button 
                onClick={() => {
                  const svg = document.querySelector('#qr-container svg');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      const pngFile = canvas.toDataURL("image/png");
                      const downloadLink = document.createElement("a");
                      downloadLink.download = `QR_${selectedStore}.png`;
                      downloadLink.href = `${pngFile}`;
                      downloadLink.click();
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:shadow-black/25 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Descargar PNG
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
