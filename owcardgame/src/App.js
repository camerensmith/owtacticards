import React, { useState, useReducer, useEffect, useRef } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import { DragDropContext } from 'react-beautiful-dnd';
import './App.css';
import PlayerHalf from 'components/layout/PlayerHalf';
import TitleCard from 'components/layout/TitleCard';
import Footer from 'components/layout/Footer';
// Removed CardFocus; migrate turn effects to independent runner
import TurnEffectsRunner from './abilities/engine/TurnEffectsRunner';
import CardFocusLite from 'components/cards/CardFocusLite';
import MatchCounter from 'components/counters/MatchCounter';
import data from 'data';
import getRandInt, { PlayerCard } from 'helper';
import { produce } from 'immer';
import { getAudioFile } from './assets/imageImports';
import _ from 'lodash';
import Tutorial from 'components/tutorial/Tutorial';
import CenterSection from 'components/layout/CenterSection';
import { showOnEnterChoice, subscribeToModal, closeModal } from './abilities/engine/modalController';
import ChoiceModal from './components/modals/ChoiceModal';
import InterruptModal from './components/modals/InterruptModal';
import { subscribe as subscribeToActions, Actions } from './abilities/engine/actionsBus';
import $ from 'jquery';
import abilitiesIndex from './abilities';
import TopBanner from './components/layout/TopBanner';
import { subscribe as subscribeTargeting, showMessage as showToast, clearMessage as clearToast } from './abilities/engine/targetingBus';
import { subscribe as subscribeDamage } from './abilities/engine/damageBus';

export const ACTIONS = {
    ADD_CARD_EFFECT: 'add-card-effect',
    ADD_CARD_TO_HAND: 'add-card-to-hand',
    ADD_ROW_EFFECT: 'add-row-effect',
    ADD_ROW_SHIELD: 'add-row-shield',
    CREATE_CARD: 'create-card',
    DAMAGE_ROW_SHIELD: 'damage-row-shield',
    DISCARD_CARD: 'discard-card',
    EDIT_CARD: 'edit-card',
    EDIT_ROW: 'edit-row',
    MOVE_CARD: 'move-card',
    REMOVE_EFFECTS: 'remove-effects',
    SET_POWER: 'set-power',
    SET_SYNERGY: 'set-synergy',
    UPDATE_CARD: 'update-card',
    UPDATE_POWER: 'update-power',
    MARK_ULTIMATE_USED: 'mark-ultimate-used',
    RESET_ULTIMATE_USAGE: 'reset-ultimate-usage',
    UPDATE_ROW: 'update-row',
    UPDATE_SYNERGY: 'update-synergy',
    DEDUCT_SYNERGY: 'deduct-synergy',
    SET_INVULNERABLE_SLOTS: 'set-invulnerable-slots',
    CLEAR_INVULNERABLE_SLOTS: 'clear-invulnerable-slots',
    REMOVE_ROW_EFFECT: 'remove-row-effect',
};

