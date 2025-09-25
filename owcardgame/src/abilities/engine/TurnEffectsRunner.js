import React, { useContext, useEffect, useRef } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import abilities from '../index';

export default function TurnEffectsRunner() {
    const { gameState } = useContext(gameContext);
    const { turnState } = useContext(turnContext);

    const turnRef = useRef({ turnCount: turnState.turnCount, playerTurn: turnState.playerTurn });

    useEffect(() => {
        console.log('TurnEffectsRunner: useEffect triggered', {
            currentTurn: turnState.turnCount,
            previousTurn: turnRef.current.turnCount,
            currentPlayer: turnState.playerTurn,
            previousPlayer: turnRef.current.playerTurn
        });
        
        // Check if it's a new turn (either turn count increased OR player changed)
        const isNewTurn = turnState.turnCount > turnRef.current.turnCount || 
            (turnState.turnCount === turnRef.current.turnCount && turnState.playerTurn !== turnRef.current.playerTurn);
        
        console.log('TurnEffectsRunner: Turn change check', {
            isNewTurn,
            turnCountIncreased: turnState.turnCount > turnRef.current.turnCount,
            playerChanged: turnState.playerTurn !== turnRef.current.playerTurn,
            currentTurn: turnState.turnCount,
            previousTurn: turnRef.current.turnCount,
            currentPlayer: turnState.playerTurn,
            previousPlayer: turnRef.current.playerTurn
        });
        
        if (isNewTurn) {
            console.log('TurnEffectsRunner: Turn changed, processing effects');
            const playerTurn = turnState.playerTurn;
            const playerRowIds = [`${playerTurn}b`, `${playerTurn}m`, `${playerTurn}f`];

            // Clean up special cards that weren't played this turn
            const handId = `player${playerTurn}hand`;
            const handCards = gameState.rows[handId]?.cardIds || [];
            const specialCardsInHand = handCards.filter(cardId => {
                const card = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[cardId];
                return card?.special === true;
            });
            
            if (specialCardsInHand.length > 0) {
                console.log('TurnEffectsRunner: Found special cards in hand, removing them:', specialCardsInHand);
                
                // Remove special cards from hand and player cards
                for (const cardId of specialCardsInHand) {
                    window.__ow_removeSpecialCard?.(cardId, playerTurn);
                }
                
                // Clean up D.Va "suited-up" state if D.Va+MEKA was removed
                const hadDvameka = specialCardsInHand.some(cardId => cardId.includes('dvameka'));
                if (hadDvameka) {
                    console.log('TurnEffectsRunner: D.Va+MEKA was removed, cleaning up D.Va suited-up state');
                    window.__ow_cleanupDvaSuitedUp?.(playerTurn);
                }
            }

            for (let rowId of playerRowIds) {
                const allyRowEffects = gameState.rows[rowId].allyEffects || [];
                const enemyRowEffects = gameState.rows[rowId].enemyEffects || [];

                console.log(`TurnEffectsRunner: Checking row ${rowId} with ${allyRowEffects.length} ally effects`);

                for (let effect of allyRowEffects) {
                    console.log(`TurnEffectsRunner: Processing effect:`, effect);
                    if (effect.on === 'turnstart') {
                        if (effect.id === 'immortality-field' && effect.hero === 'baptiste') {
                            console.log(`TurnEffectsRunner: Found immortality field, calling cleanup for row ${rowId}`);
                            if (abilities[effect.hero]?.cleanupImmortalityField) {
                                abilities[effect.hero].cleanupImmortalityField(rowId);
                            }
                        } else if (abilities[effect.hero]?.[effect.id]?.run) {
                            abilities[effect.hero][effect.id].run(rowId);
                        }
                    }
                }

                // Card effects (ally)
                for (let cardId of gameState.rows[rowId].cardIds) {
                    const cardEffects = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[cardId]?.allyEffects || [];
                    for (let effect of cardEffects) {
                        if (effect.on === 'turnstart' && abilities[effect.hero]?.[effect.id]?.run) {
                            abilities[effect.hero][effect.id].run(cardId);
                        }
                    }
                }

                // Enemy row effects
                for (let effect of enemyRowEffects) {
                    if (effect.on === 'turnstart' && abilities[effect.hero]?.[effect.id]?.run) {
                        abilities[effect.hero][effect.id].run(rowId);
                    }
                }
            }
        }
        
        // Update the ref after processing
        turnRef.current = { turnCount: turnState.turnCount, playerTurn: turnState.playerTurn };
    }, [turnState.turnCount, turnState.playerTurn, gameState.rows, gameState.playerCards]);

    return null;
}


