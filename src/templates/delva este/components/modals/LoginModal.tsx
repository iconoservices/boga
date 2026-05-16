import React from 'react';
import { type User } from '../../lib/types';

interface LoginModalProps {
    showLogin: boolean;
    setShowLogin: (val: boolean) => void;
    users: User[];
    currentUser: User | null;
    setCurrentUser: (val: User | null) => void;
    setSelectedProfileForLogin: (val: User | null) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    activeLoginTab: 'login' | 'register';
    setActiveLoginTab: (val: 'login' | 'register') => void;
    regName: string;
    setRegName: (val: string) => void;
    regPhone: string;
    setRegPhone: (val: string) => void;
    regHeardFrom: string;
    setRegHeardFrom: (val: string) => void;
    regPass: string;
    setRegPass: (val: string) => void;
    loginIdentifier: string;
    setLoginIdentifier: (val: string) => void;
    isLoggingIn: boolean;
    handleGoogleLogin: () => void;
    attemptLogin: (overrideUser?: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
    showLogin, setShowLogin, users, currentUser, setCurrentUser,
    setSelectedProfileForLogin: _setSelectedProfileForLogin, loginPassword, setLoginPassword,
    activeLoginTab, setActiveLoginTab, regName, setRegName, regPhone, setRegPhone,
    regHeardFrom, setRegHeardFrom, regPass, setRegPass, loginIdentifier, setLoginIdentifier,
    isLoggingIn, handleGoogleLogin, attemptLogin
}) => {
    if (!showLogin) return null;

    return (
        <div className="modal-overlay open" onClick={() => setShowLogin(false)}>
            <div className="modal-card" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                {/* Profile Header if logged in */}
                {currentUser ? (
                    <div style={{ padding: '30px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{ width: '80px', height: '80px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 15px' }}>
                                {currentUser.initials}
                            </div>
                            <h2 style={{ fontSize: '1.2rem' }}>¡Hola, {currentUser.name}!</h2>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Perfil: {currentUser.role}</p>
                        </div>
                        <button className="btn-cart" style={{ width: '100%', background: '#eee', color: '#333' }} onClick={() => setCurrentUser(null)}>Cerrar Sesión</button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', background: '#f5f5f5' }}>
                            <button onClick={() => setActiveLoginTab('login')} style={{ flex: 1, padding: '15px', border: 'none', background: activeLoginTab === 'login' ? 'white' : 'transparent', fontWeight: 700, opacity: activeLoginTab === 'login' ? 1 : 0.5 }}>Ingresar</button>
                            <button onClick={() => setActiveLoginTab('register')} style={{ flex: 1, padding: '15px', border: 'none', background: activeLoginTab === 'register' ? 'white' : 'transparent', fontWeight: 700, opacity: activeLoginTab === 'register' ? 1 : 0.5 }}>Registrarme</button>
                        </div>

                        <div style={{ padding: '30px' }}>
                            {activeLoginTab === 'login' ? (
                                <div>
                                    <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>Bienvenido nuevamente 🌿</h3>
                                    <button onClick={handleGoogleLogin} className="google-btn" disabled={isLoggingIn} style={{ marginBottom: '20px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 600 }}>
                                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" /> Continuar con Google
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', opacity: 0.5 }}>
                                        <hr style={{ flex: 1 }} /> o ingresa con contraseña <hr style={{ flex: 1 }} />
                                    </div>

                                    <input type="text" placeholder="Celular o Email" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                                    <input type="password" placeholder="Contraseña" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ width: '100%', marginBottom: '20px' }} />

                                    <button onClick={() => attemptLogin()} className="btn-cart" style={{ width: '100%' }} disabled={isLoggingIn}>
                                        {isLoggingIn ? 'Verificando...' : 'Entrar a mi cuenta'}
                                    </button>

                                    {/* QUICK ACCESS (STAFF) */}
                                    <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '12px' }}>
                                        <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '10px', textAlign: 'center' }}>ACCESO STAFF (TESTING)</p>
                                        
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', justifyContent: 'center' }}>
                                            {/* Si los usuarios de Firebase cargan */}
                                            {users && users.filter(u => u.role !== 'customer').map(u => (
                                                <div key={u.id}
                                                    onClick={() => attemptLogin(u)}
                                                    style={{ minWidth: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                                                    {u.initials}
                                                </div>
                                            ))}

                                            {/* FALLBACK SEGURIDAD: Botón explícito de Máster si Firebase no responde rápido */}
                                            {(!users || users.length === 0) && (
                                                <button 
                                                    onClick={() => attemptLogin({
                                                        id: 'master',
                                                        name: 'Delva Master',
                                                        email: 'master@delva.com',
                                                        phone: 'master',
                                                        password: 'admin',
                                                        role: 'master',
                                                        initials: 'DM',
                                                        storeName: 'Delva Master',
                                                        photoURL: '',
                                                        customPrimary: '#1A3C34'
                                                    } as User)}
                                                    style={{ background: '#1A3C34', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 800, width: '100%' }}
                                                >
                                                    👑 INGRESAR COMO MÁSTER
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h3 style={{ marginBottom: '20px', fontSize: '1rem' }}>Crea tu cuenta DELVA 🌿</h3>
                                    <input type="text" placeholder="Nombre completo" value={regName} onChange={e => setRegName(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                                    <input type="text" placeholder="Celular" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                                    <select value={regHeardFrom} onChange={e => setRegHeardFrom(e.target.value)} style={{ width: '100%', marginBottom: '10px' }}>
                                        <option value="">¿Cómo nos conociste?</option>
                                        <option value="Tiktok">Tiktok</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Recomendado">Recomendación</option>
                                        <option value="Paso por tienda">Pasé por la tienda</option>
                                    </select>
                                    <input type="password" placeholder="Crea una contraseña" value={regPass} onChange={e => setRegPass(e.target.value)} style={{ width: '100%', marginBottom: '20px' }} />

                                    <button onClick={() => {
                                        if (regName && regPhone && regPass) {
                                            alert('¡Cuenta creada! Ya puedes ingresar.');
                                            setActiveLoginTab('login');
                                        } else alert('Completa todos los campos');
                                    }} className="btn-cart" style={{ width: '100%' }}>Crear mi cuenta</button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LoginModal;
