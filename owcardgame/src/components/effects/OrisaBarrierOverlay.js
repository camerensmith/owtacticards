import React, { useContext } from 'react';
import gameContext from '../../context/gameContext';

export default function OrisaBarrierOverlay({ rowId }) {
    const { gameState } = useContext(gameContext);
    
    // Find which row Orisa is currently in
    let orisaRowId = null;
    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    
    for (const checkRowId of allRows) {
        const row = gameState.rows[checkRowId];
        if (row?.cardIds) {
            const hasOrisa = row.cardIds.some(cardId => {
                const card = gameState.playerCards[`player${cardId[0]}cards`]?.cards?.[cardId];
                return card?.id === 'orisa' && card?.health > 0;
            });
            if (hasOrisa) {
                orisaRowId = checkRowId;
                break;
            }
        }
    }
    
    // Only show overlay on the row where Orisa currently is
    if (orisaRowId !== rowId) return null;
    
    const row = gameState.rows[rowId];
    
    // Check if this row has Orisa's Protective Barrier
    const hasBarrier = row?.allyEffects?.some(effect => 
        effect?.id === 'orisa-barrier' && effect?.type === 'damageReduction'
    );
    
    if (!hasBarrier) return null;
    
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '112%',
            background: 'rgba(255, 230, 7, 0.77)', // Light yellow overlay
            border: '6px solidrgb(0, 255, 255)', // cyan border
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 50,
            animation: 'orisaBarrierPulse 2s ease-in-out infinite'
        }}>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#FFD700',
                fontSize: '14px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
            }}>
                PROTECTIVE BARRIER
            </div>
        </div>
    );
}
