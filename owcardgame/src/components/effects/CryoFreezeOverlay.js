import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function CryoFreezeOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check if card has Cryo Freeze effect
    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasCryoFreeze = Array.isArray(card?.effects) && 
        card.effects.some(effect => effect?.id === 'cryo-freeze');
    
    if (!hasCryoFreeze) return null;
    
    return (
        <div className="cryo-freeze-overlay" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-15deg)',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#00BFFF',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            animation: 'frozenPulse 2s ease-in-out infinite'
        }}>
            <div style={{
                background: 'linear-gradient(45deg, #00BFFF, #87CEEB)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 8px rgba(0, 191, 255, 0.6))'
            }}>
                FROZEN
            </div>
            <div style={{
                fontSize: '10px',
                color: '#87CEEB',
                marginTop: '2px',
                opacity: 0.8
            }}>
                IMMUNE
            </div>
        </div>
    );
}
