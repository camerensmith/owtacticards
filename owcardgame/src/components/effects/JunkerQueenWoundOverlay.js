import React from 'react';

export default function JunkerQueenWoundOverlay({ cardId, effects }) {
    if (!Array.isArray(effects)) return null;
    const wound = effects.find(e => e?.id === 'jq-wound');
    if (!wound) return null;
    const style = {
        position: 'absolute',
        top: '4px',
        left: '6px',
        width: '22px',
        height: '22px',
        backgroundColor: '#ff6b6b',
        borderRadius: '50%',
        boxShadow: '0 0 6px rgba(0,0,0,0.6)',
        zIndex: 3,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
    };
    return <div key={`jq-wound-${cardId}`} style={style} title={wound.tooltip || 'Wound'}>W</div>;
}


