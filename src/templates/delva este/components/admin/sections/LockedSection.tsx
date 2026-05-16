import React from 'react';

interface LockedSectionProps {
    title: string;
    children: React.ReactNode;
    isLocked: boolean;
    lockMessage?: string;
}

const LockedSection: React.FC<LockedSectionProps> = ({ title, children, isLocked, lockMessage = "🔒 Solo Dueños" }) => {
    return (
        <div style={{ position: 'relative', background: 'var(--surface)', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', color: 'var(--primary)', opacity: isLocked ? 0.3 : 1 }}>{title}</h3>
            <div style={{ opacity: isLocked ? 0.2 : 1, pointerEvents: isLocked ? 'none' : 'auto', filter: isLocked ? 'grayscale(1)' : 'none' }}>
                {children}
            </div>
            {isLocked && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(3px)', padding: '20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{lockMessage}</span>
                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Función Bloqueada</p>
                </div>
            )}
        </div>
    );
};

export default LockedSection;
