'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import LoginModal from '@/components/modals/LoginModal';
import CartDrawer from '@/components/modals/CartDrawer';
import EditProductModal from '@/components/modals/EditProductModal';
import PWAInstallPrompt from '@/components/common/PWAInstallPrompt';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    currentUser, globalBrandName, globalLogo, setIsCartOpen, 
    showLogin, setShowLogin, cart, globalPrimaryColor,
    globalFont, users, setCurrentUser, setSelectedProfileForLogin,
    loginPassword, setLoginPassword, activeLoginTab, setActiveLoginTab,
    regName, setRegName, regPhone, setRegPhone, regHeardFrom, setRegHeardFrom,
    regPass, setRegPass, loginIdentifier, setLoginIdentifier, isLoggingIn,
    handleGoogleLogin, attemptLogin, isCartOpen, updateCartQty, referralCode,
    setReferralCode, globalWaNumber, editingProduct, setEditingProduct,
    globalCategories, globalTags, handleImageUpload, handleGalleryUpload,
    removeGalleryImage, isSaving, saveProduct, fileInputRef, galleryInputRef,
    products, generateSuggestedSKU, deleteProduct, confirmAction, globalColors
  } = useApp();

  const isProductPage = pathname.startsWith('/producto');

  const activeTheme = {
    primary: globalPrimaryColor,
    font: globalFont || 'Montserrat',
    bg: '#ffffff',
    surface: '#F9F9F9',
    radius: '20px'
  };

  return (
    <div className="app-layout" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      '--primary': activeTheme.primary,
      '--bg': activeTheme.bg,
      '--surface': activeTheme.surface,
      '--radius-md': activeTheme.radius,
      '--radius-lg': activeTheme.radius,
      '--font-main': `"${activeTheme.font}", sans-serif`,
      background: 'var(--bg)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    } as any}>
      {!isProductPage && (
        <nav className="navbar">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
            <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', flexShrink: 0, marginRight: '15px' }}>
              {globalLogo ? (
                <img src={globalLogo} style={{ height: '30px' }} alt="logo" />
              ) : (
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{globalBrandName[0]}</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              
              <button className="nav-icon-btn" onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }}>
                <span style={{ fontSize: '1.4rem' }}>🛒</span>
                {cart.length > 0 && <span className="nav-badge">{cart.length}</span>}
              </button>

              <button
                className="nav-icon-btn"
                onClick={() => {
                  if (currentUser) {
                    router.push('/admin');
                  } else {
                    setShowLogin(true);
                  }
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                  {currentUser ? (
                    currentUser.photoURL ? <img src={currentUser.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="user" /> : currentUser.initials
                  ) : '👤'}
                </div>
              </button>

              {/* Botón de WhatsApp Oficial - Movido a la derecha */}
              {globalWaNumber && (
                <a href={`https://wa.me/${globalWaNumber}?text=Hola,%20me%20gustar%C3%ADa%20hacer%20una%20consulta.`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: '14px', fontWeight: 800, fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(37,211,102,0.2)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                  </svg>
                  <span>WhatsApp</span>
                </a>
              )}

              {/* Botón Acceso Rápido POS (Solo Sesión Iniciada) - Movido a la derecha y mejorado */}
              {currentUser && (
                  <button 
                    onClick={() => router.push('/pos')} 
                    style={{ 
                      padding: '6px 12px', 
                      borderRadius: '14px', 
                      border: '1px solid rgba(0,0,0,0.08)', 
                      background: '#fff', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--primary)" viewBox="0 0 16 16">
                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                        <path d="M3 5h10v1H3V5zm0 2h3v1H3V7zm4 0h3v1H7V7zm4 0h2v1h-2V7zm-8 2h3v1H3V9zm4 0h3v1H7V9zm4 0h2v1h-2V9zm-8 2h3v1H3v-1zm4 0h3v1H7v-1zm4 0h2v1h-2v-1z"/>
                      </svg>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.5px' }}>POS</span>
                  </button>
              )}
            </div>
          </div>
        </nav>
      )}

      <main style={{ marginTop: isProductPage ? '0' : '58px', paddingBottom: '100px', flex: 1 }}>
        {children}
      </main>

      {/* MODALS */}
      <LoginModal 
        showLogin={showLogin} 
        setShowLogin={setShowLogin}
        users={users}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        setSelectedProfileForLogin={setSelectedProfileForLogin}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        activeLoginTab={activeLoginTab}
        setActiveLoginTab={setActiveLoginTab}
        regName={regName}
        setRegName={setRegName}
        regPhone={regPhone}
        setRegPhone={setRegPhone}
        regHeardFrom={regHeardFrom}
        setRegHeardFrom={setRegHeardFrom}
        regPass={regPass}
        setRegPass={setRegPass}
        loginIdentifier={loginIdentifier}
        setLoginIdentifier={setLoginIdentifier}
        isLoggingIn={isLoggingIn}
        handleGoogleLogin={handleGoogleLogin}
        attemptLogin={attemptLogin}
      />
      <CartDrawer 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        updateCartQty={updateCartQty}
        referralCode={referralCode}
        setReferralCode={setReferralCode}
        globalWaNumber={globalWaNumber}
      />
      <EditProductModal 
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        globalCategories={globalCategories}
        globalTags={globalTags}
        handleImageUpload={handleImageUpload}
        handleGalleryUpload={handleGalleryUpload}
        removeGalleryImage={removeGalleryImage}
        isSaving={isSaving}
        saveProduct={saveProduct}
        fileInputRef={fileInputRef}
        galleryInputRef={galleryInputRef}
        products={products}
        generateSuggestedSKU={generateSuggestedSKU}
        deleteProduct={deleteProduct}
        confirmAction={confirmAction}
        globalColors={globalColors || []}
        currentUser={currentUser}
      />
      <PWAInstallPrompt />
    </div>
  );
}
