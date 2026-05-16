export interface ColorOption {
    name: string;
    hex: string;
}

export const STANDARD_COLORS: ColorOption[] = [
    { name: 'Negro', hex: '#1A1A1A' },
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Gris', hex: '#8E8E93' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Café', hex: '#5D4037' },
    { name: 'Rojo', hex: '#FF4D4F' },
    { name: 'Rosa', hex: '#FF85C0' },
    { name: 'Naranja', hex: '#FFA940' },
    { name: 'Amarillo', hex: '#FFEC3D' },
    { name: 'Verde', hex: '#52C41A' },
    { name: 'Turquesa', hex: '#13C2C2' },
    { name: 'Azul', hex: '#1890FF' },
    { name: 'Morado', hex: '#722ED1' },
    { name: 'Oro', hex: '#D4B106' },
    { name: 'Plata', hex: '#C0C0C0' },
];

export const getColorName = (hex: string): string => {
    const found = STANDARD_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    return found ? found.name : 'Personalizado';
};
