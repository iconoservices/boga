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
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'metrics' | 'stores' | 'pos'>('products');

  // POS (Caja Rápida) States
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Efectivo' | 'Yape/Plin' | 'Tarjeta'>('Efectivo');
  const [posSeller, setPosSeller] = useState('Administrador');
  const [customSeller, setCustomSeller] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posProductSearch, setPosProductSearch] = useState('');
  const [posProductCategory, setPosProductCategory] = useState('all');
  const [isPosSaving, setIsPosSaving] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  const [isMobileCheckoutOpen, setIsMobileCheckoutOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storeLogoInputRef = useRef<HTMLInputElement>(null);
  const storeHeroInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dbStores, setDbStores] = useState<any[]>([]);
  const [isStoreEditorOpen, setIsStoreEditorOpen] = useState(false);
  const [editingStoreSlug, setEditingStoreSlug] = useState<string | null>(null);
  const [isStoreSaving, setIsStoreSaving] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', tagline: '', marketplace_category: '' });
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [storeHeroFile, setStoreHeroFile] = useState<File | null>(null);
  const [storeLogoPreview, setStoreLogoPreview] = useState<string | null>(null);
  const [storeHeroPreview, setStoreHeroPreview] = useState<string | null>(null);

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
    fetchStores();
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

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('*');
    if (data) setDbStores(data);
  };

  const addToCart = (product: Product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const handlePosCheckout = async () => {
    if (posCart.length === 0) return;
    setIsPosSaving(true);
    
    // Si selectedStore es 'all', usamos el store del primer producto
    const storeSlug = selectedStore === 'all' ? (posCart[0]?.product.store || 'sunset') : selectedStore;
    const cartTotal = posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const saleDetails = {
      store: storeSlug,
      customer_name: posCustomerName.trim() || 'Cliente Local (POS)',
      customer_phone: posCustomerPhone.trim() || null,
      items: posCart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      total_amount: cartTotal,
      status: 'Entregado',
      payment_method: posPaymentMethod,
      seller_name: posSeller === 'Otro' ? customSeller.trim() || 'Otro' : posSeller,
      order_source: 'POS'
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([saleDetails])
      .select('*')
      .single();

    if (error) {
      console.error('Error saving POS sale:', error);
      alert('Hubo un error al registrar la venta: ' + error.message);
    } else {
      setLastCompletedSale(data || { ...saleDetails, id: 'POS-' + Math.floor(Math.random() * 90000 + 10000), created_at: new Date().toISOString() });
      setPosCart([]);
      setPosCustomerName('');
      setPosCustomerPhone('');
      setIsTicketModalOpen(true);
    }
    setIsPosSaving(false);
  };

  const openStoreEditor = (slug: string) => {
    const config = stores[slug];
    const dbData = dbStores.find((s: any) => s.slug === slug);
    setEditingStoreSlug(slug);
    setStoreForm({
      name: dbData?.name || config?.name || '',
      tagline: dbData?.tagline || config?.tagline || '',
      marketplace_category: dbData?.marketplace_category || config?.marketplaceCategory || '',
    });
    setStoreHeroPreview(dbData?.hero_image || config?.heroImage || null);
    setStoreLogoPreview(dbData?.logo_image || config?.logoImage || null);
    setStoreLogoFile(null);
    setStoreHeroFile(null);
    setIsStoreEditorOpen(true);
  };

  const handleStoreSave = async () => {
    if (!editingStoreSlug) return;
    setIsStoreSaving(true);
    try {
      let logoUrl: string | null = storeLogoPreview;
      let heroUrl: string | null = storeHeroPreview;

      if (storeLogoFile) {
        const ext = storeLogoFile.name.split('.').pop();
        const path = `${editingStoreSlug}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('store-assets').upload(path, storeLogoFile, { upsert: true });
        if (!upErr) {
          const { data: pubData } = supabase.storage.from('store-assets').getPublicUrl(path);
          logoUrl = pubData.publicUrl;
        }
      }

      if (storeHeroFile) {
        const ext = storeHeroFile.name.split('.').pop();
        const path = `${editingStoreSlug}/hero-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('store-assets').upload(path, storeHeroFile, { upsert: true });
        if (!upErr) {
          const { data: pubData } = supabase.storage.from('store-assets').getPublicUrl(path);
          heroUrl = pubData.publicUrl;
        }
      }

      const upsertData: any = {
        slug: editingStoreSlug,
        name: storeForm.name,
        tagline: storeForm.tagline,
        marketplace_category: storeForm.marketplace_category,
        status: 'active',
      };
      if (heroUrl) upsertData.hero_image = heroUrl;
      if (logoUrl) upsertData.logo_image = logoUrl;

      const { error } = await supabase.from('stores').upsert(upsertData, { onConflict: 'slug' });
      if (error) throw error;

      await fetchStores();
      setIsStoreEditorOpen(false);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsStoreSaving(false);
    }
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
            onClick={() => setActiveTab('pos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === 'pos' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
            Vender (POS)
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
          <button 
            onClick={() => setActiveTab('stores')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-colors ${activeTab === 'stores' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[20px]">store</span>
            Mis Tiendas
          </button>
          
          {/* Static Install Button */}
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('bogadash_pwa_stats');
                window.location.reload();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[#5244e1] hover:bg-[#5244e1]/10 rounded-xl font-bold transition-colors mt-4"
          >
            <span className="material-symbols-outlined text-[20px]">install_mobile</span>
            Instalar App
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
      <main className="flex-1 px-3 py-4 md:p-8 max-w-7xl mx-auto w-full pb-28 md:pb-8">
        <header className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === 'products' ? 'Gestión de Productos' : activeTab === 'orders' ? 'Gestión de Pedidos' : activeTab === 'stores' ? 'Mis Tiendas' : activeTab === 'pos' ? 'Caja Rápida (POS)' : 'Métricas y Rendimiento'}
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              {activeTab === 'products' ? 'Administra el inventario de tus tiendas.' : activeTab === 'orders' ? 'Gestiona los pedidos de tus clientes.' : activeTab === 'stores' ? 'Administra la información de tus sucursales.' : activeTab === 'pos' ? 'Registra ventas físicas y genera tickets al instante.' : 'Analiza el rendimiento de tu negocio.'}
            </p>
          </div>
          <div className="hidden md:flex flex-col md:flex-row gap-3">
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
            {activeTab === 'pos' ? (
              <button 
                onClick={() => setPosCart([])}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-5 py-2.5 rounded-xl font-bold transition-all w-full md:w-auto"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Limpiar Carrito
              </button>
            ) : (
              <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-black/15 hover:shadow-black/25 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full md:w-auto"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nuevo Producto
              </button>
            )}
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
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest leading-none select-none">Acciones</span>
                          <div className="flex flex-row items-center gap-1.5">
                            <button
                              onClick={() => setIsQRModalOpen(true)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 bg-black text-white hover:bg-gray-800 whitespace-nowrap active:scale-95 cursor-pointer shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                              Código QR
                            </button>
                            <button
                              onClick={() => setIsPDFModalOpen(true)}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 whitespace-nowrap active:scale-95 cursor-pointer border border-red-100 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                              Exportar PDF
                            </button>
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
          <>
            {/* Mobile View (Stich Dash Mobile UI) */}
            <div className="flex flex-col gap-4 w-full md:hidden">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar ID de Pedido, Cliente..." 
                  className="w-full h-12 pl-11 pr-4 bg-white border border-[#c7c4d8]/60 rounded-xl focus:ring-2 focus:ring-[#3525cd] focus:border-transparent focus:outline-none transition-all text-sm font-medium text-[#111c2d]"
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

            {/* Desktop View (Stich Dash PC UI) */}
            <div className="hidden md:flex flex-col gap-6 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-gray-900">Gestión de Pedidos</h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">Rastrea y administra el ciclo de vida de los pedidos de tus clientes.</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-5 py-2 rounded-lg text-sm font-bold bg-[#5244e1] text-white">Todos los Pedidos</button>
                  <button className="px-5 py-2 rounded-lg text-sm font-bold bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors">Pendiente</button>
                  <button className="px-5 py-2 rounded-lg text-sm font-bold bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors">Enviado</button>
                  <button className="px-5 py-2 rounded-lg text-sm font-bold bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors">Entregado</button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Ingresos Totales</h4>
                    <span className="text-3xl font-black text-gray-900">S/ 12,840.00</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[#5244e1] font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    +14.2% desde el mes pasado
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Pedidos Activos</h4>
                    <span className="text-3xl font-black text-gray-900">154</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-gray-500 font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    12 pedidos requieren atención
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Tiempo Promedio</h4>
                    <span className="text-3xl font-black text-gray-900">1.2 Días</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-[#5244e1] font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    20% más rápido que el promedio
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 tracking-wider uppercase mb-1">Tasa de Devolución</h4>
                    <span className="text-3xl font-black text-gray-900">2.4%</span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-red-500 font-bold text-[13px]">
                    <span className="material-symbols-outlined text-[16px]">trending_down</span>
                    +0.3% desde la semana pasada
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mt-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="p-4">ID Pedido</th>
                      <th className="p-4">Nombre del Cliente</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Ítems</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[#5244e1] font-bold">#ORD-9021</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#5244e1]/10 text-[#5244e1] flex items-center justify-center font-bold text-xs shrink-0">ED</div>
                          <span className="text-gray-900">Eleanor Donahue</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">24 Oct, 2023</td>
                      <td className="p-4 text-gray-500">3 Ítems</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Pendiente
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-900 font-bold">S/ 245.99</td>
                    </tr>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[#5244e1] font-bold">#ORD-9020</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shrink-0">JM</div>
                          <span className="text-gray-900">Julian Marshall</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">24 Oct, 2023</td>
                      <td className="p-4 text-gray-500">1 Ítem</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Enviado
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-900 font-bold">S/ 89.00</td>
                    </tr>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[#5244e1] font-bold">#ORD-9019</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shrink-0">SW</div>
                          <span className="text-gray-900">Sarah Waters</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">23 Oct, 2023</td>
                      <td className="p-4 text-gray-500">5 Ítems</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Entregado
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-900 font-bold">S/ 1,024.50</td>
                    </tr>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[#5244e1] font-bold">#ORD-9018</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#5244e1]/10 text-[#5244e1] flex items-center justify-center font-bold text-xs shrink-0">BB</div>
                          <span className="text-gray-900">Benson Bernard</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">23 Oct, 2023</td>
                      <td className="p-4 text-gray-500">2 Ítems</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Pendiente
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-900 font-bold">S/ 112.20</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[#5244e1] font-bold">#ORD-9017</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shrink-0">KT</div>
                          <span className="text-gray-900">Kira Thompson</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">22 Oct, 2023</td>
                      <td className="p-4 text-gray-500">12 Ítems</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Enviado
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-900 font-bold">S/ 2,410.00</td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                  <span className="text-sm text-gray-500">Mostrando 1 a 5 de 154 pedidos</span>
                  <div className="flex gap-1">
                    <button className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                    <button className="w-8 h-8 rounded bg-[#5244e1] text-white flex items-center justify-center font-bold text-sm">1</button>
                    <button className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors">2</button>
                    <button className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-sm transition-colors">3</button>
                    <button className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
                  </div>
                </div>
              </div>

              {/* Promotional Cards Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
                <div className="lg:col-span-2 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Automatizar Etiquetas de Envío</h3>
                  <p className="text-sm text-gray-500 mb-4 w-full">Conecta tu proveedor preferido para generar etiquetas de envío automáticamente tan pronto como un pedido sea marcado como 'Empacado'.</p>
                  <a href="#" className="text-[#5244e1] font-bold text-sm flex items-center gap-1 hover:underline">
                    Ver integraciones <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
                <div className="bg-[#5244e1] rounded-xl p-6 shadow-md text-white flex flex-col justify-between relative overflow-hidden">
                  <span className="material-symbols-outlined absolute -right-4 -top-4 text-7xl opacity-10">verified_user</span>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2">Protección contra Fraude</h3>
                    <p className="text-sm text-white/80 mb-4 w-full">Tu cuenta está cubierta actualmente por detección de fraude con IA para todos los pedidos.</p>
                  </div>
                  <button className="relative z-10 w-full py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg font-bold text-sm backdrop-blur-sm">
                    Ver Reporte de Seguridad
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'stores' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">Mis Tiendas</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Personaliza el perfil y apariencia de cada sucursal.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.values(stores).map((store) => {
                const dbStore = dbStores.find((s: any) => s.slug === store.slug);
                const displayName = dbStore?.name || store.name;
                const displayTagline = dbStore?.tagline || store.tagline;
                const heroImg = dbStore?.hero_image || store.heroImage;
                const productCount = products.filter(p => p.store === store.slug).length;
                return (
                  <div key={store.slug} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                    {/* Hero */}
                    <div className="h-36 relative overflow-hidden bg-gray-100">
                      {heroImg && <img src={heroImg} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="text-[10px] font-bold text-white bg-green-500/90 backdrop-blur-sm px-2 py-0.5 rounded-full uppercase tracking-wider">Activo</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-extrabold text-base leading-tight drop-shadow">{displayName}</h3>
                        <p className="text-white/75 text-[11px] font-medium mt-0.5">{displayTagline}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                          {store.marketplaceCategory}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {productCount} producto{productCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <a 
                          href={`/${store.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver tienda"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </a>
                        <button
                          onClick={() => openStoreEditor(store.slug)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar tienda"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info banner */}
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#5244e1]/10 text-[#5244e1] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Personaliza cada tienda</h4>
                <p className="text-sm text-gray-500 mt-1">Haz clic en <strong>Editar</strong> para cambiar el nombre, slogan, foto de portada y logo de cada tienda. Los cambios se guardan en la nube y se reflejan en el marketplace automáticamente.</p>
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

            {/* Install App Card for Mobile users */}
            <div className="md:hidden bg-[#5244e1] text-white p-6 rounded-xl shadow-md mt-2 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-4xl mb-2">install_mobile</span>
              <h3 className="font-bold text-lg mb-1">Instalar Boga Dash</h3>
              <p className="text-white/80 text-sm mb-4">Instala la app en tu celular para una experiencia más rápida y nativa.</p>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('bogadash_pwa_stats');
                    window.location.reload();
                  }
                }}
                className="w-full py-3 bg-white text-[#5244e1] rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Instalar Ahora
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch lg:items-start bg-[#f9f9ff] p-3 md:p-6 min-h-[calc(100vh-100px)] rounded-2xl">
            {/* Catalog Grid (Left Side) */}
            <div className="flex-1 w-full flex flex-col gap-6 pb-60 lg:pb-0">
              <div className="relative w-full max-w-lg pr-14">
                <div className="relative w-full group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                  <input 
                    type="text" 
                    value={posProductSearch}
                    onChange={(e) => setPosProductSearch(e.target.value)}
                    placeholder="Buscar productos, SKUs o categorías..." 
                    className="w-full h-12 pl-11 pr-4 bg-white border border-[#c7c4d8]/60 rounded-xl focus:ring-2 focus:ring-[#3525cd] focus:border-transparent focus:outline-none transition-all text-sm font-medium text-[#111c2d]"
                  />
                </div>
                <button 
                  type="button"
                  className="absolute right-0 top-0 h-12 w-12 bg-[#e7eeff] hover:bg-[#dee8ff] text-[#3525cd] border border-[#c7c4d8]/40 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </button>
              </div>

              {/* Row 2: Categories */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
                <button 
                  onClick={() => setPosProductCategory('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                    posProductCategory === 'all' 
                      ? 'bg-[#3525cd] text-white border-transparent' 
                      : 'bg-[#e7eeff] text-[#464555] border-transparent hover:bg-[#dee8ff]'
                  }`}
                >
                  Todos los Productos
                </button>
                {Array.from(new Set((selectedStore === 'all' ? products : products.filter(p => p.store === selectedStore)).map(p => p.category))).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setPosProductCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                      posProductCategory === cat 
                        ? 'bg-[#3525cd] text-white border-transparent' 
                        : 'bg-[#e7eeff] text-[#464555] border-transparent hover:bg-[#dee8ff]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {(() => {
                const posFilteredStoreProducts = selectedStore === 'all' ? products : products.filter(p => p.store === selectedStore);
                const posProducts = posFilteredStoreProducts.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(posProductSearch.toLowerCase()) ||
                                        p.category.toLowerCase().includes(posProductSearch.toLowerCase());
                  const matchesCategory = posProductCategory === 'all' || p.category === posProductCategory;
                  return matchesSearch && matchesCategory;
                });

                if (posProducts.length === 0) {
                  return (
                    <div className="p-12 text-center flex flex-col items-center justify-center bg-white border border-[#c7c4d8]/40 rounded-2xl shadow-sm">
                      <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">shopping_basket</span>
                      <p className="text-gray-500 font-bold text-sm">No se encontraron productos.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {posProducts.map(p => {
                      const cartItem = posCart.find(item => item.product.id === p.id);
                      const quantity = cartItem?.quantity || 0;
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => addToCart(p)}
                          className={`product-card text-left flex flex-col bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group ${
                            quantity > 0 ? 'border-[#3525cd] ring-1 ring-[#3525cd]/20' : 'border-[#c7c4d8]/40'
                          }`}
                        >
                          <div className="h-32 w-full bg-[#f0f3ff] relative overflow-hidden shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-3xl">image</span>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur rounded font-bold text-[9px] text-[#3525cd]">
                              {quantity > 0 ? `${quantity} EN CARRO` : 'EN STOCK'}
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <h3 className="font-bold text-sm text-[#111c2d] truncate">{p.name}</h3>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-extrabold text-base text-[#3525cd]">S/ {p.price.toFixed(2)}</p>
                              {quantity > 0 && (
                                <div className="flex items-center gap-1 bg-[#f0f3ff] border border-[#c7c4d8]/20 p-0.5 rounded-lg" onClick={e => e.stopPropagation()}>
                                  <button 
                                    onClick={() => removeFromCart(p.id)}
                                    className="text-gray-500 hover:text-red-500 transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs bg-white rounded shadow-sm cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="text-[11px] font-black text-[#111c2d] w-3 text-center">{quantity}</span>
                                  <button 
                                    onClick={() => addToCart(p)}
                                    className="text-gray-500 hover:text-[#3525cd] transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs bg-white rounded shadow-sm cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Sidebar (Right Side) - Desktop Only */}
            <aside className="hidden lg:flex w-full lg:w-96 lg:h-[calc(100vh-180px)] lg:sticky lg:top-[120px] bg-[#f0f3ff]/40 border border-[#c7c4d8]/40 rounded-2xl flex-col shrink-0 overflow-hidden shadow-sm">
              {/* Receipt Header */}
              <div className="p-3 border-b border-[#c7c4d8]/30 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-sm text-[#111c2d]">Venta Actual</h2>
                  <button 
                    onClick={() => setPosCart([])}
                    className="text-red-500 hover:text-red-700 font-bold text-[11px] hover:underline cursor-pointer"
                  >
                    Limpiar Todo
                  </button>
                </div>
                <button 
                  onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
                  className="flex items-center gap-1 text-[#3525cd] font-bold text-[11px] mt-1.5 hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  {posCustomerName ? `${posCustomerName} (${posCustomerPhone || 'Sin Celular'})` : 'Agregar Cliente'}
                </button>
              </div>

              {/* Collapsible Customer Form */}
              {isCustomerDetailsOpen && (
                <div className="p-3 border-b border-[#c7c4d8]/20 bg-white/80 flex flex-col gap-2">
                  <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Datos del Cliente</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Nombre" 
                      className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd]"
                    />
                    <input 
                      type="text" 
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      placeholder="WhatsApp" 
                      className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd]"
                    />
                  </div>
                </div>
              )}

              {/* Seller Selection */}
              <div className="p-3 border-b border-[#c7c4d8]/10 bg-white/60 flex flex-col gap-1.5">
                <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Vendedor</h4>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={posSeller} 
                    onChange={(e) => setPosSeller(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd] cursor-pointer"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Juan">Juan</option>
                    <option value="María">María</option>
                    <option value="Pedro">Pedro</option>
                    <option value="Sofía">Sofía</option>
                    <option value="Otro">Otro...</option>
                  </select>
                  {posSeller === 'Otro' && (
                    <input 
                      type="text" 
                      value={customSeller}
                      onChange={(e) => setCustomSeller(e.target.value)}
                      placeholder="Nombre" 
                      className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd]"
                    />
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px] custom-scrollbar bg-white/20">
                {posCart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
                    <span className="material-symbols-outlined text-3xl mb-1.5">shopping_basket</span>
                    <p className="text-xs font-semibold">El carrito está vacío</p>
                  </div>
                ) : (
                  posCart.map((item, index) => (
                    <div key={item.product.id} className="flex items-center justify-between gap-3 group">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-[#111c2d] truncate">{item.product.name}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">S/ {item.product.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-xs text-[#111c2d]">S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center gap-0.5 bg-[#f0f3ff] border border-[#c7c4d8]/20 p-0.5 rounded-lg">
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="text-[11px] font-black text-[#111c2d] w-3 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => addToCart(item.product)}
                            className="text-gray-500 hover:text-[#3525cd] transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Summary Footer */}
              <div className="p-3 bg-white border-t border-[#c7c4d8]/30">
                <div className="space-y-1 mb-2.5">
                  <div className="flex justify-between text-gray-500 font-semibold text-[11px]">
                    <span>Subtotal</span>
                    <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold text-[11px]">
                    <span>IGV (18% Incluido)</span>
                    <span>S/ {(posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 0.18 / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#111c2d] font-black text-sm mt-1.5 pt-1.5 border-t border-[#c7c4d8]/20">
                    <span>Total</span>
                    <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Actions */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Método de Pago</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setPosPaymentMethod('Efectivo')}
                        className={`py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                          posPaymentMethod === 'Efectivo' 
                            ? 'border-[#3525cd] bg-[#3525cd]/5 text-[#3525cd]' 
                            : 'border-[#c7c4d8]/30 bg-[#f0f3ff]/40 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span className="text-[9px] font-bold">Efectivo</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPosPaymentMethod('Yape/Plin')}
                        className={`py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                          posPaymentMethod === 'Yape/Plin' 
                            ? 'border-[#3525cd] bg-[#3525cd]/5 text-[#3525cd]' 
                            : 'border-[#c7c4d8]/30 bg-[#f0f3ff]/40 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                        <span className="text-[9px] font-bold">Yape/Plin</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPosPaymentMethod('Tarjeta')}
                        className={`py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                          posPaymentMethod === 'Tarjeta' 
                            ? 'border-[#3525cd] bg-[#3525cd]/5 text-[#3525cd]' 
                            : 'border-[#c7c4d8]/30 bg-[#f0f3ff]/40 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">credit_card</span>
                        <span className="text-[9px] font-bold">Tarjeta</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={handlePosCheckout}
                    disabled={posCart.length === 0 || isPosSaving}
                    className="w-full py-2.5 bg-[#3525cd] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#3525cd]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isPosSaving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        Cobrar y Generar Ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            </aside>

            {/* Mobile Pinned Checkout Bar */}
            <div className="lg:hidden fixed bottom-[76px] md:bottom-0 left-0 right-0 bg-white border-t border-[#c7c4d8]/20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-3 z-40 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total</span>
                <span className="text-base font-black text-[#3525cd]">S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setIsMobileCheckoutOpen(true)}
                disabled={posCart.length === 0}
                className="bg-[#3525cd] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                Cobrar ({posCart.reduce((sum, item) => sum + item.quantity, 0)})
              </button>
            </div>

            {/* Mobile Checkout Drawer */}
            {isMobileCheckoutOpen && (
              <div className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex flex-col justify-end" onClick={() => setIsMobileCheckoutOpen(false)}>
                <div className="bg-white rounded-t-[24px] shadow-2xl flex flex-col max-h-[85vh] w-full" onClick={e => e.stopPropagation()}>
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-[#c7c4d8]/30 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#3525cd] text-[20px]">shopping_cart</span>
                      <h3 className="font-extrabold text-base text-[#111c2d]">Confirmar Venta</h3>
                    </div>
                    <button onClick={() => setIsMobileCheckoutOpen(false)} className="text-gray-400 hover:text-black">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* Drawer Scrollable Content */}
                  <div className="overflow-y-auto flex-1 bg-[#f9f9ff]">
                    {/* Receipt Header Actions (like Limpiar Todo) */}
                    <div className="p-3 border-b border-[#c7c4d8]/30 bg-white flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">Detalles de Venta</span>
                      <button 
                        onClick={() => {
                          setPosCart([]);
                          setIsMobileCheckoutOpen(false);
                        }}
                        className="text-red-500 hover:text-red-700 font-bold text-xs hover:underline cursor-pointer"
                      >
                        Limpiar Todo
                      </button>
                    </div>

                    {/* Client Add button & form */}
                    <div className="p-3 border-b border-[#c7c4d8]/30 bg-white">
                      <button 
                        onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
                        className="flex items-center gap-1 text-[#3525cd] font-bold text-xs hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        {posCustomerName ? `${posCustomerName} (${posCustomerPhone || 'Sin Celular'})` : 'Agregar Cliente'}
                      </button>
                      {isCustomerDetailsOpen && (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={posCustomerName}
                              onChange={(e) => setPosCustomerName(e.target.value)}
                              placeholder="Nombre" 
                              className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd]"
                            />
                            <input 
                              type="text" 
                              value={posCustomerPhone}
                              onChange={(e) => setPosCustomerPhone(e.target.value)}
                              placeholder="WhatsApp" 
                              className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd]"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Seller Selector */}
                    <div className="p-3 border-b border-[#c7c4d8]/10 bg-white flex flex-col gap-1.5">
                      <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Vendedor</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={posSeller} 
                          onChange={(e) => setPosSeller(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd] cursor-pointer"
                        >
                          <option value="Administrador">Administrador</option>
                          <option value="Juan">Juan</option>
                          <option value="María">María</option>
                          <option value="Pedro">Pedro</option>
                          <option value="Sofía">Sofía</option>
                          <option value="Otro">Otro...</option>
                        </select>
                        {posSeller === 'Otro' && (
                          <input 
                            type="text" 
                            value={customSeller}
                            onChange={(e) => setCustomSeller(e.target.value)}
                            placeholder="Nombre" 
                            className="w-full px-2.5 py-1.5 bg-[#f0f3ff]/40 border border-[#c7c4d8]/30 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3525cd]"
                          />
                        )}
                      </div>
                    </div>

                    {/* Cart Items List */}
                    <div className="p-3 bg-white border-b border-[#c7c4d8]/10 space-y-3">
                      <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Productos</h4>
                      {posCart.map((item, index) => (
                        <div key={item.product.id} className="flex items-center justify-between gap-3 group">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-xs text-[#111c2d] truncate">{item.product.name}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">S/ {item.product.price.toFixed(2)} x {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-xs text-[#111c2d]">S/ {(item.product.price * item.quantity).toFixed(2)}</span>
                            <div className="flex items-center gap-0.5 bg-[#f0f3ff] border border-[#c7c4d8]/20 p-0.5 rounded-lg">
                              <button 
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-gray-500 hover:text-red-500 transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="text-[11px] font-black text-[#111c2d] w-3 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => addToCart(item.product)}
                                className="text-gray-500 hover:text-[#3525cd] transition-colors w-5.5 h-5.5 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment & Action Footer */}
                  <div className="p-4 bg-white border-t border-[#c7c4d8]/30 shrink-0">
                      <div className="space-y-1 mb-2.5">
                        <div className="flex justify-between text-gray-500 font-semibold text-[11px]">
                          <span>Subtotal</span>
                          <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 font-semibold text-[11px]">
                          <span>IGV (18% Incluido)</span>
                          <span>S/ {(posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 0.18 / 1.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#111c2d] font-black text-sm mt-1.5 pt-1.5 border-t border-[#c7c4d8]/20">
                          <span>Total</span>
                          <span>S/ {posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Actions */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Método de Pago</h4>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button 
                              type="button" 
                              onClick={() => setPosPaymentMethod('Efectivo')}
                              className={`py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                                posPaymentMethod === 'Efectivo' 
                                  ? 'border-[#3525cd] bg-[#3525cd]/5 text-[#3525cd]' 
                                  : 'border-[#c7c4d8]/30 bg-[#f0f3ff]/40 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">payments</span>
                              <span className="text-[9px] font-bold">Efectivo</span>
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setPosPaymentMethod('Yape/Plin')}
                              className={`py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                                posPaymentMethod === 'Yape/Plin' 
                                  ? 'border-[#3525cd] bg-[#3525cd]/5 text-[#3525cd]' 
                                  : 'border-[#c7c4d8]/30 bg-[#f0f3ff]/40 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                              <span className="text-[9px] font-bold">Yape/Plin</span>
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setPosPaymentMethod('Tarjeta')}
                              className={`py-1.5 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                                posPaymentMethod === 'Tarjeta' 
                                  ? 'border-[#3525cd] bg-[#3525cd]/5 text-[#3525cd]' 
                                  : 'border-[#c7c4d8]/30 bg-[#f0f3ff]/40 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">credit_card</span>
                              <span className="text-[9px] font-bold">Tarjeta</span>
                            </button>
                          </div>
                        </div>

                        <button 
                          onClick={async () => {
                            await handlePosCheckout();
                            setIsMobileCheckoutOpen(false);
                          }}
                          disabled={posCart.length === 0 || isPosSaving}
                          className="w-full py-3 bg-[#3525cd] text-white rounded-lg font-bold text-sm shadow-lg shadow-[#3525cd]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isPosSaving ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                              Cobrar y Generar Ticket
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            )}
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

      {/* Store Editor Modal */}
      {isStoreEditorOpen && editingStoreSlug && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isStoreSaving && setIsStoreEditorOpen(false)} />
          <div className="relative bg-white w-[90vw] md:w-[560px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Editar Tienda</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-medium">{stores[editingStoreSlug]?.name}</p>
              </div>
              <button
                onClick={() => setIsStoreEditorOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                disabled={isStoreSaving}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              {/* Hero Image Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Foto de Portada</label>
                <input type="file" ref={storeHeroInputRef} onChange={e => { if (e.target.files?.[0]) { setStoreHeroFile(e.target.files[0]); setStoreHeroPreview(URL.createObjectURL(e.target.files[0])); }}} accept="image/*" className="hidden" />
                <div
                  onClick={() => storeHeroInputRef.current?.click()}
                  className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer relative group hover:border-black transition-colors bg-gray-50"
                >
                  {storeHeroPreview ? (
                    <>
                      <img src={storeHeroPreview} className="w-full h-full object-cover" alt="Hero preview" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity">
                        Cambiar Portada
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-3xl mb-1">landscape</span>
                      <span className="text-sm font-bold">Clic para subir portada</span>
                      <span className="text-xs opacity-70">Imagen panorámica (16:9)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Logo / Miniatura</label>
                <input type="file" ref={storeLogoInputRef} onChange={e => { if (e.target.files?.[0]) { setStoreLogoFile(e.target.files[0]); setStoreLogoPreview(URL.createObjectURL(e.target.files[0])); }}} accept="image/*" className="hidden" />
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => storeLogoInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer relative group hover:border-black transition-colors bg-gray-50 shrink-0"
                  >
                    {storeLogoPreview ? (
                      <>
                        <img src={storeLogoPreview} className="w-full h-full object-cover" alt="Logo" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity text-xs text-center rounded-2xl">
                          Cambiar
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">Logo cuadrado</p>
                    <p className="text-xs text-gray-500 mt-1">Aparece como miniatura en el marketplace. Recomendado: 200×200px, fondo transparente o color sólido.</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={e => setStoreForm({...storeForm, name: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Ej: Sunset Lounge"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Slogan / Descripción Corta</label>
                <input
                  type="text"
                  value={storeForm.tagline}
                  onChange={e => setStoreForm({...storeForm, tagline: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Ej: Bar & Café"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Categoría en el Marketplace</label>
                <input
                  type="text"
                  value={storeForm.marketplace_category}
                  onChange={e => setStoreForm({...storeForm, marketplace_category: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  placeholder="Ej: Restaurantes, Moda, Salud..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setIsStoreEditorOpen(false)}
                disabled={isStoreSaving}
                className="px-6 py-3.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleStoreSave}
                disabled={isStoreSaving}
                className="flex items-center gap-2 px-8 py-3.5 bg-black text-white rounded-xl font-bold shadow-lg shadow-black/15 hover:shadow-black/25 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isStoreSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                    Guardando...
                  </>
                ) : 'Guardar Cambios'}
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

      {/* PDF Export Modal */}
      {isPDFModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsPDFModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 relative text-center">
              <button onClick={() => setIsPDFModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Exportar Catálogo PDF</h2>
              <p className="text-xs text-gray-500 mt-1">Selecciona qué tienda deseas descargar en PDF</p>
            </div>
            <div className="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {Object.values(stores)
                .filter(store => selectedStore === 'all' || store.slug === selectedStore)
                .map(store => (
                  <button
                    key={store.slug}
                    onClick={() => {
                      exportStoreMenuPDF(store.slug);
                      setIsPDFModalOpen(false);
                    }}
                    disabled={isExporting}
                    className="w-full flex items-center justify-between p-4 bg-[#f8f9fa] hover:bg-[#3525cd]/5 border border-gray-100 hover:border-[#3525cd]/20 rounded-2xl transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-red-500 shadow-sm">
                        <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">{store.name}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">Catálogo listo para descargar</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[#3525cd] transition-colors">download</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      {activeTab === 'products' && (
        <div className="md:hidden fixed right-4 bottom-24 z-40">
          <button 
            onClick={() => { setIsModalOpen(true); resetForm(); }}
            className="w-14 h-14 bg-[#5244e1] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#4338ca] transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-between items-center z-50 rounded-t-2xl shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => setActiveTab('orders')} 
          className={`flex flex-col items-center gap-1 w-16 py-2 rounded-[20px] transition-all ${activeTab === 'orders' ? 'bg-[#5244e1] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <span className="material-symbols-outlined text-[22px]">receipt_long</span>
          <span className="text-[10px] font-bold">Pedidos</span>
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`flex flex-col items-center gap-1 w-16 py-2 rounded-[20px] transition-all ${activeTab === 'products' ? 'bg-[#5244e1] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          <span className="text-[10px] font-bold">Productos</span>
        </button>
        <button 
          onClick={() => setActiveTab('pos')} 
          className={`flex flex-col items-center gap-1 w-16 py-2 rounded-[20px] transition-all ${activeTab === 'pos' ? 'bg-[#5244e1] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
          <span className="text-[10px] font-bold">Vender</span>
        </button>
        <button 
          onClick={() => setActiveTab('metrics')} 
          className={`flex flex-col items-center gap-1 w-16 py-2 rounded-[20px] transition-all ${activeTab === 'metrics' ? 'bg-[#5244e1] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <span className="material-symbols-outlined text-[22px]">bar_chart</span>
          <span className="text-[10px] font-bold">Métricas</span>
        </button>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 w-16 py-2 transition-all text-gray-500 hover:bg-gray-50 rounded-[20px]"
        >
          <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs mb-[2px]">B</div>
          <span className="text-[10px] font-bold">Perfil</span>
        </button>
      </div>

      {/* Mobile Profile Menu Modal */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-full rounded-t-[32px] sm:rounded-[32px] sm:w-[400px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[slideDown_0.3s_ease-out]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Menú</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Tienda</label>
                <select
                  value={selectedStore}
                  onChange={(e) => {
                    setSelectedStore(e.target.value);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                >
                  <option value="all">Todas las tiendas (Super Admin)</option>
                  {Object.values(stores).map(s => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-6">
                <button
                  onClick={() => { setActiveTab('pos'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${activeTab === 'pos' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                  Vender (POS)
                </button>

                <button
                  onClick={() => { setActiveTab('stores'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${activeTab === 'stores' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">store</span>
                  Mis Tiendas
                </button>

                <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-semibold transition-colors">
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Volver a Boga
                </Link>
                
                <button 
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('bogadash_pwa_stats');
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#5244e1] bg-[#5244e1]/5 hover:bg-[#5244e1]/10 rounded-xl font-bold transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">install_mobile</span>
                  Instalar App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && lastCompletedSale && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col w-full max-w-[400px] max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-green-600">check_circle</span>
                Venta Registrada
              </h3>
              <button 
                onClick={() => setIsTicketModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar flex flex-col items-center bg-gray-50/50">
              {/* Receipt Visual Container */}
              <div 
                id="thermal-ticket"
                className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 w-full font-mono text-xs text-gray-800 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Decorative cut details */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-200 via-transparent to-transparent"></div>
                
                {/* Header info */}
                <div className="text-center flex flex-col items-center border-b border-dashed border-gray-200 pb-4">
                  <span className="font-black text-lg text-gray-900 tracking-tight">BOGA MARKET</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">{stores[lastCompletedSale.store]?.name || lastCompletedSale.store}</span>
                  <span className="text-[10px] text-gray-400 mt-2">TICKET DE VENTA LOCAL</span>
                </div>

                {/* Meta details */}
                <div className="flex flex-col gap-1.5 border-b border-dashed border-gray-200 pb-3 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID Venta:</span>
                    <span className="font-bold text-gray-900">#{lastCompletedSale.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="font-bold text-gray-900">
                      {new Date(lastCompletedSale.created_at).toLocaleDateString('es-PE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vendedor:</span>
                    <span className="font-bold text-gray-900">{lastCompletedSale.seller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pago:</span>
                    <span className="font-bold text-gray-900">{lastCompletedSale.payment_method}</span>
                  </div>
                  {lastCompletedSale.customer_name && lastCompletedSale.customer_name !== 'Cliente Local (POS)' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cliente:</span>
                      <span className="font-bold text-gray-900">{lastCompletedSale.customer_name}</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="flex flex-col gap-2 border-b border-dashed border-gray-200 pb-4">
                  <div className="grid grid-cols-12 font-bold text-[10px] text-gray-400 uppercase">
                    <span className="col-span-2">Cant</span>
                    <span className="col-span-6">Producto</span>
                    <span className="col-span-4 text-right">Subtotal</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(() => {
                      const items = Array.isArray(lastCompletedSale.items) 
                        ? lastCompletedSale.items 
                        : typeof lastCompletedSale.items === 'string' 
                          ? JSON.parse(lastCompletedSale.items) 
                          : [];
                      return items.map((item: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 text-[11px] leading-tight">
                          <span className="col-span-2 font-bold">{item.quantity}x</span>
                          <span className="col-span-6 truncate pr-1">{item.name}</span>
                          <span className="col-span-4 text-right">S/ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-1">
                  <span>TOTAL</span>
                  <span>S/ {lastCompletedSale.total_amount.toFixed(2)}</span>
                </div>

                {/* Footer text */}
                <div className="text-center text-[10px] text-gray-400 border-t border-dashed border-gray-200 pt-3 mt-1 uppercase font-bold tracking-widest">
                  ¡Gracias por su compra!
                </div>
              </div>
            </div>

            {/* Print and Share Actions */}
            <div className="p-6 border-t border-gray-100 flex flex-col gap-3 bg-white sticky bottom-0">
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.print();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white hover:bg-gray-800 font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimir Ticket (Impresora Térmica)
              </button>
              
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const items = Array.isArray(lastCompletedSale.items) 
                      ? lastCompletedSale.items 
                      : typeof lastCompletedSale.items === 'string' 
                        ? JSON.parse(lastCompletedSale.items) 
                        : [];
                    
                    const storeName = stores[lastCompletedSale.store]?.name || lastCompletedSale.store.toUpperCase();
                    let ticketText = `*TICKET DE VENTA LOCAL*\n`;
                    ticketText += `*Tienda:* ${storeName}\n`;
                    ticketText += `*Venta ID:* #${lastCompletedSale.id.substring(0, 8)}\n`;
                    ticketText += `*Vendedor:* ${lastCompletedSale.seller_name}\n`;
                    ticketText += `*Método de Pago:* ${lastCompletedSale.payment_method}\n`;
                    ticketText += `---------------------------\n`;
                    items.forEach((item: any) => {
                      ticketText += `• ${item.quantity}x ${item.name} - S/ ${(item.price * item.quantity).toFixed(2)}\n`;
                    });
                    ticketText += `---------------------------\n`;
                    ticketText += `*TOTAL:* S/ ${lastCompletedSale.total_amount.toFixed(2)}\n\n`;
                    ticketText += `¡Gracias por su compra en ${storeName}!`;

                    const phone = lastCompletedSale.customer_phone ? lastCompletedSale.customer_phone.replace(/\D/g, '') : '';
                    const encodedText = encodeURIComponent(ticketText);
                    const whatsappUrl = phone 
                      ? `https://wa.me/${phone.startsWith('51') ? phone : '51' + phone}?text=${encodedText}` 
                      : `https://wa.me/?text=${encodedText}`;
                    
                    window.open(whatsappUrl, '_blank');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white hover:bg-[#20ba59] font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Compartir por WhatsApp
              </button>
            </div>
          </div>
          {/* Custom Print Style */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #thermal-ticket, #thermal-ticket * {
                visibility: visible !important;
              }
              #thermal-ticket {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10px !important;
                margin: 0 !important;
                font-size: 11px !important;
              }
            }
          `}} />
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
