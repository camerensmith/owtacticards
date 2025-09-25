import React, { useContext } from 'react';
import gameContext from 'context/gameContext';

export default function ShieldBashOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Check if this card has Shield Bash effect
    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasShieldBash = Array.isArray(card?.effects) && card.effects.some(effect => effect?.id === 'shield-bash');
    
    if (!hasShieldBash) return null;
    
    return (
        <div 
            className="shield-bash-overlay"
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scaleY(-1)', // Mirror effect (180° turn)
                zIndex: 10,
                pointerEvents: 'none',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#ff6b6b',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                opacity: 0.8
            }}
        >
            <div style={{
                background: 'rgba(255, 107, 107, 0.2)',
                border: '2px solid #ff6b6b',
                borderRadius: '4px',
                padding: '2px 6px',
                textAlign: 'center'
            }}>
                SHIELD BASHED
            </div>
        </div>
    );
}
