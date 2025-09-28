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
    CLEANUP_SHIELD_BASH: 'cleanup-shield-bash',
    ADD_SPECIAL_CARD_TO_HAND: 'add-special-card-to-hand',
    RETURN_DVA_TO_HAND: 'return-dva-to-hand',
    RETURN_HERO_TO_HAND: 'return-hero-to-hand',
    REPLACE_WITH_DVA: 'replace-with-dva',
    CLEANUP_DVA_SUITED_UP: 'cleanup-dva-suited-up',
    REMOVE_SPECIAL_CARD: 'remove-special-card',
    REMOVE_DEAD_CARD: 'remove-dead-card',
    REMOVE_ALIVE_CARD: 'remove-alive-card',
    UPDATE_ROW: 'update-row',
    UPDATE_SYNERGY: 'update-synergy',
    DEDUCT_SYNERGY: 'deduct-synergy',
    SET_INVULNERABLE_SLOTS: 'set-invulnerable-slots',
    CLEAR_INVULNERABLE_SLOTS: 'clear-invulnerable-slots',
    REMOVE_ROW_EFFECT: 'remove-row-effect',
    TRACK_ULTIMATE_USED: 'track-ultimate-used',
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

            // Enforce max row capacity (4)
            if (finishRow && Array.isArray(finishRow.cardIds) && finishRow.cardIds.length >= 4 && startRowId !== finishRowId) {
                // Destination full; cancel move
                return gameState;
            }

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

            // Check if Orisa is moving and handle her effects
            const heroId = targetCardId.slice(1);
            if (heroId === 'orisa' && startRowId !== finishRowId && startRowId[0] !== 'p') {
                // Remove Supercharger token from the old row
                if (window.__ow_removeRowEffect) {
                    window.__ow_removeRowEffect(startRowId, 'allyEffects', 'orisa-supercharger');
                }
                
                // Move Protective Barrier to new row
                if (abilitiesIndex?.orisa?.onMove) {
                    try {
                        abilitiesIndex.orisa.onMove({ 
                            playerHeroId: targetCardId, 
                            fromRowId: startRowId, 
                            toRowId: finishRowId 
                        });
                    } catch (e) {
                        console.log('Error executing ORISA onMove:', e);
                    }
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

        // Add special card to hand (ignores hand size limit)
        case ACTIONS.ADD_SPECIAL_CARD_TO_HAND: {
            console.log('ADD_SPECIAL_CARD_TO_HAND reducer called with:', action.payload);
            const { playerNum, cardId } = action.payload; // cardId is base hero id, e.g. 'dvameka'
            const playerKey = `player${playerNum}cards`;
            const handId = `player${playerNum}hand`;

            const result = produce(gameState, (draft) => {
                const heroData = data.heroes[cardId];
                if (!heroData) return;

                // Construct player-specific card id (e.g., '1dvameka')
                const playerCardId = `${playerNum}${cardId}`;

                // Extract ultimate cost from ultimate description
                const ultimateCost = heroData.ultimate ? 
                    (heroData.ultimate.match(/\((\d+)\)/) ? parseInt(heroData.ultimate.match(/\((\d+)\)/)[1]) : 3) : 3;

                // Create the special card object under the player-specific id
                draft.playerCards[playerKey].cards[playerCardId] = {
                    id: cardId, // base hero id
                    name: heroData.name,
                    health: heroData.health,
                    maxHealth: heroData.health,
                    power: heroData.power,
                    synergy: heroData.synergy,
                    shield: 0,
                    effects: [],
                    enemyEffects: [],
                    allyEffects: [],
                    isPlayed: false,
                    isDiscarded: false,
                    enteredTurn: 0,
                    ultimateCost,
                    special: true, // Mark as special card for cleanup
                };

                // Add to top of hand using the player-specific id
                draft.rows[handId].cardIds.unshift(playerCardId);
            });
            
            // Play intro sound for special cards (after the reducer returns)
            console.log(`ADD_SPECIAL_CARD_TO_HAND: Attempting to play intro sound for ${cardId}`);
            try {
                const introAudioSrc = getAudioFile(`${cardId}-intro`);
                console.log(`ADD_SPECIAL_CARD_TO_HAND: Intro audio src for ${cardId}:`, introAudioSrc);
                if (introAudioSrc) {
                    console.log(`Playing ${cardId} intro sound...`);
                    const introAudio = new Audio(introAudioSrc);
                    introAudio.play().then(() => {
                        console.log(`${cardId} intro sound played successfully`);
                    }).catch(err => {
                        console.log(`${cardId} intro sound play failed:`, err);
                    });
                } else {
                    console.log(`No intro audio found for ${cardId}`);
                }
            } catch (err) {
                console.log(`${cardId} intro audio creation failed:`, err);
            }
            
            return result;
        }

        // Replace D.Va+MEKA with D.Va
        case ACTIONS.RETURN_DVA_TO_HAND: {
            const { playerNum } = action.payload;
            const playerKey = `player${playerNum}cards`;
            const handId = `player${playerNum}hand`;

            return produce(gameState, (draft) => {
                // Find D.Va in any row and move her to hand
                const dvaCardId = `${playerNum}dva`;
                let foundRow = null;
                let foundIndex = -1;

                // Search all rows for D.Va
                for (const [rowId, row] of Object.entries(draft.rows)) {
                    if (rowId.includes(playerNum.toString())) {
                        const index = row.cardIds.indexOf(dvaCardId);
                        if (index !== -1) {
                            foundRow = rowId;
                            foundIndex = index;
                            break;
                        }
                    }
                }

                if (foundRow && foundIndex !== -1) {
                    // Remove D.Va from the row
                    draft.rows[foundRow].cardIds.splice(foundIndex, 1);
                    
                    // Add D.Va to hand
                    draft.rows[handId].cardIds.unshift(dvaCardId);
                    
                    // Mark D.Va as not played (so she can be dragged from hand)
                    if (draft.playerCards[playerKey]?.cards?.[dvaCardId]) {
                        draft.playerCards[playerKey].cards[dvaCardId].isPlayed = false;
                    }
                }
            });
        }

        case ACTIONS.RETURN_HERO_TO_HAND: {
            const { cardId, rowId } = action.payload;
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const handId = `player${playerNum}hand`;

            return produce(gameState, (draft) => {
                // Find the card in the specified row
                const row = draft.rows[rowId];
                if (row && row.cardIds) {
                    const index = row.cardIds.indexOf(cardId);
                    if (index !== -1) {
                        // Remove card from the row
                        draft.rows[rowId].cardIds.splice(index, 1);
                        
                        // Add card to hand
                        draft.rows[handId].cardIds.unshift(cardId);
                        
                        // Mark card as not played (so it can be dragged from hand)
                        if (draft.playerCards[playerKey]?.cards?.[cardId]) {
                            draft.playerCards[playerKey].cards[cardId].isPlayed = false;
                        }
                    }
                }
            });
        }

        case ACTIONS.CLEANUP_DVA_SUITED_UP: {
            const { playerNum } = action.payload;
            const playerKey = `player${playerNum}cards`;

            return produce(gameState, (draft) => {
                const dvaCardId = `${playerNum}dva`;
                const dvaCard = draft.playerCards[playerKey]?.cards?.[dvaCardId];
                
                if (dvaCard && Array.isArray(dvaCard.effects)) {
                    // Remove "suited-up" effect
                    dvaCard.effects = dvaCard.effects.filter(effect => effect.id !== 'suited-up');
                }
            });
        }

        case ACTIONS.REMOVE_SPECIAL_CARD: {
            const { cardId, playerNum } = action.payload;
            const playerKey = `player${playerNum}cards`;
            const handId = `player${playerNum}hand`;

            return produce(gameState, (draft) => {
                // Remove from hand
                const handCards = draft.rows[handId]?.cardIds || [];
                const cardIndex = handCards.indexOf(cardId);
                if (cardIndex !== -1) {
                    handCards.splice(cardIndex, 1);
                }
                
                // Remove from player cards
                if (draft.playerCards[playerKey]?.cards?.[cardId]) {
                    delete draft.playerCards[playerKey].cards[cardId];
                }
            });
        }

        case ACTIONS.REMOVE_DEAD_CARD: {
            const { cardId } = action.payload;
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            
            console.log('REMOVE_DEAD_CARD: Removing card:', cardId);
            console.log('REMOVE_DEAD_CARD: PlayerNum:', playerNum);

            return produce(gameState, (draft) => {
                // Find and remove from all rows
                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
                let cardFound = false;
                for (const rowId of allRows) {
                    const row = draft.rows[rowId];
                    if (row && Array.isArray(row.cardIds)) {
                        const cardIndex = row.cardIds.indexOf(cardId);
                        if (cardIndex !== -1) {
                            console.log('REMOVE_DEAD_CARD: Found card in row:', rowId, 'at index:', cardIndex);
                            row.cardIds.splice(cardIndex, 1);
                            cardFound = true;
                            break; // Card found and removed, exit loop
                        }
                    }
                }
                
                if (!cardFound) {
                    console.log('REMOVE_DEAD_CARD: Card not found in any row!');
                }
                
                // Remove from player cards
                if (draft.playerCards[playerKey]?.cards?.[cardId]) {
                    console.log('REMOVE_DEAD_CARD: Removing from player cards');
                    delete draft.playerCards[playerKey].cards[cardId];
                } else {
                    console.log('REMOVE_DEAD_CARD: Card not found in player cards');
                }
            });
        }

        case ACTIONS.REMOVE_ALIVE_CARD: {
            const { cardId } = action.payload;
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            
            console.log('REMOVE_ALIVE_CARD: Removing card:', cardId);
            console.log('REMOVE_ALIVE_CARD: PlayerNum:', playerNum);

            return produce(gameState, (draft) => {
                // Find and remove from all rows
                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
                let cardFound = false;
                for (const rowId of allRows) {
                    const row = draft.rows[rowId];
                    if (row && Array.isArray(row.cardIds)) {
                        const cardIndex = row.cardIds.indexOf(cardId);
                        if (cardIndex !== -1) {
                            console.log('REMOVE_ALIVE_CARD: Found card in row:', rowId, 'at index:', cardIndex);
                            row.cardIds.splice(cardIndex, 1);
                            cardFound = true;
                            break; // Card found and removed, exit loop
                        }
                    }
                }
                
                if (!cardFound) {
                    console.log('REMOVE_ALIVE_CARD: Card not found in any row!');
                }
                
                // Remove from player cards
                if (draft.playerCards[playerKey]?.cards?.[cardId]) {
                    console.log('REMOVE_ALIVE_CARD: Removing from player cards');
                    delete draft.playerCards[playerKey].cards[cardId];
                } else {
                    console.log('REMOVE_ALIVE_CARD: Card not found in player cards');
                }
            });
        }

        case ACTIONS.REPLACE_WITH_DVA: {
            const { mechCardId, rowId, playerNum } = action.payload;
            const playerKey = `player${playerNum}cards`;
            const handId = `player${playerNum}hand`;

            return produce(gameState, (draft) => {
                const rowCards = draft.rows[rowId].cardIds;
                const mechIndex = rowCards.indexOf(mechCardId);
                if (mechIndex === -1) return;

                // Remove MEKA from row and player cards
                rowCards.splice(mechIndex, 1);
                delete draft.playerCards[playerKey].cards[mechCardId];

                // Find D.Va in hand and move her to the field
                const dvaCardId = `${playerNum}dva`;
                const handCards = draft.rows[handId].cardIds;
                const dvaHandIndex = handCards.indexOf(dvaCardId);
                
                if (dvaHandIndex !== -1) {
                    // Remove D.Va from hand
                    handCards.splice(dvaHandIndex, 1);
                    
                    // Update D.Va's state
                    if (draft.playerCards[playerKey].cards[dvaCardId]) {
                        // Remove "suited-up" effect
                        const currentEffects = Array.isArray(draft.playerCards[playerKey].cards[dvaCardId].effects) 
                            ? draft.playerCards[playerKey].cards[dvaCardId].effects 
                            : [];
                        const filteredEffects = currentEffects.filter(effect => effect.id !== 'suited-up');
                        
                        // Update D.Va's properties
                        draft.playerCards[playerKey].cards[dvaCardId].effects = filteredEffects;
                        draft.playerCards[playerKey].cards[dvaCardId].isPlayed = true; // Now on field
                        draft.playerCards[playerKey].cards[dvaCardId].enteredTurn = gameState.currentTurn || 1;
                    }
                    
                    // Insert D.Va into the same row slot where MEKA was
                    rowCards.splice(mechIndex, 0, dvaCardId);
                } else {
                    // Fallback: create new D.Va if not found in hand (shouldn't happen)
                    const dvaHero = data.heroes['dva'];
                    const dvaUltimateCost = dvaHero?.ultimate ? 
                        (dvaHero.ultimate.match(/\((\d+)\)/) ? parseInt(dvaHero.ultimate.match(/\((\d+)\)/)[1]) : 3) : 3;

                    draft.playerCards[playerKey].cards[dvaCardId] = {
                        id: 'dva',
                        name: dvaHero?.name || 'D.Va',
                        health: dvaHero?.health ?? 2,
                        maxHealth: dvaHero?.health ?? 2,
                        power: dvaHero?.power || { f: 1, m: 1, b: 1 },
                        synergy: dvaHero?.synergy || { f: 0, m: 0, b: 0 },
                        shield: 0,
                        effects: [],
                        enemyEffects: [],
                        allyEffects: [],
                        isPlayed: true,
                        isDiscarded: false,
                        enteredTurn: gameState.currentTurn || 1,
                        ultimateCost: dvaUltimateCost,
                    };

                    rowCards.splice(mechIndex, 0, dvaCardId);
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
                draft.lastUltimateUsed = null; // Reset last ultimate used
            });
        }

        case ACTIONS.TRACK_ULTIMATE_USED: {
            const { heroId, heroName, abilityName, playerNum, rowId, cost } = action.payload;
            return produce(gameState, (draft) => {
                draft.lastUltimateUsed = {
                    heroId,
                    heroName,
                    abilityName,
                    playerNum,
                    rowId,
                    cost
                };
            });
        }

        // Clean up Shield Bash effects at round end
        case ACTIONS.CLEANUP_SHIELD_BASH: {
            return produce(gameState, (draft) => {
                // Remove Shield Bash effects from all cards
                const playerKeys = ['player1cards', 'player2cards'];
                playerKeys.forEach(playerKey => {
                    const playerCards = draft.playerCards[playerKey];
                    if (playerCards && playerCards.cards) {
                        Object.keys(playerCards.cards).forEach(cardId => {
                            const card = playerCards.cards[cardId];
                            if (card && Array.isArray(card.effects)) {
                                card.effects = card.effects.filter(effect => effect?.id !== 'shield-bash');
                            }
                        });
                    }
                });
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
        abilitiesIndex.ashe.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'bob' && abilitiesIndex?.bob?.onEnter) {
        abilitiesIndex.bob.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'ana' && abilitiesIndex?.ana?.onEnter) {
        // Play placement via module
        abilitiesIndex.ana.onEnter({ playerHeroId, rowId });
        // Trigger onEnter ability 1 targeting/heal/damage
        if (abilitiesIndex.ana.onEnterAbility1) abilitiesIndex.ana.onEnterAbility1({ playerNum, playerHeroId });
        return;
    }

    if (heroId === 'baptiste' && abilitiesIndex?.baptiste?.onEnter) {
        abilitiesIndex.baptiste.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'bastion' && abilitiesIndex?.bastion?.onEnter) {
        abilitiesIndex.bastion.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'brigitte' && abilitiesIndex?.brigitte?.onEnter) {
        abilitiesIndex.brigitte.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'doomfist' && abilitiesIndex?.doomfist?.onEnter) {
        abilitiesIndex.doomfist.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'dva' && abilitiesIndex?.dva?.onEnter) {
        abilitiesIndex.dva.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'echo' && abilitiesIndex?.echo?.onEnter) {
        abilitiesIndex.echo.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'genji' && abilitiesIndex?.genji?.onEnter) {
        abilitiesIndex.genji.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'hanzo' && abilitiesIndex?.hanzo?.onEnter) {
        abilitiesIndex.hanzo.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'junkrat' && abilitiesIndex?.junkrat?.onEnter) {
        abilitiesIndex.junkrat.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'lifeweaver' && abilitiesIndex?.lifeweaver?.onEnter) {
        abilitiesIndex.lifeweaver.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'lucio' && abilitiesIndex?.lucio?.onEnter) {
        abilitiesIndex.lucio.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'mccree' && abilitiesIndex?.mccree?.onEnter) {
        abilitiesIndex.mccree.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'mei' && abilitiesIndex?.mei?.onEnter) {
        abilitiesIndex.mei.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'moira' && abilitiesIndex?.moira?.onEnter) {
        abilitiesIndex.moira.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'orisa' && abilitiesIndex?.orisa?.onEnter) {
        abilitiesIndex.orisa.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'pharah' && abilitiesIndex?.pharah?.onEnter) {
        abilitiesIndex.pharah.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'ramattra' && abilitiesIndex?.ramattra?.onEnter) {
        abilitiesIndex.ramattra.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'nemesis' && abilitiesIndex?.nemesis?.onEnter) {
        abilitiesIndex.nemesis.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'reaper' && abilitiesIndex?.reaper?.onEnter) {
        abilitiesIndex.reaper.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'reinhardt' && abilitiesIndex?.reinhardt?.onEnter) {
        abilitiesIndex.reinhardt.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'roadhog' && abilitiesIndex?.roadhog?.onEnter) {
        abilitiesIndex.roadhog.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'sigma' && abilitiesIndex?.sigma?.onEnter) {
        abilitiesIndex.sigma.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'soldier' && abilitiesIndex?.soldier?.onEnter) {
        abilitiesIndex.soldier.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'sombra' && abilitiesIndex?.sombra?.onEnter) {
        abilitiesIndex.sombra.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'symmetra' && abilitiesIndex?.symmetra?.onEnter) {
        abilitiesIndex.symmetra.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'torbjorn' && abilitiesIndex?.torbjorn?.onEnter) {
        abilitiesIndex.torbjorn.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'tracer' && abilitiesIndex?.tracer?.onEnter) {
        abilitiesIndex.tracer.onEnter({ playerHeroId, rowId });
        return;
    }
    if (heroId === 'turret' && abilitiesIndex?.turret?.onEnter) {
        abilitiesIndex.turret.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'mercy' && abilitiesIndex?.mercy?.onEnter) {
        abilitiesIndex.mercy.onEnter({ playerHeroId, rowId });
        return;
    }

    if (heroId === 'dvameka' && abilitiesIndex?.dvameka?.onEnter) {
        abilitiesIndex.dvameka.onEnter({ playerHeroId, rowId });
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
                if (!rowId || !gameState.rows[rowId]) {
                    console.warn('appendRowEffect aborted: invalid rowId', rowId, arrayKey, effect);
                    return;
                }
                const currentArr = Array.isArray(gameState.rows[rowId][arrayKey]) ? gameState.rows[rowId][arrayKey] : [];
                dispatch({
                    type: ACTIONS.EDIT_ROW,
                    payload: {
                        targetRow: rowId,
                        editKeys: [arrayKey],
                        editValues: [[...currentArr, effect]],
                    },
                });
            } catch (e) { console.error('appendRowEffect failed', e); }
        };
        window.__ow_getRow = (rowId) => gameState.rows[rowId];
        window.__ow_setRowArray = (rowId, arrayKey, nextArr) => {
            try {
                if (!rowId || !gameState.rows[rowId]) {
                    console.warn('setRowArray aborted: invalid rowId', rowId, arrayKey);
                    return;
                }
                dispatch({
                    type: ACTIONS.EDIT_ROW,
                    payload: { targetRow: rowId, editKeys: [arrayKey], editValues: [nextArr] }
                });
            } catch (e) { console.error('setRowArray failed', e); }
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
            const playerNum = parseInt(playerHeroId[0]);
            const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
            
            // Prevent turrets from being healed (but allow damage)
            if (card && card.turret === true && newHealth > card.health) {
                console.log(`Health Update: Turret ${playerHeroId} cannot be healed`);
                return;
            }
            
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
            try {
                if (!rowId || !gameState.rows[rowId]) {
                    console.warn('removeRowEffect aborted: invalid rowId', rowId, effectType, effectId);
                    return;
                }
                dispatch({
                    type: ACTIONS.REMOVE_ROW_EFFECT,
                    payload: { rowId, effectType, effectId }
                });
            } catch (e) { console.error('removeRowEffect failed', e); }
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
                dealDamage(cardId, rowId, amount, false, null);
            }).catch(err => {
                console.error('Failed to import damageBus:', err);
            });
        };
        window.__ow_dispatchShieldUpdate = (cardId, newShield) => {
            const playerNum = parseInt(cardId[0]);
            const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
            
            // Prevent turrets from receiving shields
            if (card && card.turret === true) {
                console.log(`Shield Update: Turret ${cardId} cannot receive shields`);
                return;
            }
            
            dispatch({
                type: ACTIONS.EDIT_CARD,
                payload: {
                    playerNum: playerNum,
                    targetCardId: cardId,
                    editKeys: ['shield'],
                    editValues: [newShield]
                }
            });
        };
        window.__ow_appendCardEffect = (cardId, effect) => {
            // Add effect to card (similar to row effects but for individual cards)
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const currentCard = gameState.playerCards[playerKey]?.cards?.[cardId];
            
            if (currentCard) {
                const currentEffects = Array.isArray(currentCard.effects) ? currentCard.effects : [];
                dispatch({
                    type: ACTIONS.EDIT_CARD,
                    payload: {
                        playerNum: playerNum,
                        targetCardId: cardId,
                        editKeys: ['effects'],
                        editValues: [[...currentEffects, effect]]
                    }
                });
            }
        };
        window.__ow_removeCardEffect = (cardId, effectId) => {
            // Remove effect from card by ID
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const currentCard = gameState.playerCards[playerKey]?.cards?.[cardId];
            
            if (currentCard) {
                const currentEffects = Array.isArray(currentCard.effects) ? currentCard.effects : [];
                const filteredEffects = currentEffects.filter(effect => effect.id !== effectId);
                dispatch({
                    type: ACTIONS.EDIT_CARD,
                    payload: {
                        playerNum: playerNum,
                        targetCardId: cardId,
                        editKeys: ['effects'],
                        editValues: [filteredEffects]
                    }
                });
            }
        };
        window.__ow_isRowFull = (rowId) => {
            try {
                const cards = gameState.rows[rowId]?.cardIds || [];
                return cards.length >= 4;
            } catch { return false; }
        };
        window.__ow_addSpecialCardToHand = (playerNum, cardId) => {
            console.log('addSpecialCardToHand called with:', { playerNum, cardId });
            // Add special card to hand (ignores hand size limit)
            dispatch({
                type: ACTIONS.ADD_SPECIAL_CARD_TO_HAND,
                payload: { playerNum, cardId }
            });
        };
        window.__ow_returnDvaToHand = (playerNum) => {
            // Return D.Va to hand when D.Va+MEKA enters
            dispatch({
                type: ACTIONS.RETURN_DVA_TO_HAND,
                payload: { playerNum }
            });
        };
        window.__ow_replaceWithDva = (mechCardId, rowId, playerNum) => {
            // Replace D.Va+MEKA with D.Va in the same row slot
            dispatch({
                type: ACTIONS.REPLACE_WITH_DVA,
                payload: { mechCardId, rowId, playerNum }
            });
        };
        window.__ow_cleanupDvaSuitedUp = (playerNum) => {
            // Clean up D.Va's "suited-up" state when special cards are removed
            dispatch({
                type: ACTIONS.CLEANUP_DVA_SUITED_UP,
                payload: { playerNum }
            });
        };
        window.__ow_removeSpecialCard = (cardId, playerNum) => {
            // Remove special card from hand and player cards
            dispatch({
                type: ACTIONS.REMOVE_SPECIAL_CARD,
                payload: { cardId, playerNum }
            });
        };
        window.__ow_getLastUltimateUsed = () => {
            return gameState.lastUltimateUsed;
        };
        window.__ow_trackUltimateUsed = (heroId, heroName, abilityName, playerNum, rowId, cost) => {
            dispatch({
                type: ACTIONS.TRACK_ULTIMATE_USED,
                payload: { heroId, heroName, abilityName, playerNum, rowId, cost }
            });
        };
        
        window.__ow_dispatchAction = (action) => {
            dispatch(action);
        };
        window.__ow_getReinhardtFunctions = () => {
            const reinhardtModule = abilitiesIndex?.reinhardt;
            if (reinhardtModule) {
                return {
                    shouldAbsorbDamage: reinhardtModule.shouldAbsorbDamage,
                    absorbDamage: reinhardtModule.absorbDamage,
                    toggleBarrierAbsorption: reinhardtModule.toggleBarrierAbsorption
                };
            }
            return {};
        };
        window.__ow_executeDuplicatedUltimate = async (lastUltimate, playerHeroId, rowId) => {
            // Execute the duplicated ultimate by calling the original hero's ability
            try {
                const heroId = lastUltimate.heroId;
                const playerNum = parseInt(playerHeroId[0]);
                
                // Get the hero's ability from the abilities index
                const heroAbility = abilitiesIndex[heroId]?.onUltimate;
                if (!heroAbility) {
                    console.log('Echo: Cannot duplicate - hero ability not found:', heroId);
                    return false;
                }
                
                // Execute the duplicated ultimate with Echo's cost (2)
                await heroAbility({ 
                    playerHeroId, 
                    rowId, 
                    cost: 2 // Echo's Duplicate always costs 2
                });
                
                console.log('Echo: Successfully duplicated ultimate:', lastUltimate.abilityName);
                return true;
            } catch (error) {
                console.error('Echo: Failed to execute duplicated ultimate:', error);
                return false;
            }
        };
        window.__ow_moveCardToRow = (cardId, targetRowId) => {
            // Move a card to a different row
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const currentCard = gameState.playerCards[playerKey]?.cards?.[cardId];
            
            if (currentCard) {
                // Find current row and index
                let currentRowId = null;
                let currentIndex = -1;
                
                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b', 'player1hand', 'player2hand'];
                for (const rowId of allRows) {
                    const rowCards = gameState.rows[rowId]?.cardIds || [];
                    const index = rowCards.indexOf(cardId);
                    if (index !== -1) {
                        currentRowId = rowId;
                        currentIndex = index;
                        break;
                    }
                }
                
                if (currentRowId && currentIndex !== -1) {
                    // Get target row cards to determine insertion point
                    const targetRowCards = gameState.rows[targetRowId]?.cardIds || [];
                    const targetIndex = targetRowCards.length; // Insert at end
                    
                    dispatch({
                        type: ACTIONS.MOVE_CARD,
                        payload: {
                            targetCardId: cardId,
                            startRowId: currentRowId,
                            startIndex: currentIndex,
                            finishRowId: targetRowId,
                            finishIndex: targetIndex
                        }
                    });
                }
            }
        };
        return () => { window.__ow_appendRowEffect = null; window.__ow_getRow = null; window.__ow_setRowArray = null; window.__ow_updateSynergy = null; window.__ow_getCard = null; window.__ow_getMaxHealth = null; window.__ow_setCardHealth = null; window.__ow_isSpecial = null; window.__ow_setRowPower = null; window.__ow_setInvulnerableSlots = null; window.__ow_clearInvulnerableSlots = null; window.__ow_isSlotInvulnerable = null; window.__ow_removeRowEffect = null; window.__ow_cleanupImmortalityField = null; window.__ow_dealDamage = null; window.__ow_dispatchShieldUpdate = null; window.__ow_appendCardEffect = null; window.__ow_removeCardEffect = null; window.__ow_moveCardToRow = null; window.__ow_isRowFull = null; window.__ow_addSpecialCardToHand = null; window.__ow_returnDvaToHand = null; window.__ow_replaceWithDva = null; window.__ow_cleanupDvaSuitedUp = null; window.__ow_removeSpecialCard = null; window.__ow_getLastUltimateUsed = null; window.__ow_trackUltimateUsed = null; window.__ow_dispatchAction = null; window.__ow_executeDuplicatedUltimate = null; window.__ow_getReinhardtFunctions = null; };
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
                    
                    // Check if target died and trigger onDeath
                    if (newHealth <= 0 && currentHealth > 0) {
                        console.log(`Target ${targetCardId} died with health ${newHealth}`);
                        const heroId = targetCardId.slice(1);
                        if (abilitiesIndex[heroId]?.onDeath) {
                            console.log(`Calling onDeath for ${heroId}`);
                            try {
                                abilitiesIndex[heroId].onDeath({ playerHeroId: targetCardId, rowId: targetRow });
                            } catch (error) {
                                console.error(`Error in ${heroId} onDeath:`, error);
                            }
                        } else {
                            console.log(`No onDeath function found for ${heroId}`);
                        }
                    }
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
                // Adjust cost if Mei token is on the row (enemyEffects include {type:'ultimateCostModifier', value:2})
                try {
                    const enemyEffects = gameState.rows[rowId]?.enemyEffects || [];
                    const meiMod = enemyEffects.find(e => e?.type === 'ultimateCostModifier' && e?.value);
                    if (meiMod) {
                        console.log(`Mei Blizzard: Ultimate cost doubled from ${adjustedCost} to ${adjustedCost * meiMod.value}`);
                        adjustedCost *= meiMod.value;
                    }
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
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'BOB', 'Smash', playerNum, rowId, adjustedCost);
                            abilitiesIndex.bob.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BOB ultimate:', e);
                        }
                    } else if (heroId === 'ana' && abilitiesIndex?.ana?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Ana', 'Nano Boost', playerNum, rowId, adjustedCost);
                            abilitiesIndex.ana.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing ANA ultimate:', e);
                        }
                    } else if (heroId === 'baptiste' && abilitiesIndex?.baptiste?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Baptiste', 'Amplification Matrix', playerNum, rowId, adjustedCost);
                            abilitiesIndex.baptiste.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BAPTISTE ultimate:', e);
                        }
                    } else if (heroId === 'bastion' && abilitiesIndex?.bastion?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Bastion', 'Configuration: Tank', playerNum, rowId, adjustedCost);
                            abilitiesIndex.bastion.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BASTION ultimate:', e);
                        }
                    } else if (heroId === 'brigitte' && abilitiesIndex?.brigitte?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Brigitte', 'Shield Bash', playerNum, rowId, adjustedCost);
                            abilitiesIndex.brigitte.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing BRIGITTE ultimate:', e);
                        }
                    } else if (heroId === 'dva' && abilitiesIndex?.dva?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'D.Va', 'Call Mech', playerNum, rowId, adjustedCost);
                            abilitiesIndex.dva.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing DVA ultimate:', e);
                        }
                    } else if (heroId === 'dvameka' && abilitiesIndex?.dvameka?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'D.Va+MEKA', 'Self Destruct', playerNum, rowId, adjustedCost);
                            abilitiesIndex.dvameka.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing DVA+MEKA ultimate:', e);
                        }
                    } else if (heroId === 'doomfist' && abilitiesIndex?.doomfist?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Doomfist', 'Meteor Strike', playerNum, rowId, adjustedCost);
                            abilitiesIndex.doomfist.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing DOOMFIST ultimate:', e);
                        }
                    } else if (heroId === 'echo' && abilitiesIndex?.echo?.onUltimate) {
                        try {
                            abilitiesIndex.echo.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing ECHO ultimate:', e);
                        }
                    } else if (heroId === 'genji' && abilitiesIndex?.genji?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Genji', 'Dragon Blade', playerNum, rowId, adjustedCost);
                            abilitiesIndex.genji.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing GENJI ultimate:', e);
                        }
                    } else if (heroId === 'hanzo' && abilitiesIndex?.hanzo?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Hanzo', 'Dragonstrike', playerNum, rowId, adjustedCost);
                            abilitiesIndex.hanzo.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing HANZO ultimate:', e);
                        }
                    } else if (heroId === 'junkrat' && abilitiesIndex?.junkrat?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Junkrat', 'RIP-Tire', playerNum, rowId, adjustedCost);
                            abilitiesIndex.junkrat.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing JUNKRAT ultimate:', e);
                        }
                    } else if (heroId === 'lifeweaver' && abilitiesIndex?.lifeweaver?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Lifeweaver', 'Tree of Life', playerNum, rowId, adjustedCost);
                            abilitiesIndex.lifeweaver.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing LIFEWEAVER ultimate:', e);
                        }
                    } else if (heroId === 'lucio' && abilitiesIndex?.lucio?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Lúcio', 'Sound Barrier', playerNum, rowId, adjustedCost);
                            abilitiesIndex.lucio.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing LÚCIO ultimate:', e);
                        }
                    } else if (heroId === 'mccree' && abilitiesIndex?.mccree?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'McCree', 'Dead Eye', playerNum, rowId, adjustedCost);
                            abilitiesIndex.mccree.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing MCCREE ultimate:', e);
                        }
                    } else if (heroId === 'mei' && abilitiesIndex?.mei?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Mei', 'Cryo Freeze', playerNum, rowId, adjustedCost);
                            abilitiesIndex.mei.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing MEI ultimate:', e);
                        }
                    } else if (heroId === 'mercy' && abilitiesIndex?.mercy?.onUltimate) {
                        try {
                            // Track ultimate usage for Echo's Duplicate
                            window.__ow_trackUltimateUsed?.(heroId, 'Mercy', 'Guardian Angel', playerNum, rowId, adjustedCost);
                            abilitiesIndex.mercy.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
                        } catch (e) {
                            console.log('Error executing MERCY ultimate:', e);
                        }
    } else if (heroId === 'moira' && abilitiesIndex?.moira?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Moira', 'Coalescence', playerNum, rowId, adjustedCost);
            abilitiesIndex.moira.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing MOIRA ultimate:', e);
        }
    } else if (heroId === 'orisa' && abilitiesIndex?.orisa?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Orisa', 'Supercharger', playerNum, rowId, adjustedCost);
            abilitiesIndex.orisa.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing ORISA ultimate:', e);
        }
    } else if (heroId === 'pharah' && abilitiesIndex?.pharah?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Pharah', 'Barrage', playerNum, rowId, adjustedCost);
            abilitiesIndex.pharah.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing PHARAH ultimate:', e);
        }
    } else if (heroId === 'ramattra' && abilitiesIndex?.ramattra?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Ramattra', 'Ravenous Vortex', playerNum, rowId, adjustedCost);
            abilitiesIndex.ramattra.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing RAMATTRA ultimate:', e);
        }
    } else if (heroId === 'nemesis' && abilitiesIndex?.nemesis?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Nemesis', 'Annihilation', playerNum, rowId, adjustedCost);
            abilitiesIndex.nemesis.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing NEMESIS ultimate:', e);
        }
    } else if (heroId === 'reaper' && abilitiesIndex?.reaper?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Reaper', 'Death Blossom', playerNum, rowId, adjustedCost);
            abilitiesIndex.reaper.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing REAPER ultimate:', e);
        }
    } else if (heroId === 'reinhardt' && abilitiesIndex?.reinhardt?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Reinhardt', 'Earthshatter', playerNum, rowId, adjustedCost);
            abilitiesIndex.reinhardt.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing REINHARDT ultimate:', e);
        }
    } else if (heroId === 'roadhog' && abilitiesIndex?.roadhog?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Roadhog', 'Whole Hog', playerNum, rowId, adjustedCost);
            abilitiesIndex.roadhog.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing ROADHOG ultimate:', e);
        }
    } else if (heroId === 'sigma' && abilitiesIndex?.sigma?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Sigma', 'Gravitic Flux', playerNum, rowId, adjustedCost);
            abilitiesIndex.sigma.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing SIGMA ultimate:', e);
        }
    } else if (heroId === 'soldier' && abilitiesIndex?.soldier?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Soldier: 76', 'Tactical Visor', playerNum, rowId, adjustedCost);
            abilitiesIndex.soldier.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing SOLDIER ultimate:', e);
        }
    } else if (heroId === 'sombra' && abilitiesIndex?.sombra?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Sombra', 'E.M.P.', playerNum, rowId, adjustedCost);
            abilitiesIndex.sombra.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing SOMBRA ultimate:', e);
        }
    } else if (heroId === 'symmetra' && abilitiesIndex?.symmetra?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Symmetra', 'Shield Generator', playerNum, rowId, adjustedCost);
            abilitiesIndex.symmetra.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing SYMMETRA ultimate:', e);
        }
    } else if (heroId === 'torbjorn' && abilitiesIndex?.torbjorn?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Torbjörn', 'Forge Hammer', playerNum, rowId, adjustedCost);
            abilitiesIndex.torbjorn.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing TORBJÖRN ultimate:', e);
        }
    } else if (heroId === 'tracer' && abilitiesIndex?.tracer?.onUltimate) {
        try {
            window.__ow_trackUltimateUsed?.(heroId, 'Tracer', 'Recall', playerNum, rowId, adjustedCost);
            abilitiesIndex.tracer.onUltimate({ playerHeroId, rowId, cost: adjustedCost });
        } catch (e) {
            console.log('Error executing TRACER ultimate:', e);
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
            
            // Clean up Shield Bash effects at round end
            dispatch({
                type: ACTIONS.CLEANUP_SHIELD_BASH
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

            // Enforce max row capacity (4) for destination row
            const destCards = gameState.rows[finishRowId]?.cardIds || [];
            if (destCards.length >= 4 && startRowId !== finishRowId) {
                console.log(`Row ${finishRowId} is full (4). Cannot place ${draggableId}.`);
                return;
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
