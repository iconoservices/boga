import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import LockedSection from './LockedSection';

interface TeamManagerProps {
    effectiveStoreId: string;
    users: User[];
    isColaborador: boolean;
    confirmAction: (title: string, message: string, onConfirm: () => void) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({
    effectiveStoreId, users, isColaborador, confirmAction
}) => {
    const [generatedInviteLink, setGeneratedInviteLink] = useState('');
    const [inviteCopied, setInviteCopied] = useState(false);

    const teamMembers = users.filter(u => u.parentStoreId === effectiveStoreId);

    const generateInvite = async () => {
        const inviteId = Math.random().toString(36).substring(2, 11);
        await setDoc(doc(db, 'invites', inviteId), { 
            id: inviteId, 
            role: 'colaborador', 
            parentStoreId: effectiveStoreId, 
            createdAt: new Date().toISOString() 
        });
        const link = `${window.location.origin}?invite=${inviteId}`;
        setGeneratedInviteLink(link);
        navigator.clipboard.writeText(link);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    return (
        <div className="fade-in">
            <LockedSection title="👥 Gestión de Equipo" isLocked={isColaborador}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>Colaboradores con acceso a esta tienda</p>
                    </div>
                    <button 
                        onClick={generateInvite} 
                        style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '15px', fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                    >
                        {inviteCopied ? '✅ LINK COPIADO' : '🔗 INVITAR COLABORADOR'}
                    </button>
                </div>

                {generatedInviteLink && (
                    <div style={{ background: 'var(--bg)', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px dashed var(--primary)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--primary)', wordBreak: 'break-all', margin: 0 }}>{generatedInviteLink}</p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teamMembers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9f8', borderRadius: '20px', opacity: 0.5 }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>👥</span>
                            <p style={{ fontSize: '0.85rem', margin: 0 }}>No tienes colaboradores todavía.</p>
                        </div>
                    ) : (
                        teamMembers.map(u => (
                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '20px', border: '1px solid #eee', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>
                                        {u.photoURL ? <img src={u.photoURL} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.initials}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>{u.name}</p>
                                        <p style={{ fontSize: '0.7rem', opacity: 0.6, margin: 0 }}>{u.email}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => confirmAction('Quitar Miembro', `¿Estás seguro de remover a ${u.name}?`, () => setDoc(doc(db, 'users', u.id), { role: 'customer', parentStoreId: '' }, { merge: true }))} 
                                    style={{ color: 'var(--danger)', background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    REMOVER
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </LockedSection>
        </div>
    );
};

export default TeamManager;
