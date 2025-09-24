import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';

export default function ImmortalityFieldOverlay({ playerHeroId, rowId }) {
    const { gameState } = React.useContext(gameContext);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const row = gameState.rows[rowId];
        const hasImmortalityField = row?.allyEffects?.some(
            effect => effect.id === 'immortality-field' && effect.hero === 'baptiste'
        );

        if (!hasImmortalityField) {
            setIsVisible(false);
            window.__ow_clearInvulnerableSlots?.(rowId);
            return;
        }

        const cardIds = row.cardIds;
        const centerIndex = cardIds.indexOf(playerHeroId);

        if (centerIndex === -1) {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);
    }, [gameState.rows[rowId]?.allyEffects, gameState.rows[rowId]?.cardIds, playerHeroId, rowId]);

    if (!isVisible) return null;

    // Calculate Baptiste's position in the row
    const row = gameState.rows[rowId];
    const cardIds = row.cardIds;
    const centerIndex = cardIds.indexOf(playerHeroId);
    
    console.log('Overlay positioning debug:', {
        rowId,
        playerHeroId,
        centerIndex,
        cardIds: cardIds?.length || 0,
        rowExists: !!row
    });
    
    // If Baptiste is not found, don't render
    if (centerIndex === -1) {
        console.log('Baptiste not found in row, not rendering overlay');
        return null;
    }
    
    // Simple positioning - just center it in the row for now
    return (
        <div
            className="immortality-field-overlay"
            style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100px',
                height: '385px',
                backgroundColor: 'rgba(0, 255, 255, 0.2)',
                border: '2px solid rgba(0, 255, 255, 0.6)',
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 1000,
                transition: 'all 0.2s ease'
            }}
            title="Immortality Field: Adjacent slots are invulnerable to damage"
        />
    );
}