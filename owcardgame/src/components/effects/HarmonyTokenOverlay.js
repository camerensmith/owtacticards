import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function HarmonyTokenOverlay({ cardId }) {
    const { gameState } = useContext(gameContext);

    // Get the card data
    const playerNum = parseInt(cardId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    
    if (!card || !Array.isArray(card.effects)) return null;

    // Find Harmony token on this card
    const harmonyToken = card.effects.find(effect => 
        effect?.hero === 'zenyatta' && effect?.type === 'harmony'
    );

    // Debug logging
    console.log(`HarmonyTokenOverlay: Card ${cardId} has effects:`, card.effects);
    console.log(`HarmonyTokenOverlay: Card ${cardId} has Harmony token:`, harmonyToken);

    if (!harmonyToken) return null;

    return (
        <div className="harmony-token-overlay" style={{
            position: 'absolute',
            top: '5px',
            left: '5px',
            zIndex: 15,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="harmony-token-icon" style={{
                width: '24px',
                height: '24px',
                backgroundImage: 'url(/src/assets/harmony.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #4CAF50',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}>
            </div>
        </div>
    );
}
