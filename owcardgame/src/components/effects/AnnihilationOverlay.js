import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';
import annihilation from '../../assets/annihilation.png';

export default function AnnihilationOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);
    
    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    
    console.log('AnnihilationOverlay: Checking card:', card);
    console.log('AnnihilationOverlay: Card effects:', card?.effects);
    
    // Check if Nemesis has Annihilation effect
    const hasAnnihilation = Array.isArray(card?.effects) &&
        card.effects.some(effect => effect?.id === 'annihilation' && effect?.type === 'persistent');

    console.log('AnnihilationOverlay: Has annihilation?', hasAnnihilation);

    if (!hasAnnihilation) return null;

    console.log('AnnihilationOverlay: Rendering overlay for', playerHeroId);
    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            pointerEvents: 'none',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '60px',
                height: '60px',
                backgroundImage: `url(${annihilation})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                animation: 'annihilationPulse 2s ease-in-out infinite'
            }}>
            </div>
        </div>
    );
}
