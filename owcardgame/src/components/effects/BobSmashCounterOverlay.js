import React from 'react';
import { BOB_TURNS_COUNTER_ID } from '../../game/bobRules';

export default function BobSmashCounterOverlay({ cardId, effects }) {
    if (!Array.isArray(effects)) return null;
    const counter = effects.find((e) => e?.id === BOB_TURNS_COUNTER_ID);
    if (!counter) return null;
    const value = typeof counter.value === 'number'
        ? counter.value
        : (typeof counter.amount === 'number' ? counter.amount : 0);
    if (value <= 0) return null;

    const style = {
        position: 'absolute',
        bottom: '28%',
        left: '8px',
        minWidth: '22px',
        height: '22px',
        padding: '0 5px',
        backgroundColor: '#1a4a9e',
        borderRadius: '50%',
        boxShadow: '0 0 6px rgba(60, 120, 220, 0.9)',
        zIndex: 3,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 800,
        border: '1px solid #8eb6ff',
    };

    return (
        <div
            key={`bob-smash-${cardId}-${value}`}
            style={style}
            title={counter.tooltip || `Smash: ${value} damage (turns on field)`}
        >
            {value}
        </div>
    );
}
