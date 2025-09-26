import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function MercyHealOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);

    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasMercyHeal = Array.isArray(card?.effects) &&
        card.effects.some(effect => effect?.id === 'mercy-heal' && effect?.type === 'healing');

    if (!hasMercyHeal) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            pointerEvents: 'none'
        }}>
            <div style={{
                width: '60px',
                height: '60px',
                animation: 'mercyHealPulse 2s ease-in-out infinite'
            }}>
                <img 
                    src={require('../../assets/mercyheal.png')} 
                    alt="Mercy Heal" 
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                    }}
                />
            </div>
        </div>
    );
}
