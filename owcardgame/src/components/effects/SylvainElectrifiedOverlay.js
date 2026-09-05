import React from 'react';

export default function SylvainElectrifiedOverlay({ cardId, effects }) {
    if (!Array.isArray(effects)) return null;
    const charged = effects.find((e) => e?.id === 'electrified');
    if (!charged) return null;
    const style = {
        position: 'absolute',
        top: '4px',
        right: '6px',
        width: '22px',
        height: '22px',
        backgroundColor: '#0aa8c8',
        borderRadius: '50%',
        boxShadow: '0 0 8px rgba(80, 240, 255, 0.95)',
        zIndex: 3,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e8ffff',
        fontSize: '13px',
        fontWeight: 'bold',
        fontStyle: 'italic',
        fontFamily: 'Georgia, "Times New Roman", serif',
        textShadow: '0 0 6px #7efcff',
        border: '1px solid #9ff7ff',
    };
    return (
        <div key={`sylvain-e-${cardId}`} style={style} title={charged.tooltip || 'Electrified'}>
            E
        </div>
    );
}
