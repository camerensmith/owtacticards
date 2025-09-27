import React, { useContext, useEffect, useState } from 'react';
import gameContext from '../../context/gameContext';

export default function ChainHookOverlay({ sourceCardId, targetCardId, duration = 1000 }) {
    const { gameState } = useContext(gameContext);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Hide overlay after duration
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    if (!isVisible) return null;

    // Get source and target card positions
    const sourceCard = gameState.playerCards[`player${sourceCardId[0]}cards`]?.cards?.[sourceCardId];
    const targetCard = gameState.playerCards[`player${targetCardId[0]}cards`]?.cards?.[targetCardId];

    if (!sourceCard || !targetCard) return null;

    // Find which rows the cards are in
    let sourceRowId = null;
    let targetRowId = null;

    const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
    for (const rowId of allRows) {
        const row = gameState.rows[rowId];
        if (row && row.cardIds) {
            if (row.cardIds.includes(sourceCardId)) {
                sourceRowId = rowId;
            }
            if (row.cardIds.includes(targetCardId)) {
                targetRowId = rowId;
            }
        }
    }

    if (!sourceRowId || !targetRowId) return null;

    // Calculate positions (simplified - would need actual DOM measurements in real implementation)
    const sourceIndex = gameState.rows[sourceRowId].cardIds.indexOf(sourceCardId);
    const targetIndex = gameState.rows[targetRowId].cardIds.indexOf(targetCardId);

    return (
        <div className="chain-hook-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 50
        }}>
            <svg
                width="100%"
                height="100%"
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                <defs>
                    <pattern id="chainPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                        <rect width="20" height="20" fill="transparent"/>
                        <circle cx="10" cy="10" r="2" fill="#8B4513" opacity="0.8"/>
                    </pattern>
                </defs>
                <line
                    x1={`${50 + sourceIndex * 10}%`}
                    y1={`${50 + (sourceRowId[1] === 'f' ? 20 : sourceRowId[1] === 'm' ? 50 : 80)}%`}
                    x2={`${50 + targetIndex * 10}%`}
                    y2={`${50 + (targetRowId[1] === 'f' ? 20 : targetRowId[1] === 'm' ? 50 : 80)}%`}
                    stroke="url(#chainPattern)"
                    strokeWidth="4"
                    strokeDasharray="10,5"
                    opacity="0.8"
                    className="chain-hook-line"
                />
            </svg>
        </div>
    );
}