function reducer(gameState, action) {
    switch (action.type) {
        // Add hero effect to a card
        case ACTIONS.ADD_CARD_EFFECT: {
            return produce(gameState, (draft) => {
                // Payload info
                const targetCardId = action.payload.targetCardId;
                const targetPlayer = targetCardId[0];
                const playerHeroId = action.payload.playerHeroId;
                const effectId = action.payload.effectId;

                // Get effect object from state
                const playerNum = parseInt(playerHeroId[0]);
                const cardEffect =
                    gameState.playerCards[`player${playerNum}cards`].cards[
                        playerHeroId
                    ].effects[effectId];

                return produce(gameState, (draft) => {
                    if (cardEffect.player === 'ally') {
                        draft.playerCards[`player${targetPlayer}cards`].cards[
                            targetCardId
                        ].allyEffects.push(cardEffect);
                    } else if (cardEffect.player === 'enemy') {
                        draft.playerCards[`player${targetPlayer}cards`].cards[
                            targetCardId
                        ].enemyEffects.push(cardEffect);
                    }
                });
            });
        }

        // Add hero effect to a row
        case ACTIONS.ADD_ROW_EFFECT: {
            // Payload info
            const targetRow = action.payload.targetRow;
            const playerHeroId = action.payload.playerHeroId;
            const effectId = action.payload.effectId;
            const playerNum = parseInt(playerHeroId[0]);
            // Get effect object from state
            const rowEffect =
                gameState.playerCards[`player${playerNum}cards`].cards[
                    playerHeroId
                ].effects[effectId];

            return produce(gameState, (draft) => {
                if (rowEffect.player === 'ally') {
                    draft.rows[targetRow].allyEffects.push(rowEffect);
                } else if (rowEffect.player === 'enemy') {
                    draft.rows[targetRow].enemyEffects.push(rowEffect);
                }
            });
        }

        // Add shield value to row
        case ACTIONS.ADD_ROW_SHIELD: {
            const playerHeroId = action.payload.playerHeroId;
            const targetRow = action.payload.targetRow;
            const rowShield = action.payload.rowShield;

            // If hero already added shield to row, increase shield, else set shield
            return produce(gameState, (draft) => {
                draft.rows[targetRow].shield.push({
                    playerHeroId: playerHeroId,
                    shieldValue: rowShield,
                });
            });
        }

        // Add a created card in to the player's hand
        case ACTIONS.ADD_CARD_TO_HAND: {
            const playerNum = action.payload.playerNum;
            const playerHeroId = action.payload.playerHeroId;

            return produce(gameState, (draft) => {
                draft.rows[`player${playerNum}hand`].cardIds.push(playerHeroId);
            });
        }

        // Adds a card to player's cards (doesn't add to a row)
        case ACTIONS.CREATE_CARD: {
            const playerNum = action.payload.playerNum;
            const heroId = action.payload.heroId;
            const newCard = new PlayerCard(playerNum, heroId);

            // Add new card to playercards data (does not add the card to any row)
            // Call Move_Card to make card visible
            return produce(gameState, (draft) => {
                draft.playerCards[`player${playerNum}cards`].cards[
                    newCard.playerHeroId
                ] = newCard;
            });
        }

        // Damage a row's shields
        case ACTIONS.DAMAGE_ROW_SHIELD: {
            const targetRow = action.payload.targetRow;
            const rowShieldDamage = action.payload.rowShieldDamage;

            console.log(
                `applying ${rowShieldDamage} damage to row ${targetRow}`
            );

            return produce(gameState, (draft) => {
                const targetRowShieldArr = draft.rows[targetRow].shield;
                let damageDone = 0;

                // Reduce shield of each shieldEntry in the array until 0, then move on to the next until full damage is done
                // Use labeled break to break out of both loops if full damage has been done
                outer: for (let x = 0; x < targetRowShieldArr.length; x++) {
                    for (let i = 0; i < rowShieldDamage; i++) {
                        if (damageDone === rowShieldDamage) break outer;

                        targetRowShieldArr[x].shieldValue -= 1;
                        damageDone += 1;

                        console.log(
                            `${targetRowShieldArr[x].playerHeroId}'s shield is now ${targetRowShieldArr[x].shieldValue}`
                        );
                    }
                }

                // Delete entries in shield array if their shieldValue has been reduced to 0
                for (let x = 0; x < targetRowShieldArr.length; x++) {
                    if (targetRowShieldArr[x].shieldValue === 0) {
                        targetRowShieldArr.splice(x, 1);
                    }
                }
            });
        }

        // Discard a card
        case ACTIONS.DISCARD_CARD: {
            const targetCardId = action.payload.targetCardId;
            const targetCardRow = action.payload.targetCardRow;
            const playerNum = parseInt(targetCardId[0]);

            // Identify affected card, mark as discarded, and remove from relevant row
            return produce(gameState, (draft) => {
                draft.playerCards[`player${playerNum}cards`].cards[
                    targetCardId
                ].isDiscarded = true;
                draft.rows[targetCardRow].cardIds = draft.rows[
                    targetCardRow
                ].cardIds.filter((cardId) => cardId !== targetCardId);
            });
        }

        // Replace a value
        case ACTIONS.EDIT_CARD: {
            // Required variables
            const playerNum = action.payload.playerNum;
            const targetCardId = action.payload.targetCardId;
            const editKeys = action.payload.editKeys;
            const editValues = action.payload.editValues;

            // Identify affected card and apply all edits
            return produce(gameState, (draft) => {
                let targetCard =
                    draft.playerCards[`player${playerNum}cards`].cards[
                        targetCardId
                    ];

                // Use lodash to set object properties (allows a string to be used for a nested object path)
                for (let i = 0; i < editKeys.length; i++) {
                    _.set(targetCard, editKeys[i], editValues[i]);
                }
            });
        }

        case 'external-set-card-health': {
            const { targetCardId, newHealth } = action.payload || {};
            const playerNum = parseInt(targetCardId[0]);
            return produce(gameState, (draft) => {
                const card = draft.playerCards[`player${playerNum}cards`].cards[targetCardId];
                if (card) card.health = newHealth;
            });
        }

        // Replaces existing values with new values
        case ACTIONS.EDIT_ROW: {
            const targetRow = action.payload.targetRow;
            const editKeys = action.payload.editKeys;
            const editValues = action.payload.editValues;

            // Identify affected card and apply all edits
            return produce(gameState, (draft) => {
                for (let i = 0; i < editKeys.length; i++) {
                    draft.rows[targetRow][editKeys[i]] = editValues[i];
                }
            });
        }

        // Moves a card within or between rows
        case ACTIONS.MOVE_CARD: {
            // Variables from payload
            const targetCardId = action.payload.targetCardId;
            const startRowId = action.payload.startRowId;
            const startIndex = action.payload.startIndex;
            const finishRowId = action.payload.finishRowId;
            const finishIndex = action.payload.finishIndex;

            // Variables from game state
            const startRow = gameState.rows[startRowId];
            const finishRow = gameState.rows[finishRowId];

            // Move card within same row
            if (startRowId === finishRowId) {
                const rowId = startRowId;
                const row = startRow;
                const newCardIds = Array.from(row.cardIds);
                newCardIds.splice(startIndex, 1);
                newCardIds.splice(finishIndex, 0, targetCardId);

                return produce(gameState, (draft) => {
                    draft.rows[rowId].cardIds = newCardIds;
                });
            }

            // Moving from one row to another
            const newStartRowCardIds = Array.from(startRow.cardIds);
            newStartRowCardIds.splice(startIndex, 1);

            const newFinishRowCardIds = Array.from(finishRow.cardIds);
            newFinishRowCardIds.splice(finishIndex, 0, targetCardId);

            // Check for Bastion token damage when moving to any row (not hand)
            if (finishRowId[0] !== 'p') {
                const targetPlayerNum = parseInt(targetCardId[0]);
                const finishRowPlayerNum = parseInt(finishRowId[0]);
                
                // Check if the target row has Bastion tokens
                const bastionTokens = gameState.rows[finishRowId]?.enemyEffects?.filter(
                    effect => effect.id === 'bastion-token' && effect.hero === 'bastion'
                ) || [];
                
                if (bastionTokens.length > 0) {
                    // Apply 1 damage to the moving card
                    setTimeout(() => {
                        window.__ow_dealDamage?.(targetCardId, finishRowId, 1);
                    }, 100);
                }
            }

            return produce(gameState, (draft) => {
                draft.rows[startRowId].cardIds = newStartRowCardIds;
                draft.rows[finishRowId].cardIds = newFinishRowCardIds;
            });
        }

        // Sets player power
        case ACTIONS.SET_POWER: {
            const playerNum = action.payload.playerNum;
            const rowPosition = action.payload.rowPosition;
            const powerValue = action.payload.powerValue;

            return produce(gameState, (draft) => {
                draft.rows[`player${playerNum}hand`].power[rowPosition] =
                    powerValue;
            });
        }

        // Sets row synergy
        case ACTIONS.SET_SYNERGY: {
            const rowId = action.payload.rowId;
            const newSynergyVal = action.payload.newSynergyVal;

            return produce(gameState, (draft) => {
                draft.rows[rowId].synergy = newSynergyVal;
            });
        }

        // Update value based on previous value
        case ACTIONS.UPDATE_CARD: {
            // Required variables
            const playerNum = action.payload.playerNum;
            const cardId = action.payload.cardId;
            const updateKeys = action.payload.updateKeys;
            const updateValues = action.payload.updateValues;

            // Identify affected card and apply all updates
            return produce(gameState, (draft) => {
                let targetCard =
                    draft.playerCards[`player${playerNum}cards`].cards[cardId];

                for (let i = 0; i < updateKeys.length; i++) {
                    targetCard[updateKeys[i]] += updateValues[i];
                }
            });
        }

        // Updatesrow synergy
        case ACTIONS.UPDATE_POWER: {
            // Required variables
            const targetPlayer = action.payload.targetPlayer;
            const targetRow = action.payload.targetRow;
            const powerValue = action.payload.powerValue;

            // Update synergy and set value, minimum of 0 synergy
            return produce(gameState, (draft) => {
                let rowPower =
                    draft.rows[`player${targetPlayer}hand`].power[targetRow];
                rowPower += powerValue;
                const newPower = Math.max(0, rowPower);
                draft.rows[`player${targetPlayer}hand`].power[targetRow] =
                    newPower;
            });
        }

        // Update value based on previous value
        case ACTIONS.UPDATE_ROW: {
            // Required variables
            const playerNum = action.payload.playerNum;
            const targetRow = action.payload.targetRow;
            const updateKeys = action.payload.updateKeys;
            const updateValues = action.payload.updateValues;

            // Identify affected card and apply all updates
            return produce(gameState, (draft) => {
                for (let i = 0; i < updateKeys.length; i++) {
                    draft.rows[targetRow][updateKeys[i]] += updateValues[i];
                }
            });
        }

        // Sets row synergy
        case ACTIONS.UPDATE_SYNERGY: {
            // Required variables
            const rowId = action.payload.rowId;
            const synergyCost = action.payload.synergyCost;

            // Update synergy and set value, minimum of 0 synergy
            return produce(gameState, (draft) => {
                let rowSynergy = draft.rows[rowId].synergy;
                rowSynergy += synergyCost;
                const newSynergy = Math.max(0, rowSynergy);
                draft.rows[rowId].synergy = newSynergy;
            });
        }

        // Deduct synergy for ultimate abilities
        case ACTIONS.DEDUCT_SYNERGY: {
            const rowId = action.payload.rowId;
            const synergyCost = action.payload.synergyCost;

            return produce(gameState, (draft) => {
                draft.rows[rowId].synergy = Math.max(0, draft.rows[rowId].synergy - synergyCost);
            });
        }

        // Set invulnerable slots for Immortality Field
        case ACTIONS.SET_INVULNERABLE_SLOTS: {
            const { rowId, sourceCardId, sourceRowId } = action.payload;
            
            return produce(gameState, (draft) => {
                // Find Baptiste's position in the row
                const cardIds = draft.rows[sourceRowId].cardIds;
                const centerIndex = cardIds.indexOf(sourceCardId);
                if (centerIndex === -1) return;

                const leftIndex = centerIndex - 1;
                const rightIndex = centerIndex + 1;

                if (!draft.invulnerableSlots) draft.invulnerableSlots = {};
                if (!draft.invulnerableSlots[sourceRowId]) draft.invulnerableSlots[sourceRowId] = {};

                // Store per-source so multiple fields can overlap
                draft.invulnerableSlots[sourceRowId][sourceCardId] = [centerIndex, leftIndex, rightIndex]
                    .filter(i => i >= 0 && i < cardIds.length);
            });
        }

        // Clear invulnerable slots
        case ACTIONS.CLEAR_INVULNERABLE_SLOTS: {
            const { rowId } = action.payload;
            
            return produce(gameState, (draft) => {
                if (draft.invulnerableSlots && draft.invulnerableSlots[rowId]) {
                    delete draft.invulnerableSlots[rowId];
                }
            });
        }

        // Remove row effect
        case ACTIONS.REMOVE_ROW_EFFECT: {
            const { rowId, effectType, effectId } = action.payload;
            return produce(gameState, (draft) => {
                if (draft.rows[rowId] && draft.rows[rowId][effectType]) {
                    draft.rows[rowId][effectType] = draft.rows[rowId][effectType].filter(
                        effect => effect.id !== effectId
                    );
                }
            });
        }

        // Mark ultimate as used for a hero
        case ACTIONS.MARK_ULTIMATE_USED: {
            const { playerNum, heroId } = action.payload;
            return produce(gameState, (draft) => {
                const playerKey = `player${playerNum}`;
                if (draft.ultimateUsage[playerKey] && !draft.ultimateUsage[playerKey].includes(heroId)) {
                    draft.ultimateUsage[playerKey].push(heroId);
                }
            });
        }

        // Reset ultimate usage for all heroes (start of new round)
        case ACTIONS.RESET_ULTIMATE_USAGE: {
            return produce(gameState, (draft) => {
                draft.ultimateUsage.player1 = [];
                draft.ultimateUsage.player2 = [];
            });
        }

        default:
            return gameState;
    }
}

