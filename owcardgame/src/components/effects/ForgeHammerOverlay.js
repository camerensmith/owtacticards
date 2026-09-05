import React, { useContext } from 'react';
import gameContext from 'context/gameContext';

/**
 * Torbjörn's Forge Hammer marker.
 *
 * Deliberately quiet: a small corner badge rather than a glowing disc across the
 * card. It is a persistent status, so it has to sit alongside health, shields
 * and the marked-target blip without competing with any of them.
 */
export default function ForgeHammerOverlay({ playerHeroId, rowId }) {
    const { gameState } = useContext(gameContext);

    const playerNum = parseInt(playerHeroId[0]);
    const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
    const hasForgeHammer = Array.isArray(card?.effects) &&
        card.effects.some(effect => effect?.id === 'forge-hammer' && effect?.hero === 'torbjorn');

    if (!hasForgeHammer) return null;

    return (
        <div
            className='forge-hammer-overlay'
            title='Forge Hammer'
            style={{
                position: 'absolute',
                bottom: '4px',
                left: '4px',
                zIndex: 10,
                pointerEvents: 'none',
            }}
        >
            <div
                className='forge-hammer-icon'
                style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    lineHeight: 1,
                    borderRadius: '50%',
                    background: 'rgba(120, 52, 20, 0.82)',
                    border: '1px solid rgba(255, 160, 90, 0.7)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                    animation: 'forgeHammerPulse 2.8s ease-in-out infinite',
                }}
            >
                🔨
            </div>
        </div>
    );
}
