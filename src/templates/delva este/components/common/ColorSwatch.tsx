import React from 'react';

interface ColorSwatchProps {
    colors: string[];
    size?: string;
    border?: string;
    shadow?: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ 
    colors = [], 
    size = '24px', 
    border = '2px solid white',
    shadow = '0 2px 5px rgba(0,0,0,0.1)'
}) => {
    if (!colors || colors.length === 0) return null;

    // Single Color
    if (colors.length === 1) {
        return (
            <div style={{ 
                width: size, 
                height: size, 
                borderRadius: '50%', 
                background: colors[0], 
                border, 
                boxShadow: shadow 
            }} />
        );
    }

    // Bicolor (Split 50/50)
    if (colors.length === 2) {
        return (
            <div style={{ 
                width: size, 
                height: size, 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`, 
                border, 
                boxShadow: shadow 
            }} />
        );
    }

    // Tricolor or more (Radial / Multi-gradient)
    return (
        <div style={{ 
            width: size, 
            height: size, 
            borderRadius: '50%', 
            background: `conic-gradient(${colors.map((c, i) => `${c} ${(i * 100) / colors.length}% ${((i + 1) * 100) / colors.length}%`).join(', ')})`, 
            border, 
            boxShadow: shadow 
        }} />
    );
};

export default ColorSwatch;
