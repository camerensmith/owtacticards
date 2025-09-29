import React from 'react';
import junkerqueen from '../../abilities/heroes/junkerqueen';

export default function JunkerQueenRampageCounterOverlay({ playerHeroId, effects }) {
    if (!Array.isArray(effects)) return null;
    // Prefer reading from the attached effect first (guaranteed on the correct JQ instance)
    const counter = effects.find(e => e?.id === 'jq-rampage-counter');
    let value = 0;
    if (counter) {
        value = (typeof counter.value === 'number') ? counter.value : (typeof counter.amount === 'number' ? counter.amount : 0);
    }
    // Fallback to ability module Map if effect missing
    if (!counter) {
        try { value = junkerqueen.getRampageTotal?.(playerHeroId) || 0; } catch { value = 0; }
        if (value === 0) return null; // nothing to show
    }
    const style = {
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: '10px',
        fontWeight: 800,
        fontSize: '14px',
        zIndex: 200,
        pointerEvents: 'none'
    };
    console.log('JQ Counter Overlay: value =', value);
    return <div key={`jq-counter-${value}`} style={style} title={'Rampage: Total wound damage this round'}>{value}</div>;
}


