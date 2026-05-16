import { useRouter } from 'next/navigation';

export default function SmartFab({ onClick, isOpen }: { onClick?: () => void, isOpen?: boolean }) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else {
            router.push('/admin');
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`smart-fab ${isOpen ? 'is-open' : ''}`}
            style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                boxShadow: '0 8px 25px rgba(0,166,81,0.3)',
                background: '#00a651',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: 10001
            }}
            aria-label={isOpen ? "Cerrar" : "Vender ya"}
        >
            <span style={{
                fontSize: '1.4rem',
                color: 'white',
                transition: 'all 0.3s',
                transform: isOpen ? 'rotate(135deg)' : 'none',
                display: 'inline-block',
                fontWeight: 900
            }}>
                +
            </span>
        </button>
    );
}
