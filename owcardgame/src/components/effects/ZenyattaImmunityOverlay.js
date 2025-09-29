import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function ZenyattaImmunityOverlay({ playerHeroId }) {
    const { gameState } = useContext(gameContext);

    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];

    const hasZenyattaImmunity = Array.isArray(card?.effects) && card.effects.some(effect =>
        effect?.hero === 'zenyatta' && effect?.type === 'immunity'
    );

    if (!hasZenyattaImmunity) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9,
            pointerEvents: 'none',
            background: 'rgba(128, 0, 128, 0.25)', // faint purple veil
            boxShadow: 'inset 0 0 12px rgba(186, 85, 211, 0.5)',
            borderRadius: '8px',
            backdropFilter: 'saturate(120%)'
        }} />
    );
}
