import React, { useContext, useEffect, useRef } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import abilities from '../index';
import { processAnnihilation } from '../heroes/nemesis';
import junkerqueen from '../heroes/junkerqueen';
import bob from '../heroes/bob';
import { cleanupTemporaryHP } from '../heroes/lifeweaver';
import { processTurretDamage } from '../heroes/turret';
import { recomputeAnaTokens } from '../heroes/ana';
import { tickDisorientOnCards } from '../../game/disorient';
import { isSuitedUp, shouldKeepSuitedUpLock } from '../../game/dvaSuitedUp';

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

            // Junker Queen: apply wound ticks at wounded hero's turn start
            try { junkerqueen.processWoundsAtTurnStart?.(playerTurn); } catch {}
            // B.O.B.: +1 Smash turn counter at the start of his owner's turn
            try { bob.processBobTurnsAtTurnStart?.(playerTurn); } catch {}

            try { recomputeAnaTokens(); } catch {}

            try {
                const cardsById = {};
                ['1f', '1m', '1b', '2f', '2m', '2b'].forEach((rid) => {
                    (gameState.rows[rid]?.cardIds || []).forEach((id) => {
                        const p = id[0];
                        cardsById[id] = gameState.playerCards[`player${p}cards`]?.cards?.[id];
                    });
                });
                const { remove, update } = tickDisorientOnCards(cardsById, playerTurn);
                remove.forEach(({ cardId }) => window.__ow_removeCardEffect?.(cardId, 'disorient'));
                update.forEach(({ cardId, effect }) => {
                    window.__ow_removeCardEffect?.(cardId, 'disorient');
                    window.__ow_appendCardEffect?.(cardId, effect);
                });
            } catch (error) {
                console.error('TurnEffectsRunner: Error ticking Disorient:', error);
            }
            
            // Clean up temporary HP effects at the start of each turn
            try {
                cleanupTemporaryHP(gameState, playerTurn);
            } catch (error) {
                console.error('TurnEffectsRunner: Error cleaning up temporary HP:', error);
            }
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

            // If D.Va is still marked suited-up but her MEKA no longer exists
            // anywhere, clear the lock so she can be played from hand again.
            try {
                const dvaId = `${playerTurn}dva`;
                const dva = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[dvaId];
                if (isSuitedUp(dva)) {
                    const mekaId = `${playerTurn}dvameka`;
                    const mekaInHand = (gameState.rows[handId]?.cardIds || []).includes(mekaId);
                    const mekaOnBoard = [`${playerTurn}f`, `${playerTurn}m`, `${playerTurn}b`]
                        .some((rid) => (gameState.rows[rid]?.cardIds || []).includes(mekaId));
                    if (!shouldKeepSuitedUpLock({ suitedUp: true, mekaOnBoard, mekaInHand })) {
                        window.__ow_cleanupDvaSuitedUp?.(playerTurn);
                    }
                }
            } catch (error) {
                console.error('TurnEffectsRunner: Error clearing stranded D.Va suited-up:', error);
            }

            for (let rowId of playerRowIds) {
                const allyRowEffects = gameState.rows[rowId].allyEffects || [];
                const enemyRowEffects = gameState.rows[rowId].enemyEffects || [];

                console.log(`TurnEffectsRunner: Checking row ${rowId} with ${allyRowEffects.length} ally effects and ${enemyRowEffects.length} enemy effects`);

                for (let effect of allyRowEffects) {
                    console.log(`TurnEffectsRunner: Processing effect:`, effect);
                    if (effect.on === 'turnstart') {
                        if (effect.id === 'immortality-field' && effect.hero === 'baptiste') {
                            console.log(`TurnEffectsRunner: Found immortality field, calling cleanup for row ${rowId}`);
                            if (abilities[effect.hero]?.cleanupImmortalityField) {
                                abilities[effect.hero].cleanupImmortalityField(rowId);
                            }
                        } else if (effect.id === 'lucio-token' && effect.hero === 'lucio') {
                            console.log(`TurnEffectsRunner: Found Lúcio healing token, calling healing for row ${rowId}`);
                            if (abilities[effect.hero]?.lucioTokenHealing) {
                                abilities[effect.hero].lucioTokenHealing(rowId);
                            }
                        } else if (effect.id === 'lucio-shuffle-token' && effect.hero === 'lucio') {
                            console.log(`TurnEffectsRunner: Found Lúcio shuffle token, calling shuffle for row ${rowId}`);
                            if (abilities[effect.hero]?.lucioTokenShuffle) {
                                abilities[effect.hero].lucioTokenShuffle(rowId);
                            }
                        } else if (effect.id === 'orisa-supercharger' && effect.hero === 'orisa') {
                            console.log(`TurnEffectsRunner: Found Orisa Supercharger, updating synergy for row ${rowId}`);
                            if (abilities[effect.hero]?.updateSuperchargerSynergy) {
                                abilities[effect.hero].updateSuperchargerSynergy(rowId);
                            }
                        }
                    }
                }
                
                // Process Nemesis Annihilation effects
                const row = gameState.rows[rowId];
                if (row && row.cardIds) {
                    for (let cardId of row.cardIds) {
                        const card = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[cardId];
                        if (card && card.id === 'nemesis' && Array.isArray(card.effects)) {
                            const hasAnnihilation = card.effects.some(effect => 
                                effect?.id === 'annihilation' && effect?.type === 'persistent'
                            );
                            if (hasAnnihilation) {
                                try {
                                    processAnnihilation(cardId, rowId);
                                } catch (error) {
                                    console.error(`TurnEffectsRunner: Error processing Nemesis Annihilation:`, error);
                                }
                            }
                        }
                    }
                }
                
                // Process Turret damage at start of enemy turn
                try {
                    processTurretDamage(gameState, playerTurn);
                } catch (error) {
                    console.error(`TurnEffectsRunner: Error processing Turret damage:`, error);
                }


                // Process enemy effects
                for (let effect of enemyRowEffects) {
                    console.log(`TurnEffectsRunner: Processing enemy effect:`, effect);
                    if (effect.on === 'turnstart') {
                        if (effect.id === 'lucio-token' && effect.hero === 'lucio') {
                            console.log(`TurnEffectsRunner: Found Lúcio healing token on enemy row, calling healing for row ${rowId}`);
                            if (abilities[effect.hero]?.lucioTokenHealing) {
                                abilities[effect.hero].lucioTokenHealing(rowId);
                            }
                        } else if (effect.id === 'lucio-shuffle-token' && effect.hero === 'lucio') {
                            console.log(`TurnEffectsRunner: Found Lúcio shuffle token on enemy row, calling shuffle for row ${rowId}`);
                            if (abilities[effect.hero]?.lucioTokenShuffle) {
                                abilities[effect.hero].lucioTokenShuffle(rowId);
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
                    
                    // Check for Mercy healing effects on individual cards
                    const card = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[cardId];
                    if (card && Array.isArray(card.effects)) {
                        const hasMercyHeal = card.effects.some(effect => 
                            effect.id === 'mercy-heal' && effect.hero === 'mercy'
                        );
                        if (hasMercyHeal && abilities.mercy?.mercyTokenHealing) {
                            console.log(`TurnEffectsRunner: Found Mercy healing effect on card ${cardId}, calling healing`);
                            abilities.mercy.mercyTokenHealing(cardId);
                        }
                        
                        // Check for Zenyatta Harmony token healing and jumping
                        // Harmony tokens jump on friendly cards, placed by the current player
                        const harmonyToken = card.effects.find(effect => 
                            effect.hero === 'zenyatta' && 
                            effect.type === 'harmony' &&
                            effect.ownerPlayerNum === playerTurn
                        );
                        if (harmonyToken && abilities.zenyatta?.processHarmonyJump) {
                            console.log(`TurnEffectsRunner: Found Harmony token on card ${cardId} (placed by player ${playerTurn}), processing jump`);
                            abilities.zenyatta.processHarmonyJump(cardId);
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

            // Check for Discord token jumping on current player's cards
            // Discord tokens jump at the start of the target's turn (current player is the target)
            // Example: Player 1 places Discord on Player 2's card, jumps at start of Player 2's turn
            const currentPlayerRowIds = [`${playerTurn}f`, `${playerTurn}m`, `${playerTurn}b`];
            const enemyPlayerNum = playerTurn === 1 ? 2 : 1;
            
            for (let rowId of currentPlayerRowIds) {
                for (let cardId of gameState.rows[rowId]?.cardIds || []) {
                    // Discord tokens are on the current player's cards (they are the target)
                    // but placed by the enemy player (ownerPlayerNum is the enemy)
                    const currentPlayerCard = gameState.playerCards[`player${playerTurn}cards`]?.cards?.[cardId];
                    if (currentPlayerCard && Array.isArray(currentPlayerCard.effects)) {
                        // Find Discord tokens placed by the enemy on current player's cards
                        // At start of current player's turn, jump to another current player's card
                        const discordToken = currentPlayerCard.effects.find(effect => 
                            effect.hero === 'zenyatta' && 
                            effect.type === 'discord' &&
                            effect.ownerPlayerNum === enemyPlayerNum
                        );
                        if (discordToken && abilities.zenyatta?.processDiscordJump) {
                            console.log(`TurnEffectsRunner: Found Discord token on card ${cardId} (placed by player ${enemyPlayerNum} on player ${playerTurn}), processing jump to another enemy card`);
                            abilities.zenyatta.processDiscordJump(cardId);
                        }
                    }
                }
            }
        }
        
        // Update the ref after processing
        turnRef.current = { turnCount: turnState.turnCount, playerTurn: turnState.playerTurn };
    }, [turnState.turnCount, turnState.playerTurn, gameState.rows, gameState.playerCards]);

    return null;
}


