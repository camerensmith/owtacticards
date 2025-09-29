import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';
import { heroIconImages } from '../../assets/imageImports';

export default function ZaryaTokenOverlay({ cardId }) {
    const { gameState } = useContext(gameContext);

    // Get the card data
    const playerNum = parseInt(cardId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
    
    if (!card || !Array.isArray(card.effects)) return null;

    // Find Zarya token on this card
    const zaryaToken = card.effects.find(effect => 
        effect?.hero === 'zarya' && effect?.type === 'zarya-shield'
    );

    // Debug logging
    console.log(`ZaryaTokenOverlay: Card ${cardId} has Zarya token:`, zaryaToken);
    if (zaryaToken) {
        console.log(`ZaryaTokenOverlay: Token amount: ${zaryaToken.amount}, type: ${zaryaToken.type}, hero: ${zaryaToken.hero}`);
    }

    if (!zaryaToken || zaryaToken.amount <= 0) return null;

    return (
        <div key={`zarya-token-${cardId}-${zaryaToken.amount}`} className="zarya-token-overlay" style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            zIndex: 15,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="zarya-token-icon" style={{
                width: '24px',
                height: '24px',
                backgroundImage: `url(${heroIconImages['zarya-icon']})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ff6b35',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}>
                <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #ff6b35'
                }}>
                    {zaryaToken.amount}
                </span>
            </div>
        </div>
    );
}