// Check for onEnter abilities when a hero is deployed
function checkOnEnterAbilities(playerHeroId, rowId, playerNum) {
    const heroId = playerHeroId.slice(1);
    const heroData = data.heroes[heroId];
    
    // Delegate modular heroes
    if (heroId === 'ashe' && abilitiesIndex?.ashe?.onEnter) {
        const doDamage = (targetCardId, targetRow, amount, ignoreShields) => {
            // TODO: expose a central damage bus; for now log intent
            console.log('modular Ashe damage', { targetCardId, targetRow, amount, ignoreShields });
        };
        abilitiesIndex.ashe.onEnter({ playerNum, rowId, doDamage });
        return;
    }

    if (heroId === 'bob' && abilitiesIndex?.bob?.onEnter) {
        abilitiesIndex.bob.onEnter({ playerNum, rowId });
        return;
    }

    if (heroId === 'ana' && abilitiesIndex?.ana?.onEnter) {
        // Play placement via module
        abilitiesIndex.ana.onEnter({ playerNum, rowId });
        // Trigger onEnter ability 1 targeting/heal/damage
        if (abilitiesIndex.ana.onEnterAbility1) abilitiesIndex.ana.onEnterAbility1({ playerNum, playerHeroId });
        return;
    }

    if (heroId === 'baptiste' && abilitiesIndex?.baptiste?.onEnter) {
        abilitiesIndex.baptiste.onEnter({ playerNum, rowId });
        return;
    }

    if (heroId === 'bastion' && abilitiesIndex?.bastion?.onEnter) {
        abilitiesIndex.bastion.onEnter({ playerHeroId, rowId });
        return;
    }

    if (!heroData) return;
    
    // Check if hero has onEnter abilities from hero.json
    // This would need to be integrated with the hero.json data
    // For now, we'll use a simple example structure
    const onEnter1 = heroData.onEnter1;
    const onEnter2 = heroData.onEnter2;
    
    if (onEnter1 && onEnter2) {
        // Show choice modal and execute selected branch
        showOnEnterChoice(heroData.name, onEnter1, onEnter2, (choiceIndex) => {
            if (heroId === 'ashe') {
                // Modularized Ashe onEnter choice
                if (choiceIndex === 0) {
                    // 2 damage ignoring shields to one enemy in chosen row
                    // Let user click an enemy card in any row, but require same row constraint below
                    $('.card').one('click', (e) => {
                        const targetCardId = $(e.target).closest('.card').attr('id');
                        const targetRow = $(e.target).closest('.row').attr('id');
                        if (targetRow[0] === 'p' || parseInt(targetRow[0]) === playerNum) return;
                        applyAsheDamage(targetCardId, targetRow, 2, true);
                    });
                } else if (choiceIndex === 1) {
                    // 1 damage ignoring shields to two enemies in the same row
                    let selected = [];
                    const handler = (e) => {
                        const targetCardId = $(e.target).closest('.card').attr('id');
                        const targetRow = $(e.target).closest('.row').attr('id');
                        if (targetRow[0] === 'p' || parseInt(targetRow[0]) === playerNum) return;
                        if (selected.length === 0) {
                            selected.push({ targetCardId, targetRow });
                        } else if (selected.length === 1) {
                            // enforce same row
                            if (selected[0].targetRow !== targetRow) return;
                            selected.push({ targetCardId, targetRow });
                            $('.card').off('click', handler);
                            // apply to both
                            applyAsheDamage(selected[0].targetCardId, selected[0].targetRow, 1, true);
                            applyAsheDamage(selected[1].targetCardId, selected[1].targetRow, 1, true);
                        }
                    };
                    $('.card').on('click', handler);
                }
            } else {
                // Generic execution fallback
                executeOnEnterAbility(choiceIndex === 0 ? onEnter1 : onEnter2, `${playerNum}${heroId}`, rowId, playerNum);
            }
        });
    } else if (onEnter1) {
        // Auto-execute onEnter1
        executeOnEnterAbility(onEnter1, playerHeroId, rowId, playerNum);
    }
}

