import React, { useContext } from 'react';
import gameContext from 'context/gameContext';

export default function ForgeHammerOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasForgeHammer = Array.isArray(card?.effects) &&
        card.effects.some(effect => effect?.id === 'forge-hammer' && effect?.hero === 'torbjorn');

    if (!hasForgeHammer) return null;

    return (
        <div className="forge-hammer-overlay" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="forge-hammer-icon" style={{
                width: '60px',
                height: '60px',
                background: 'radial-gradient(circle, #ff6b35, #ff8c42)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                border: '3px solid #ff4500',
                boxShadow: '0 0 20px rgba(255, 107, 53, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                animation: 'forgeHammerPulse 2s ease-in-out infinite'
            }}>
                🔨
            </div>
        </div>
    );
}