// Execute an onEnter ability
function executeOnEnterAbility(ability, playerHeroId, rowId, playerNum) {
    // This would integrate with the existing ability system
    console.log(`Executing onEnter ability: ${ability} for ${playerHeroId} in ${rowId}`);
    // TODO: Implement actual ability execution
}

// Helper for Ashe onEnter damage
function applyAsheDamage(targetCardId, targetRow, dmg, ignoreShields) {
    try {
        // Route through HeroAbilities applyDamage by dispatching a synthetic event would be ideal;
        // for now, access via a minimal duplication using actions is non-trivial.
        // As a pragmatic step, we publish an action that HeroAbilities already listens for via abilities.
        // Fallback: directly call window-level helper not available; use minimal jQuery event to trigger ability1 pattern if present.
        // Interim solution: log intent. Replace with centralized damage bus later.
        console.log('Ashe onEnter damage', { targetCardId, targetRow, dmg, ignoreShields });
        // Note: actual damage application currently lives in HeroAbilities.applyDamage.
        // Proper integration will move this into the ability engine.
    } catch (e) {}
}

export default function App() {
    const [gameState, dispatch] = useReducer(reducer, data);

    const [matchState, setMatchState] = useState({
        player1: { wins: 0 },
        player2: { wins: 0 },
        wonLastRound: 0,
    });
    const [turnState, setTurnState] = useState({
        turnCount: 1,
        playerTurn: getRandInt(1, 3),
        player1Passed: false,
        player2Passed: false,
    });
    const [cardFocus, setCardFocus] = useState(null);
    const [nextCardDraw, setNextCardDraw] = useState({
        player1: null,
        player2: null,
    });
    const [playAudio, setPlayAudio] = useState(false);
    const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
    const [targetingMessage, setTargetingMessage] = useState(null);
    
    // Expose a minimal bridge for hero modules to append row effects (e.g., BOB token)
    useEffect(() => {
        window.__ow_appendRowEffect = (rowId, arrayKey, effect) => {
            try {
                const currentArr = gameState.rows[rowId]?.[arrayKey] || [];
                dispatch({
                    type: ACTIONS.EDIT_ROW,
                    payload: {
                        targetRow: rowId,
                        editKeys: [arrayKey],
                        editValues: [[...currentArr, effect]],
                    },
                });
            } catch (e) {}
        };
        window.__ow_getRow = (rowId) => gameState.rows[rowId];
        window.__ow_setRowArray = (rowId, arrayKey, nextArr) => {
            dispatch({
                type: ACTIONS.EDIT_ROW,
                payload: { targetRow: rowId, editKeys: [arrayKey], editValues: [nextArr] }
            });
        };
        window.__ow_updateSynergy = (rowId, delta) => {
            dispatch({
                type: ACTIONS.UPDATE_SYNERGY,
                payload: { rowId, synergyCost: delta }
            });
        };
        window.__ow_getCard = (playerHeroId) => {
            const pn = parseInt(playerHeroId[0]);
            return gameState.playerCards[`player${pn}cards`].cards[playerHeroId];
        };
        window.__ow_getMaxHealth = (playerHeroId) => {
            // Lookup from data.js heroes
            const heroId = playerHeroId.slice(1);
            return data.heroes[heroId]?.health ?? undefined;
        };
        window.__ow_setCardHealth = (playerHeroId, newHealth) => {
            dispatch({ type: 'external-set-card-health', payload: { targetCardId: playerHeroId, newHealth } });
        };
        window.__ow_isSpecial = (heroId) => {
            return !!data.heroes[heroId]?.special;
        };
        window.__ow_setRowPower = (playerNum, rowPosition, powerValue) => {
            dispatch({ type: ACTIONS.SET_POWER, payload: { playerNum, rowPosition, powerValue } });
        };
        window.__ow_setInvulnerableSlots = (rowId, sourceCardId, sourceRowId) => {
            dispatch({
                type: ACTIONS.SET_INVULNERABLE_SLOTS,
                payload: { rowId, sourceCardId, sourceRowId }
            });
        };
        window.__ow_clearInvulnerableSlots = (rowId) => {
            dispatch({
                type: ACTIONS.CLEAR_INVULNERABLE_SLOTS,
                payload: { rowId }
            });
        };
        window.__ow_isSlotInvulnerable = (rowId, slotIndex) => {
            const invulnMap = gameState.invulnerableSlots?.[rowId];
            if (!invulnMap) return false;
            // Check if any active field protects this slot
            const isInvuln = Object.values(invulnMap).some(slotArray => 
                Array.isArray(slotArray) && slotArray.includes(slotIndex)
            );
            if (isInvuln) {
                console.log(`Slot ${slotIndex} in row ${rowId} is invulnerable`, invulnMap);
            }
            return isInvuln;
        };
        window.__ow_removeRowEffect = (rowId, effectType, effectId) => {
            dispatch({
                type: ACTIONS.REMOVE_ROW_EFFECT,
                payload: { rowId, effectType, effectId }
            });
        };
        window.__ow_cleanupImmortalityField = (rowId) => {
            // Clear invulnerable slots
            dispatch({
                type: ACTIONS.CLEAR_INVULNERABLE_SLOTS,
                payload: { rowId }
            });
            // Remove the effect from the row
            dispatch({
                type: ACTIONS.REMOVE_ROW_EFFECT,
                payload: { rowId, effectType: 'allyEffects', effectId: 'immortality-field' }
            });
            console.log(`Manual cleanup: Immortality Field cleared for row ${rowId}`);
        };
        window.__ow_dealDamage = (cardId, rowId, amount) => {
            // Import and use the damage bus
            import('./abilities/engine/damageBus').then(({ dealDamage }) => {
                dealDamage(cardId, rowId, amount);
            }).catch(err => {
                console.error('Failed to import damageBus:', err);
            });
        };
        return () => { window.__ow_appendRowEffect = null; window.__ow_getRow = null; window.__ow_setRowArray = null; window.__ow_updateSynergy = null; window.__ow_getCard = null; window.__ow_getMaxHealth = null; window.__ow_setCardHealth = null; window.__ow_isSpecial = null; window.__ow_setRowPower = null; window.__ow_setInvulnerableSlots = null; window.__ow_clearInvulnerableSlots = null; window.__ow_isSlotInvulnerable = null; window.__ow_removeRowEffect = null; window.__ow_cleanupImmortalityField = null; window.__ow_dealDamage = null; };
    }, [gameState]);
    // Game logic state
    const [gameLogic, setGameLogic] = useState({
        currentRound: 1,
        maxRounds: 3,
        player1Score: 0,
        player2Score: 0,
        player1Turns: 0,
        player2Turns: 0,
        player1Deployed: 0,
        player2Deployed: 0,
        maxTurnsPerPlayer: 7,
        maxHandSize: 6, // Changed from 10 to 6
        maxHeroesPerPlayer: 6,
        gamePhase: 'playing', // 'playing', 'roundEnd', 'gameEnd'
        player1DrawnHeroes: [], // Track heroes drawn by player 1 this round
        player2DrawnHeroes: []  // Track heroes drawn by player 2 this round
    });

    // References for setting state inside useEffects
    let matchRef = useRef(null);

    // Helper function to get heroes by role
    const getHeroesByRole = (role) => {
        return Object.keys(data.heroes).filter(heroId => 
            data.heroes[heroId].role === role && 
            !data.heroes[heroId].special // Exclude special cards
        );
    };

    // Helper function to draw a random hero from a specific role
    const drawHeroFromRole = (role, playerNum) => {
        const availableHeroes = getHeroesByRole(role);
        const drawnHeroes = playerNum === 1 ? gameLogic.player1DrawnHeroes : gameLogic.player2DrawnHeroes;
        
        // Filter out already drawn heroes
        const availableHeroesFiltered = availableHeroes.filter(heroId => 
            !drawnHeroes.includes(heroId)
        );
        
        if (availableHeroesFiltered.length === 0) {
            // Fallback to any available hero if role is exhausted
            const allAvailable = Object.keys(data.heroes).filter(heroId => 
                !drawnHeroes.includes(heroId) && 
                !data.heroes[heroId].special
            );
            if (allAvailable.length === 0) return null;
            return allAvailable[getRandInt(0, allAvailable.length)];
        }
        
        return availableHeroesFiltered[getRandInt(0, availableHeroesFiltered.length)];
    };

    // Function to track drawn heroes
    const trackDrawnHero = (heroId, playerNum) => {
        setGameLogic(prev => ({
            ...prev,
            [`player${playerNum}DrawnHeroes`]: [...prev[`player${playerNum}DrawnHeroes`], heroId]
        }));
    };

    // Initialize game with 4 cards per player (one from each role)
    const initializeGame = () => {
        const roles = ['offense', 'tank', 'support', 'defense'];
        
        // Reset drawn heroes for new round
        setGameLogic(prev => ({
            ...prev,
            player1DrawnHeroes: [],
            player2DrawnHeroes: []
        }));
        
        // Draw 4 cards for player 1 (one from each role)
        roles.forEach(role => {
            const newCardId = drawHeroFromRole(role, 1);
            if (newCardId) {
                const playerHeroId = `1${newCardId}`;
                
                dispatch({
                    type: ACTIONS.CREATE_CARD,
                    payload: { playerNum: 1, heroId: newCardId },
                });
                dispatch({
                    type: ACTIONS.ADD_CARD_TO_HAND,
                    payload: { playerNum: 1, playerHeroId: playerHeroId },
                });
                
                // Track drawn hero
                setGameLogic(prev => ({
                    ...prev,
                    player1DrawnHeroes: [...prev.player1DrawnHeroes, newCardId]
                }));
            }
        });
        
        // Draw 4 cards for player 2 (one from each role)
        roles.forEach(role => {
            const newCardId = drawHeroFromRole(role, 2);
            if (newCardId) {
                const playerHeroId = `2${newCardId}`;
                
                dispatch({
                    type: ACTIONS.CREATE_CARD,
                    payload: { playerNum: 2, heroId: newCardId },
                });
                dispatch({
                    type: ACTIONS.ADD_CARD_TO_HAND,
                    payload: { playerNum: 2, playerHeroId: playerHeroId },
                });
                
                // Track drawn hero
                setGameLogic(prev => ({
                    ...prev,
                    player2DrawnHeroes: [...prev.player2DrawnHeroes, newCardId]
                }));
            }
        });
    };

    // Initialize game on first load
    useEffect(() => {
        initializeGame();
    }, []); // Only run once on mount

    // Track deployment counts
    useEffect(() => {
        const player1Deployed = gameState.rows['1f'].cardIds.length + 
                               gameState.rows['1m'].cardIds.length + 
                               gameState.rows['1b'].cardIds.length;
        const player2Deployed = gameState.rows['2f'].cardIds.length + 
                               gameState.rows['2m'].cardIds.length + 
                               gameState.rows['2b'].cardIds.length;
        
        setGameLogic(prev => ({
            ...prev,
            player1Deployed,
            player2Deployed
        }));
    }, [gameState.rows]);

    // Track turns and check for game end
    useEffect(() => {
        if (turnState.turnCount > 1) { // Skip first turn (initialization)
            const currentPlayer = turnState.playerTurn;
            const otherPlayer = currentPlayer === 1 ? 2 : 1;
            
            // Increment turn count for the player who just ended their turn
            setGameLogic(prev => ({
                ...prev,
                [`player${otherPlayer}Turns`]: prev[`player${otherPlayer}Turns`] + 1
            }));
            
            // Check if both players have reached max turns
            const newPlayer1Turns = currentPlayer === 2 ? gameLogic.player1Turns + 1 : gameLogic.player1Turns;
            const newPlayer2Turns = currentPlayer === 1 ? gameLogic.player2Turns + 1 : gameLogic.player2Turns;
            
            if (newPlayer1Turns >= gameLogic.maxTurnsPerPlayer && newPlayer2Turns >= gameLogic.maxTurnsPerPlayer) {
                console.log('Both players have reached max turns - ending round');
                endRound();
            }
        }
    }, [turnState.turnCount]);

    // Subscribe to modal state changes
    useEffect(() => {
        const unsubscribe = subscribeToModal((newModalState) => {
            setModalState(newModalState);
        });
        return unsubscribe;
    }, []);

    // Subscribe to targeting banner to know when we're in targeting mode
    useEffect(() => {
        const unsub = subscribeTargeting((msg) => setTargetingMessage(msg));
        return unsub;
    }, []);

    // Always-mounted damage subscriber: apply damage via reducer so it never depends on focus
    useEffect(() => {
        const unsub = subscribeDamage((event) => {
            if (event?.type !== 'damage') return;
            const { targetCardId, targetRow, amount, ignoreShields } = event;
            try {
                // Resolve target player/cards
                const targetPlayerNum = parseInt(targetCardId[0]);
                const targetCards = gameState.playerCards[`player${targetPlayerNum}cards`].cards;
                if (!targetCards || !targetCards[targetCardId]) return;

                const currentShield = targetCards[targetCardId].shield || 0;
                const currentHealth = targetCards[targetCardId].health || 0;
                const rowShieldTotal = gameState.rows[targetRow]?.totalShield?.() || 0;

                let damageLeft = amount;
                let newRowShield = rowShieldTotal;
                let newCardShield = currentShield;
                let newHealth = currentHealth;

                if (!ignoreShields) {
                    // Apply to row shield first
                    const useRow = Math.min(newRowShield, damageLeft);
                    newRowShield -= useRow;
                    damageLeft -= useRow;

                    // Then to card shield
                    const useCard = Math.min(newCardShield, damageLeft);
                    newCardShield -= useCard;
                    damageLeft -= useCard;
                }

                // Apply remaining to health
                if (damageLeft > 0) {
                    newHealth = Math.max(0, newHealth - damageLeft);
                }

                // Commit updates
                if (!ignoreShields) {
                    // Update row shield if it changed
                    if (rowShieldTotal !== newRowShield) {
                        dispatch({
                            type: ACTIONS.DAMAGE_ROW_SHIELD,
                            payload: { rowId: targetRow, damageValue: amount - damageLeft }
                        });
                    }
                    // Update card shield
                    if (currentShield !== newCardShield) {
                        dispatch({
                            type: ACTIONS.EDIT_CARD,
                            payload: { playerNum: targetPlayerNum, targetCardId, editKeys: ['shield'], editValues: [newCardShield] }
                        });
                    }
                }

                // Update health if changed
                if (currentHealth !== newHealth) {
                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: { playerNum: targetPlayerNum, targetCardId, editKeys: ['health'], editValues: [newHealth] }
                    });
                }
            } catch (e) {
                // Silent fail-safe
            }
        });
        return unsub;
    }, [gameState]);


    // Subscribe to action requests
    useEffect(() => {
        const unsubscribe = subscribeToActions((action) => {
            if (action.type === 'request:ultimate') {
                const { playerHeroId, rowId, cost } = action.payload;
                const currentSynergy = gameState.rows[rowId]?.synergy || 0;
                const playerNum = parseInt(playerHeroId[0]);
                const enteredTurn = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId]?.enteredTurn;

                // Block ultimates on the same turn a hero entered play
                if (enteredTurn === turnState.turnCount) {
                    console.log('Ultimate blocked: hero entered play this turn.');
                    return;
                }

                const heroId = playerHeroId.slice(1);
                // Base cost override (BOB = 1)
                let adjustedCost = (heroId === 'bob') ? 1 : cost;
                // Adjust cost if BOB token is on the opposing row (enemyEffects include {type:'ultCost', value:2})
                try {
                    const enemyEffects = gameState.rows[rowId]?.enemyEffects || [];
                    const bobMod = enemyEffects.find(e => e?.type === 'ultCost' && e?.value);
                    if (bobMod) adjustedCost += bobMod.value;
                } catch {}

                if (currentSynergy >= adjustedCost) {
                    // Check if hero has already used ultimate this round
                    const playerKey = `player${playerNum}`;
                    if (gameState.ultimateUsage[playerKey]?.includes(heroId)) {
                        console.log(`Ultimate blocked: ${heroId} has already used ultimate this round.`);
                        showToast(`${heroId} has already used their ultimate this round!`);
                        setTimeout(() => clearToast(), 2000);
                        return;
                    }

                    // Mark ultimate as used
                    dispatch({
                        type: ACTIONS.MARK_ULTIMATE_USED,
                        payload: { playerNum, heroId }
                    });

                    // Deduct synergy and execute ultimate
                    dispatch({
                        type: ACTIONS.DEDUCT_SYNERGY,
                        payload: { rowId, synergyCost: adjustedCost }
                    });
                    
                    // Execute ultimate ability
                    // Ashe: B.O.B. (3) — Draw BOB into hand for this round only
                    if (heroId === 'ashe') {
                        try {
                            const bobId = 'bob';
                            const bobPlayerHeroId = `${playerNum}${bobId}`;
                            // Create BOB card for this player
                            dispatch({
                                type: ACTIONS.CREATE_CARD,
                                payload: { playerNum, heroId: bobId }
                            });
                            // Add to hand regardless of hand size (special bypasses limits)
                            dispatch({
                                type: ACTIONS.ADD_CARD_TO_HAND,
                                payload: { playerNum, playerHeroId: bobPlayerHeroId }
                            });
                            // Mark as expiring at end of round if not played
                            dispatch({
                                type: ACTIONS.EDIT_CARD,
                                payload: {
                                    playerNum,
                                    targetCardId: bobPlayerHeroId,
                                    editKeys: ['expiresEndOfRound'],
                                    editValues: [true]
                                }
                            });
                            // Toast: BOB added
                            showToast(`BOB added to Player ${playerNum}'s hand (this round only)`);
                            setTimeout(() => clearToast(), 2000);
                            // Play Ashe ultimate sound
                            try {
                                const ultSrc = getAudioFile('ashe-ultimate');
                                if (ultSrc) {
                                    const audio = new Audio(ultSrc);
                                    audio.play().catch(() => {});
                                }
                            } catch {}
                            console.log('Ashe ultimate: BOB added to hand for this round only');
                        } catch (e) {
                            console.log('Failed to add BOB to hand:', e);
                        }
                    } else if (heroId === 'bob' && abilitiesIndex?.bob?.onUltimate) {
                        try {
                            abilitiesIndex.bob.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BOB ultimate:', e);
                        }
                    } else if (heroId === 'ana' && abilitiesIndex?.ana?.onUltimate) {
                        try {
                            abilitiesIndex.ana.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing ANA ultimate:', e);
                        }
                    } else if (heroId === 'baptiste' && abilitiesIndex?.baptiste?.onUltimate) {
                        try {
                            abilitiesIndex.baptiste.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BAPTISTE ultimate:', e);
                        }
                    } else if (heroId === 'bastion' && abilitiesIndex?.bastion?.onUltimate) {
                        try {
                            abilitiesIndex.bastion.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BASTION ultimate:', e);
                        }
                    } else {
                        console.log(`Executing ultimate for ${playerHeroId} in ${rowId} (cost: ${adjustedCost})`);
                    }
                } else {
                    console.log(`Insufficient synergy for ultimate. Need ${adjustedCost}, have ${currentSynergy}`);
                }
            } else if (action.type === 'request:transform') {
                const { playerHeroId } = action.payload;
                console.log(`Transform requested for ${playerHeroId}`);
                // TODO: Implement transform logic
            }
        });
        return unsubscribe;
    }, [gameState.rows]);

    // End the round, calculate who won, update score and move to next round
    const endRound = () => {
        // Set ref to current match state, alter ref within endRound(), then call setMatchState once using ref as new state
        matchRef.current = matchState;
            // Get power data from deployed heroes
            const totalPower1 = gameState.rows.player1hand.totalPower();
            const totalPower2 = gameState.rows.player2hand.totalPower();

            // Count remaining units alive (deployed heroes)
            const player1Units = gameState.rows['1f'].cardIds.length + 
                                gameState.rows['1m'].cardIds.length + 
                                gameState.rows['1b'].cardIds.length;
            const player2Units = gameState.rows['2f'].cardIds.length + 
                                gameState.rows['2m'].cardIds.length + 
                                gameState.rows['2b'].cardIds.length;

            // Calculate total score: power + remaining units
            const player1Score = totalPower1 + player1Units;
            const player2Score = totalPower2 + player2Units;

            console.log(`Round End - P1: ${totalPower1} power + ${player1Units} units = ${player1Score} total`);
            console.log(`Round End - P2: ${totalPower2} power + ${player2Units} units = ${player2Score} total`);

            // Calculate winning player
            let winningPlayer = 0;

            if (player1Score > player2Score) winningPlayer = 1;
            else if (player2Score > player1Score) winningPlayer = 2;
            // If scores are tied, it is a draw
            else winningPlayer = 3;

            // Reset turn state
            // Winner of last round goes first next round. If round was a draw, random player goes first
            setTurnState((prevState) => ({
                turnCount: 1,
                playerTurn:
                    winningPlayer === 3
                        ? prevState.playerTurn
                        : winningPlayer === 1
                        ? 1
                        : 2,
                player1Passed: false,
                player2Passed: false,
            }));

            // Update match state and round tracking
            if (winningPlayer === 3) {
                alert('Round is a draw! Neither player receives a win.');
            } else {
                // Add a win to winner's record
                matchRef.current[`player${winningPlayer}`].wins += 1;
                matchRef.current.wonLastRound = winningPlayer;
                alert(`Player ${winningPlayer} wins the round!`);
            }

            // Reset ultimate usage for new round
            dispatch({
                type: ACTIONS.RESET_ULTIMATE_USAGE
            });

            // Update game logic for round tracking
            setGameLogic(prev => ({
                ...prev,
                currentRound: prev.currentRound + 1,
                player1Turns: 0,
                player2Turns: 0,
                player1Deployed: 0,
                player2Deployed: 0,
                player1DrawnHeroes: [], // Reset drawn heroes for new round
                player2DrawnHeroes: []  // Reset drawn heroes for new round
            }));

            // Check if game is over (best 2 of 3)
            const player1Wins = matchRef.current.player1.wins;
            const player2Wins = matchRef.current.player2.wins;
            
            if (player1Wins >= 2 || player2Wins >= 2) {
                // Game is over
                const gameWinner = player1Wins >= 2 ? 1 : 2;
                alert(`Game Over! Player ${gameWinner} wins the match!`);
                setGameLogic(prev => ({ ...prev, gamePhase: 'gameEnd' }));
            } else if (gameLogic.currentRound >= gameLogic.maxRounds) {
                // All rounds completed, determine winner
                if (player1Wins > player2Wins) {
                    alert(`Game Over! Player 1 wins the match!`);
                } else if (player2Wins > player1Wins) {
                    alert(`Game Over! Player 2 wins the match!`);
                } else {
                    alert(`Game Over! The match is a draw!`);
                }
                setGameLogic(prev => ({ ...prev, gamePhase: 'gameEnd' }));
            }

            // Discard all cards
            // Set ids of rows to be reset
            const player1RowIds = ['1b', '1m', '1f'];
            const player2RowIds = ['2b', '2m', '2f'];

            // Discard any special, round-limited cards still in hand (e.g., BOB)
            const expireFromHand = (playerNum) => {
                const handId = `player${playerNum}hand`;
                const handCards = [...gameState.rows[handId].cardIds];
                for (const pid of handCards) {
                    const card = gameState.playerCards[`player${playerNum}cards`].cards[pid];
                    if (card?.expiresEndOfRound === true) {
                        showToast(`Discarding ${card.id?.toUpperCase?.() || 'special card'} from Player ${playerNum} hand`);
                        dispatch({
                            type: ACTIONS.DISCARD_CARD,
                            payload: { playerNum, targetCardId: pid, targetCardRow: handId }
                        });
                        setTimeout(() => clearToast(), 1500);
                    }
                }
            };
            expireFromHand(1);
            expireFromHand(2);

            // Get card ids from every player 1 row
            let player1Cards = [];
            for (let id of player1RowIds) {
                player1Cards.push(gameState.rows[id].cardIds);
            }

            // Get card ids from every player 2 row
            let player2Cards = [];
            for (let id of player2RowIds) {
                player2Cards.push(gameState.rows[id].cardIds);
            }

            // Reset power, synergy, effects and discard player 1 cards
            for (let i = 0; i < player1Cards.length; i++) {
                dispatch({
                    type: ACTIONS.EDIT_ROW,
                    payload: {
                        targetRow: player1RowIds[i],
                        editKeys: [
                            'synergy',
                            'shield',
                            'allyEffects',
                            'enemyEffects',
                        ],
                        editValues: [0, [], [], []],
                    },
                });
                for (let x = 0; x < player1Cards[i].length; x++) {
                    dispatch({
                        type: ACTIONS.DISCARD_CARD,
                        payload: {
                            playerNum: 1,
                            targetCardId: player1Cards[i][x],
                            targetCardRow: player1RowIds[i],
                        },
                    });
                }
            }
            dispatch({
                type: ACTIONS.EDIT_ROW,
                payload: {
                    targetRow: 'player1hand',
                    editKeys: ['cardsPlayed', 'power'],
                    editValues: [0, { f: 0, m: 0, b: 0 }],
                },
            });

            // Reset power, synergy, effects and discard player 2 cards
            for (let i = 0; i < player2Cards.length; i++) {
                dispatch({
                    type: ACTIONS.EDIT_ROW,
                    payload: {
                        targetRow: player2RowIds[i],
                        editKeys: [
                            'synergy',
                            'shield',
                            'allyEffects',
                            'enemyEffects',
                        ],
                        editValues: [0, [], [], []],
                    },
                });
                for (let x = 0; x < player2Cards[i].length; x++) {
                    dispatch({
                        type: ACTIONS.DISCARD_CARD,
                        payload: {
                            playerNum: 2,
                            targetCardId: player2Cards[i][x],
                            targetCardRow: player2RowIds[i],
                        },
                    });
                }
            }

            dispatch({
                type: ACTIONS.EDIT_ROW,
                payload: {
                    targetRow: 'player2hand',
                    editKeys: ['cardsPlayed', 'power'],
                    editValues: [0, { f: 0, m: 0, b: 0 }],
                },
            });

            // Set new match state using the ref that was mutated
            setMatchState(matchRef.current);

            // Initialize new round with 4 cards per player (if game is not over)
            if (gameLogic.gamePhase !== 'gameEnd') {
                setTimeout(() => {
                    initializeGame();
                }, 1000); // Delay to allow alerts to show
            }
        };

    // End the round and update match scores when both players have passed their turn
    useEffect(() => {
        // When both players pass, end the round and move to the next round
        if (
            turnState.player1Passed === true &&
            turnState.player2Passed === true
        ) {
            endRound();
        }
    }, [turnState, gameState.rows, matchState]);

    // Handle card dragging
    function handleOnDragEnd(result) {
        const { destination, source, draggableId } = result;
        if (!destination) return;

        // Get card movement data
        const startRowId = source.droppableId;
        const finishRowId = destination.droppableId;
        const playerNum = turnState.playerTurn;
        const finishPosition = finishRowId[1];
        const heroId = draggableId.slice(1, draggableId.length);
        let finishSynergy = gameState.rows[finishRowId].synergy;

        // If not moving card within player's hand (i.e. moving into a row),
        // Set new row synergy and set card to played
        if (finishRowId[0] !== 'p' && parseInt(finishRowId[0]) === playerNum) {
            // Check deployment limit (6 heroes maximum per player)
            const deployedHeroes = gameState.rows[`${playerNum}f`].cardIds.length + 
                                  gameState.rows[`${playerNum}m`].cardIds.length + 
                                  gameState.rows[`${playerNum}b`].cardIds.length;
            
            if (deployedHeroes >= gameLogic.maxHeroesPerPlayer) {
                console.log(`Player ${playerNum} has reached the maximum deployment limit (${deployedHeroes}/${gameLogic.maxHeroesPerPlayer})`);
                return; // Prevent deployment
            }
            
            // Apply card movement
            dispatch({
                type: ACTIONS.MOVE_CARD,
                payload: {
                    targetCardId: draggableId,
                    startRowId: startRowId,
                    finishRowId: finishRowId,
                    startIndex: source.index,
                    finishIndex: destination.index,
                },
            });
            
            // Play placement sound for all unit placements (always enabled)
            try {
                console.log('Attempting to play placement sound...');
                const placementAudioSrc = getAudioFile('placement');
                console.log('Placement audio source:', placementAudioSrc);
                const placementAudio = new Audio(placementAudioSrc);
                console.log('Created placement audio object:', placementAudio);
                placementAudio.play().then(() => {
                    console.log('Placement sound played successfully');
                }).catch(err => {
                    console.log('Placement sound play failed:', err);
                });
            } catch (err) {
                console.log('Placement audio creation failed:', err);
            }
            
            // Play hero-specific enter sound (if available)
            try {
                const enterAudioSrc = getAudioFile(`${heroId}-enter`);
                if (enterAudioSrc) {
                    console.log(`Playing ${heroId} enter sound...`);
                    const enterAudio = new Audio(enterAudioSrc);
                    enterAudio.play().then(() => {
                        console.log(`${heroId} enter sound played successfully`);
                    }).catch(err => {
                        console.log(`${heroId} enter sound play failed:`, err);
                    });
                }
            } catch (err) {
                console.log(`${heroId} enter audio creation failed:`, err);
            }
            

            // Set new row synergy
            const addSynergy =
                gameState.playerCards[`player${playerNum}cards`].cards[
                    draggableId
                ].synergy[finishPosition];

            dispatch({
                type: ACTIONS.UPDATE_SYNERGY,
                payload: {
                    rowId: finishRowId,
                    synergyCost: addSynergy,
                },
            });

            // Set card as played, stamp enteredTurn, and reduce synergy to 0 (so future moves dont also add synergy)
            dispatch({
                type: ACTIONS.EDIT_CARD,
                payload: {
                    playerNum: playerNum,
                    targetCardId: draggableId,
                    editKeys: ['isPlayed', 'enteredTurn', 'synergy'],
                    editValues: [true, turnState.turnCount, { f: 0, m: 0, b: 0 }],
                },
            });

            // Keep track of how many cards have been played
            dispatch({
                type: ACTIONS.UPDATE_ROW,
                payload: {
                    targetRow: `player${playerNum}hand`,
                    updateKeys: ['cardsPlayed'],
                    updateValues: [1],
                },
            });

            // Check for onEnter abilities after deployment
            checkOnEnterAbilities(draggableId, finishRowId, playerNum);
        }
        document.getElementById(`${result.source.droppableId}-list`).classList.toggle('is-drag-origin');

        return;
    }

    // Bug fixes for odd animations when starting a drag under certain conditions
    // e.g. handlist expanding when less than one card's width is available onscreen in horizontal list mode
    function handleOnDragStart(result) {
        console.log(result);
        document.getElementById(`${result.source.droppableId}-list`).classList.toggle('is-drag-origin');
    }

    return (
        <div id='page-wrapper'>
            <TitleCard playAudio={playAudio} setPlayAudio={setPlayAudio} />
            <div id='landscape-wrapper'>
                <turnContext.Provider value={{ turnState, setTurnState }}>
                    <gameContext.Provider value={{ gameState, dispatch }}>
                        <DragDropContext
                            onDragEnd={handleOnDragEnd}
                            onDragStart={handleOnDragStart}
                            key="main-drag-drop-context"
                        >
                            <PlayerHalf
                                playerNum={1}
                                setCardFocus={setCardFocus}
                                cardFocus={cardFocus}
                                nextCardDraw={nextCardDraw}
                                setNextCardDraw={setNextCardDraw}
                                gameLogic={gameLogic}
                                trackDrawnHero={trackDrawnHero}
                            />
                            <CenterSection 
                                matchState={matchState}
                                gameLogic={gameLogic}
                                turnState={turnState}
                            />
                            <PlayerHalf
                                playerNum={2}
                                setCardFocus={setCardFocus}
                                cardFocus={cardFocus}
                                nextCardDraw={nextCardDraw}
                                setNextCardDraw={setNextCardDraw}
                                gameLogic={gameLogic}
                                trackDrawnHero={trackDrawnHero}
                            />
                        </DragDropContext>
                        <TurnEffectsRunner />
                    </gameContext.Provider>
                </turnContext.Provider>
            </div>
            <Tutorial />
            <Footer />
            <TopBanner />
            
            {/* Modal Components */}
            {modalState.type === 'choice' && (
                <ChoiceModal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    title="Choose Ability"
                    choices={modalState.data?.choices || []}
                    onSelect={(choiceIndex) => {
                        const cb = modalState.data?.onSelect;
                        if (typeof cb === 'function') cb(choiceIndex);
                        closeModal();
                    }}
                    heroName={modalState.data?.heroName || ''}
                />
            )}
            
            {modalState.type === 'interrupt' && (
                <InterruptModal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    heroName={modalState.data?.heroName || ''}
                    abilityName={modalState.data?.abilityName || ''}
                    cost={modalState.data?.cost || 0}
                    currentSynergy={modalState.data?.currentSynergy || 0}
                    onActivate={() => {
                        console.log('Activated interrupt ability');
                        closeModal();
                    }}
                />
            )}
        </div>
    );
}
