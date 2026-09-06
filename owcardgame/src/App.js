import React, { useState, useReducer, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import './App.css';
// Removed CardFocus; migrate turn effects to independent runner
import TurnEffectsRunner from './abilities/engine/TurnEffectsRunner';
import MatchCounter from 'components/counters/MatchCounter';
import data from 'data';
import getRandInt, { PlayerCard } from 'helper';
import { produce } from 'immer';
import _ from 'lodash';
import { subscribeToModal, closeModal } from './abilities/engine/modalController';
import ChoiceModal from './components/modals/ChoiceModal';
import InterruptModal from './components/modals/InterruptModal';
import ReorderModal from './components/modals/ReorderModal';
import { subscribe as subscribeToActions, publish as publishAction, Actions } from './abilities/engine/actionsBus';
import abilitiesIndex from './abilities';
import TopBanner from './components/layout/TopBanner';
import { subscribe as subscribeTargeting, showMessage as showToast, clearMessage as clearToast } from './abilities/engine/targetingBus';
import { subscribe as subscribeDamage, dealDamage } from './abilities/engine/damageBus';
import AIGameIntegration from './ai/AIGameIntegration';
import AIDecisionDisplay from './components/AIDecisionDisplay';
import { AI_PERSONALITY } from './ai/AIController';
import {
    applyDefenderDamage,
    applyRowShieldDamage,
    decideRoundWinner,
    totalRowSynergy,
    isDeployFromHand,
    canDeployFromHand,
    occupiedCount,
    isTurbojacked,
    TURBOJACK_MARK,
} from './game/rules';
import { shouldSuppressEnterOnDeploy } from './game/redeployRules';
import { parseUltimateCost, findCardRowId, normalizeHeroId, clampBlocksMovement, isStructureCard } from './game/abilityRules';
import { rowUltimateCost } from './game/blizzard';
import { isDisoriented, shouldPopMirageOnMove } from './game/disorient';
import { heroBlockedByCage } from './game/cageFight';
import { popMirage } from './abilities/heroes/mirage';
import { seekerHitsEntering, chainswordApplies, chainswordCycloId, findBoardRowId, placeCardOnRow } from './game/rosterRules';
import effectsBus, { Effects } from './abilities/engine/effectsBus';
import { SCREENS, MATCH_MODE, isPractice } from './game/screens';
import { aiOwnsCurrentDecision, aiOwnsDecision } from './game/aiControl';
import { preloadHeroCardImages } from './assets/imagePreload';
import {
    addToGraveyard,
    removeFromGraveyard,
    isDeckHero,
    deckCounts,
    graveyardHeroIds,
    shouldReshuffle,
    pickBestResurrection,
} from './game/graveyard';
import { recomputeAnaTokens } from './abilities/heroes/ana';
import HomeScreen from 'components/home/HomeScreen';
import PracticePanel from 'components/practice/PracticePanel';
import PlayerHalf from 'components/layout/PlayerHalf';
import CenterSection from 'components/layout/CenterSection';
import PixiBoard from './presentation/pixi/PixiBoard';
import { createDirector } from './presentation/director';
import { playCardIntent } from './presentation/intents';
import { DragDropContext } from 'react-beautiful-dnd';
import { openingDealBeats, pickHeroFromRole, matchResultAnnouncerKey, nextRoundFirstPlayer, shouldDrawOnTurnStart } from './game/openingDeal';
import { runOpeningDealBeats } from './game/runOpeningDeal';
import { shouldBlockPreDealActions } from './game/matchStartGate';
import { handCardIdsToDiscard } from './game/roundCleanup';
import { shiftDrawQueue } from './game/drawQueue';
import { playClip, warmGameEventAudio } from './abilities/engine/soundController';
import { pickBattlefieldMap, BATTLEFIELD_MAP_OPACITY } from './assets/battlefieldMaps';
import MatchMapTitleCard from './components/match/MatchMapTitleCard';

export const ACTIONS = {
    ADD_CARD_EFFECT: 'add-card-effect',
    ADD_CARD_TO_HAND: 'add-card-to-hand',
    ADD_ROW_EFFECT: 'add-row-effect',
    APPEND_ROW_EFFECT: 'append-row-effect',
    APPEND_CARD_EFFECT: 'append-card-effect',
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
    STAND_DOWN_DVA: 'stand-down-dva',
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
    APPLY_ROW_LOCK: 'apply-row-lock',
    CLEAR_ROW_LOCKS: 'clear-row-locks',
    MOVE_CARD_TO_GRAVEYARD: 'move-card-to-graveyard',
    REMOVE_FROM_GRAVEYARD: 'remove-from-graveyard',
    CLEAR_GRAVEYARD: 'clear-graveyard',
    ADD_CARD_TO_ROW: 'add-card-to-row',
    CLEAR_ULTIMATE_USAGE: 'clear-ultimate-usage',
    CLEAR_REDEPLOY_LOCKS: 'clear-redeploy-locks',
};

export function reducer(gameState, action) {
    switch (action.type) {
        // Add hero effect to a card
        case ACTIONS.ADD_CARD_EFFECT: {
            return produce(gameState, (draft) => {
                const targetCardId = action.payload.targetCardId;
                const targetPlayer = targetCardId[0];
                const playerHeroId = action.payload.playerHeroId;
                const effectId = action.payload.effectId;
                const playerNum = parseInt(playerHeroId[0]);
                const cardEffect =
                    draft.playerCards[`player${playerNum}cards`].cards[
                        playerHeroId
                    ].effects[effectId];

                if (!cardEffect) return;
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

        case ACTIONS.APPEND_ROW_EFFECT: {
            const { rowId, arrayKey, effect } = action.payload || {};
            return produce(gameState, (draft) => {
                if (!rowId || !draft.rows[rowId]) return;
                if (!Array.isArray(draft.rows[rowId][arrayKey])) {
                    draft.rows[rowId][arrayKey] = [];
                }
                draft.rows[rowId][arrayKey].push(effect);
            });
        }

        case ACTIONS.APPEND_CARD_EFFECT: {
            const { cardId, effect } = action.payload || {};
            if (!cardId) return gameState;
            const playerNum = parseInt(cardId[0]);
            return produce(gameState, (draft) => {
                const card = draft.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
                if (!card) return;
                if (!Array.isArray(card.effects)) card.effects = [];
                card.effects.push(effect);
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
                // Prevent duplicates - only add if not already in hand
                const handRow = draft.rows[`player${playerNum}hand`];
                if (!handRow.cardIds.includes(playerHeroId)) {
                    handRow.cardIds.push(playerHeroId);
                    console.log(`Added ${playerHeroId} to hand`);
                } else {
                    console.warn(`DUPLICATE PREVENTED: ${playerHeroId} already in hand!`);
                }
            });
        }

        // Adds a card to player's cards. Optional rowId places it on the board
        // in the same update (used by Rajah's mirage so it never sits in hand).
        case ACTIONS.CREATE_CARD: {
            const playerNum = action.payload.playerNum;
            const heroId = action.payload.heroId;
            const rowId = action.payload.rowId;
            const insertIndex = action.payload.insertIndex;
            const enteredTurn = action.payload.enteredTurn;
            const newCard = new PlayerCard(playerNum, heroId);

            return produce(gameState, (draft) => {
                const destRow = rowId ? draft.rows[rowId] : null;
                if (destRow?.locked && !isStructureCard(newCard)) {
                    return;
                }
                const placedIds = destRow
                    ? placeCardOnRow(destRow, newCard.playerHeroId, insertIndex)
                    : null;
                if (placedIds) {
                    const pos = rowId[1];
                    const add = newCard.synergy?.[pos] || 0;
                    destRow.cardIds = placedIds;
                    destRow.synergy = Math.max(0, (destRow.synergy || 0) + add);
                    newCard.isPlayed = true;
                    newCard.synergy = { f: 0, m: 0, b: 0 };
                    if (enteredTurn != null) newCard.enteredTurn = enteredTurn;
                }
                draft.playerCards[`player${playerNum}cards`].cards[
                    newCard.playerHeroId
                ] = newCard;
            });
        }

        // Damage a row's shields
        case ACTIONS.DAMAGE_ROW_SHIELD: {
            const targetRow = action.payload.targetRow;
            const rowShieldDamage = action.payload.rowShieldDamage;

            return produce(gameState, (draft) => {
                if (!draft.rows[targetRow]) return;
                const result = applyRowShieldDamage(
                    draft.rows[targetRow].shield || [],
                    rowShieldDamage
                );
                draft.rows[targetRow].shield = result.shields;
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

        // Apply a row lock (no hero movement in/out) until the caging Mauga dies
        case ACTIONS.APPLY_ROW_LOCK: {
            const { rowId, sourceCardId } = action.payload || {};
            return produce(gameState, (draft) => {
                if (!draft.rows[rowId]) return;
                draft.rows[rowId].locked = true;
                draft.rows[rowId].lockedBy = sourceCardId || null;
            });
        }

        // Clear cages owned by one Mauga. Omitting sourceCardId is a no-op.
        case ACTIONS.CLEAR_ROW_LOCKS: {
            const sourceCardId = action.payload?.sourceCardId;
            return produce(gameState, (draft) => {
                if (!sourceCardId) return;
                ['1f','1m','1b','2f','2m','2b'].forEach((rid) => {
                    const row = draft.rows[rid];
                    if (!row || row.lockedBy !== sourceCardId) return;
                    row.locked = false;
                    row.lockedBy = null;
                });
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

            // Prevent movement if destination or source row is locked
            if ((finishRow && finishRow.locked) || (startRow && startRow.locked)) {
                return gameState; // movement blocked by Cage Fight
            }

            if (clampBlocksMovement(startRow)) {
                return gameState;
            }

            // Enforce max row capacity (4)
            if (finishRow && Array.isArray(finishRow.cardIds) && occupiedCount(finishRow.cardIds) >= 4 && startRowId !== finishRowId) {
                // Destination full; cancel move
                return gameState;
            }

            // Move card within same row
            if (startRowId === finishRowId) {
                const rowId = startRowId;
                const row = startRow;
                const newCardIds = Array.from(row.cardIds).filter(Boolean);
                const from = newCardIds.indexOf(targetCardId);
                if (from >= 0) newCardIds.splice(from, 1);
                newCardIds.splice(finishIndex, 0, targetCardId);

                return produce(gameState, (draft) => {
                    draft.rows[rowId].cardIds = newCardIds;
                });
            }

            // Moving from one row to another
            const newStartRowCardIds = Array.from(startRow.cardIds).filter(Boolean);
            const startAt = newStartRowCardIds.indexOf(targetCardId);
            if (startAt >= 0) newStartRowCardIds.splice(startAt, 1);

            const newFinishRowCardIds = Array.from(finishRow.cardIds).filter(Boolean);

            // CRITICAL: Prevent duplicate cards in same row
            if (newFinishRowCardIds.includes(targetCardId)) {
                console.error(`DUPLICATE PREVENTED: ${targetCardId} already exists in ${finishRowId}!`);
                console.error(`Current cards in ${finishRowId}:`, newFinishRowCardIds);
                // Don't add the duplicate, just return current state
                return gameState;
            }

            newFinishRowCardIds.splice(finishIndex, 0, targetCardId);

            // Check for Bastion token damage when moving to any row (not hand)
            if (startRowId[0] !== 'p' && startRowId !== finishRowId) {
                setTimeout(() => {
                    abilitiesIndex.orisa?.applySuperchargerLeave?.(targetCardId, startRowId);
                }, 0);
            }
            if (finishRowId[0] !== 'p') {
                setTimeout(() => {
                    abilitiesIndex.bastion?.applyTokenEnter?.(targetCardId, finishRowId);
                    abilitiesIndex.sylvain?.applyTripwireEnter?.(targetCardId, finishRowId);
                    abilitiesIndex.orisa?.applySuperchargerEnter?.(targetCardId, finishRowId);
                }, 0);
            }

            // Check for Wrecking Ball minefield triggers on movement
            if (abilitiesIndex?.wreckingball?.checkMinefieldTrigger) {
                // Check if moving into a row with minefield tokens
                if (finishRowId[0] !== 'p') {
                    abilitiesIndex.wreckingball.checkMinefieldTrigger(targetCardId, finishRowId);
                }
                // Check if moving out of a row with minefield tokens
                if (startRowId[0] !== 'p') {
                    abilitiesIndex.wreckingball.checkMinefieldTrigger(targetCardId, startRowId);
                }
            }

            // Check if Orisa is moving and handle her effects
            const heroId = targetCardId.slice(1);
            if (heroId === 'orisa' && startRowId !== finishRowId && startRowId[0] !== 'p') {
                // Supercharger stays on the row she cast it — when she leaves, clear it.
                abilitiesIndex.orisa?.clearSuperchargerBuffsOnRow?.(startRowId);
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
            playClip(`${cardId}-intro`);

            // If this is an AI special card (Bob, D.Va Meka, Turret, or Nemesis), trigger immediate play
            if (playerNum === 2 && (cardId === 'bob' || cardId === 'dvameka' || cardId === 'turret' || cardId === 'nemesis' || cardId === 'stoneguard')) {
                console.log(`AI special card ${cardId} added - triggering immediate play`);
                // Use setTimeout to ensure the reducer completes before triggering AI play
                setTimeout(() => {
                    if (window.__ow_aiIntegration?.checkAndPlaySpawnedSpecialCard) {
                        // Map cardId to heroId for the function
                        const heroIdMap = {
                            'bob': 'ashe',
                            'dvameka': 'dva', 
                            'turret': 'torbjorn',
                            'nemesis': 'ramattra',
                            'stoneguard': 'axiom',
                        };
                        const heroId = heroIdMap[cardId];
                        if (heroId) {
                            window.__ow_aiIntegration.checkAndPlaySpawnedSpecialCard(heroId);
                        }
                    }
                }, 100);
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
            // The turn it was pulled off the board on. Everything after that is
            // fair game, so the hero sits out exactly one turn rather than the
            // rest of the round.
            const returnedOn = Number(
                action.payload.turnCount ?? window.__ow_getTurnCount?.() ?? 0
            );
            // Default true: Teleporter-style returns skip On-Enter. Tracer Recall
            // passes false so Pulse Pistols can fire on redeploy.
            const suppressEnter = action.payload.suppressEnterOnRedeploy !== false;
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
                        
                        // Returned heroes stay in hand, held until the next turn
                        if (draft.playerCards[playerKey]?.cards?.[cardId]) {
                            draft.playerCards[playerKey].cards[cardId].isPlayed = false;
                            draft.playerCards[playerKey].cards[cardId].redeployLockedUntilTurn =
                                returnedOn + 1;
                            draft.playerCards[playerKey].cards[cardId].suppressEnterOnRedeploy =
                                suppressEnter;
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

        /*
         * A round cannot end with D.Va piloting the MEKA.
         *
         * While suited up she waits in hand, undraggable, and the only things
         * that clear that state are the MEKA dying or being swept out of hand.
         * Neither happens when a round simply ends with the MEKA still standing
         * on the board — so she carried into the next round in hand, suited up
         * to a MEKA that no longer existed, and unplayable for the rest of the
         * match.
         *
         * Both halves go back to how they started: the MEKA is set aside as a
         * summon-only card again, and D.Va's card is dropped so the new round's
         * deck reset can deal her out fresh.
         */
        case ACTIONS.STAND_DOWN_DVA: {
            const { playerNum } = action.payload;
            const playerKey = `player${playerNum}cards`;
            const dvaId = `${playerNum}dva`;
            const mekaId = `${playerNum}dvameka`;

            return produce(gameState, (draft) => {
                const cards = draft.playerCards[playerKey]?.cards;
                const dva = cards?.[dvaId];
                const piloting = Array.isArray(dva?.effects)
                    && dva.effects.some((effect) => effect?.id === 'suited-up');
                // An ordinary D.Va in hand keeps her place like any other card.
                if (!piloting) return;

                for (const rowId of Object.keys(draft.rows)) {
                    const ids = draft.rows[rowId]?.cardIds;
                    if (!Array.isArray(ids)) continue;
                    draft.rows[rowId].cardIds = ids.filter(
                        (id) => id !== dvaId && id !== mekaId
                    );
                }
                delete cards[dvaId];
                delete cards[mekaId];
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

        // A hero has died: take it off the board and lay it in its owner's graveyard.
        // Special cards (BOB, MEKA, turrets) are summoned rather than drawn, so they
        // are removed without being buried — they must never re-enter the deck.
        case ACTIONS.MOVE_CARD_TO_GRAVEYARD: {
            const { cardId } = action.payload;
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const heroId = cardId.slice(1);

            return produce(gameState, (draft) => {
                // Idempotent: several paths can report the same death (damage bus,
                // the board sweep, AI cleanup). Once the card is gone it stays gone,
                // so a repeat dispatch cannot bury a second copy.
                if (!draft.playerCards[playerKey]?.cards?.[cardId]) return;

                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b'];
                for (const rowId of allRows) {
                    const row = draft.rows[rowId];
                    if (!row || !Array.isArray(row.cardIds)) continue;
                    const cardIndex = row.cardIds.indexOf(cardId);
                    if (cardIndex !== -1) {
                        row.cardIds.splice(cardIndex, 1);
                        break;
                    }
                }

                if (isDeckHero(data.heroes[heroId])) {
                    const graveKey = `player${playerNum}`;
                    if (!draft.graveyards) draft.graveyards = { player1: [], player2: [] };
                    draft.graveyards[graveKey] = addToGraveyard(
                        draft.graveyards[graveKey] || [],
                        { heroId, playerHeroId: cardId }
                    );
                }

                if (draft.playerCards[playerKey]?.cards?.[cardId]) {
                    delete draft.playerCards[playerKey].cards[cardId];
                }
            });
        }

        // Place an existing card directly into a board row. Used by resurrection,
        // which must bypass the deploy path so no on-enter ability fires.
        case ACTIONS.ADD_CARD_TO_ROW: {
            const { rowId, playerHeroId, playerNum } = action.payload;
            return produce(gameState, (draft) => {
                const row = draft.rows[rowId];
                if (!row || !Array.isArray(row.cardIds)) return;
                if (row.cardIds.includes(playerHeroId)) return;
                const owner = playerNum || parseInt(String(playerHeroId)[0], 10);
                const card = draft.playerCards[`player${owner}cards`]?.cards?.[playerHeroId];
                if (heroBlockedByCage(card, row)) return;
                row.cardIds.push(playerHeroId);
            });
        }

        // Let one hero use its ultimate again (returning from the graveyard).
        case ACTIONS.CLEAR_ULTIMATE_USAGE: {
            const { playerNum, heroId } = action.payload;
            return produce(gameState, (draft) => {
                const playerKey = `player${playerNum}`;
                const used = draft.ultimateUsage?.[playerKey];
                if (!Array.isArray(used)) return;
                draft.ultimateUsage[playerKey] = used.filter((id) => id !== heroId);
            });
        }

        case ACTIONS.CLEAR_REDEPLOY_LOCKS: {
            return produce(gameState, (draft) => {
                [1, 2].forEach((playerNum) => {
                    const cards = draft.playerCards[`player${playerNum}cards`]?.cards;
                    if (!cards) return;
                    Object.values(cards).forEach((card) => {
                        if (card) card.redeployLockedUntilTurn = 0;
                    });
                });
            });
        }

        // Mercy pulling a hero back out of the graveyard.
        case ACTIONS.REMOVE_FROM_GRAVEYARD: {
            const { playerNum, heroId } = action.payload;
            const graveKey = `player${playerNum}`;
            return produce(gameState, (draft) => {
                if (!draft.graveyards?.[graveKey]) return;
                draft.graveyards[graveKey] = removeFromGraveyard(
                    draft.graveyards[graveKey],
                    heroId
                );
            });
        }

        // The deck ran dry; the graveyard has been folded back into it.
        case ACTIONS.CLEAR_GRAVEYARD: {
            const { playerNum } = action.payload;
            const graveKey = `player${playerNum}`;
            return produce(gameState, (draft) => {
                if (!draft.graveyards) return;
                draft.graveyards[graveKey] = [];
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
                        synergy: dvaHero?.synergy || { f: 1, m: 1, b: 1 },
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

/** Practice hands Player 2 to the human, so the AI-only guards must stand down. */
function manualPlayerTwo() {
    return !!window.__ow_practiceMode;
}

async function withAbilitySource(playerHeroId, fn) {
    window.__ow_abilitySourceCardId = playerHeroId;
    try {
        return await fn();
    } finally {
        window.__ow_abilitySourceCardId = null;
    }
}

async function checkOnEnterAbilities(playerHeroId, rowId, playerNum) {
    /*
     * A Player 2 card only gets its on-enter when the AI is the one placing it.
     * The turn is the test, not `__ow_isAITurn`: that flag used to be cleared
     * the moment the AI's loop returned, 1.5 seconds before its turn actually
     * ends, so the last card the AI played each turn — and anything resolving
     * through the choice modal's thinking delay — silently lost its ability.
     */
    if (playerNum === 2 && !window.__ow_aiTriggering && !aiOwnsCurrentDecision() && !manualPlayerTwo()) {
        console.log('Player 2 abilities are controlled by AI - use window.__ow_triggerOnEnter');
        return;
    }

    const heroId = playerHeroId.slice(1);
    const mod = abilitiesIndex[heroId];

    // Turbojack threw this hero back into the deck. It is playable again, but
    // it does not get its on-enter a second time. The mark is spent here, so a
    // later, ordinary redeploy behaves normally.
    if (isTurbojacked(window.__ow_getCard?.(playerHeroId)?.effects)) {
        window.__ow_removeCardEffect?.(playerHeroId, TURBOJACK_MARK);
        console.log(`${playerHeroId} entered turbojacked - on-enter suppressed`);
        return;
    }

    // Symmetra Teleporter (and similar) returns: power yes, synergy no, Enter no.
    // Tracer Recall sets suppressEnterOnRedeploy: false so Pulse Pistols can fire again.
    if (shouldSuppressEnterOnDeploy(window.__ow_getCard?.(playerHeroId))) {
        window.__ow_dispatchAction?.({
            type: 'edit-card',
            payload: {
                playerNum,
                targetCardId: playerHeroId,
                editKeys: ['suppressEnterOnRedeploy'],
                editValues: [false],
            },
        });
        console.log(`${playerHeroId} redeploy - on-enter suppressed`);
    } else if (mod?.onEnter) {
        await withAbilitySource(playerHeroId, async () => {
            await mod.onEnter({ playerHeroId, rowId });
            if (heroId === 'ana' && typeof mod.onEnterAbility1 === 'function') {
                await mod.onEnterAbility1({ playerNum, playerHeroId });
            }
        });
    }

    const seeker = window.__ow_getSeeker?.();
    if (seeker && seekerHitsEntering({
        seekerOwnerNum: seeker.ownerPlayerNum,
        enteringPlayerNum: playerNum,
    })) {
        dealDamage(playerHeroId, rowId, seeker.damage || 3, false, seeker.sourceCardId);
        try { effectsBus.publish(Effects.showDamage(playerHeroId, seeker.damage || 3)); } catch {}
        try { effectsBus.publish(Effects.orbitStop('seeker', playerHeroId)); } catch {}
        window.__ow_setSeeker?.(null);
    }
}

export default function App() {
    const [gameState, dispatch] = useReducer(reducer, data);

    // Which shell screen is live. Phase 2 swaps only the match branch for the Pixi table.
    const [screen, setScreen] = useState(SCREENS.MENU);
    const [matchMode, setMatchMode] = useState(MATCH_MODE.VERSUS_AI);
    const [battlefieldMap, setBattlefieldMap] = useState(null);
    // Full-bleed map splash before the opening deal; false once it has faded out.
    const [showMapTitle, setShowMapTitle] = useState(false);
    const matchStartedRef = useRef(false);

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
    
    // AI State Management
    const [aiIntegration] = useState(() => new AIGameIntegration());
    const [aiPersonality, setAiPersonality] = useState(AI_PERSONALITY.BALANCED);
    const [aiDecision, setAiDecision] = useState(null);
    const [isAIThinking, setIsAIThinking] = useState(false);
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    // Assigned below, once reshuffleGraveyardIntoDeck exists, so the window
    // bridge installed on mount always calls the current closure.
    const reshuffleGraveyardIntoDeckRef = useRef(null);
    const turnStateRef = useRef(turnState);
    turnStateRef.current = turnState;
    const directorRef = useRef(null);
    const pixiBoardRef = useRef(null);
    const [theaterLocked, setTheaterLocked] = useState(false);
    const theaterLockedRef = useRef(false);
    const openingDealRef = useRef(false);
    const openingDealGenerationRef = useRef(0);
    const [shufflingPlayer, setShufflingPlayer] = useState(null);

    // AI Turn End Handler
    const handleAIEndTurn = () => {
        console.log('AI ending turn - switching to Player 1');
        // Prevent double increment if already advanced this logical turn
        if (window.__ow_lastTurnAdvance && window.__ow_lastTurnAdvance.turn === turnState.turnCount && window.__ow_lastTurnAdvance.from === 2) {
            console.warn('Skipping duplicate AI end turn advance');
            return;
        }
        
        // Clear AI context flags to ensure human players can use abilities
        // normally. __ow_isAITurn is left to the turn state below: until the
        // turn has actually flipped, the AI still owns any decision in flight.
        window.__ow_aiTriggering = false;
        window.__ow_currentAICardId = null;
        window.__ow_currentAIHero = null;
        window.__ow_currentAIAbility = null;
        console.log('AI context flags cleared for human player turn');
        
        setTurnState((prevState) => ({
            ...prevState,
            turnCount: prevState.turnCount + 1,
            playerTurn: 1,
        }));
        window.__ow_lastTurnAdvance = { turn: turnState.turnCount, from: 2 };
    };

    // AI Turn Handler
    const handleAITurn = async () => {
        if (openingDealRef.current) return;
        try {
            setIsAIThinking(true);
            setAiDecision(null);

            // Get current decision from AI
            const decision = await aiIntegration.handleAITurn();
            setAiDecision(decision);

            // Update AI thinking state
            setIsAIThinking(false);

        } catch (error) {
            console.error('AI turn error:', error);
            setIsAIThinking(false);
        }
    };
    
    // Expose a minimal bridge for hero modules to append row effects (e.g., BOB token)
    useEffect(() => {
        window.__ow_appendRowEffect = (rowId, arrayKey, effect) => {
            dispatch({
                type: ACTIONS.APPEND_ROW_EFFECT,
                payload: { rowId, arrayKey, effect },
            });
        };
        window.__ow_getRow = (rowId) => gameStateRef.current.rows[rowId];
        window.__ow_setRowArray = (rowId, arrayKey, nextArr) => {
            try {
                if (!rowId || !gameStateRef.current.rows[rowId]) {
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
            return gameStateRef.current.playerCards[`player${pn}cards`].cards[playerHeroId];
        };
        window.__ow_getMaxHealth = (playerHeroId) => {
            // Lookup from data.js heroes
            const heroId = playerHeroId.slice(1);
            return data.heroes[heroId]?.health ?? undefined;
        };
        window.__ow_setCardHealth = (playerHeroId, newHealth, allowRevive = false, options = {}) => {
            const playerNum = parseInt(playerHeroId[0]);
            const card = gameStateRef.current.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];

            if (card && isStructureCard(card) && newHealth > card.health && !options.allowStructureHeal) {
                console.log(`Health Update: Structure ${playerHeroId} cannot be healed`);
                return;
            }

            // CRITICAL: Prevent healing from reviving dead cards (only Mercy ultimate can revive)
            if (card && card.health <= 0 && newHealth > 0 && !allowRevive) {
                console.log(`Health Update: Cannot revive dead card ${playerHeroId} with healing (only Mercy ultimate can revive)`);
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
        window.__ow_setRowSynergy = (playerNum, rowPosition, synergyValue) => {
            const rowId = `${playerNum}${rowPosition}`;
            dispatch({ type: ACTIONS.SET_SYNERGY, payload: { rowId, newSynergyVal: synergyValue } });
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
            const gs = gameStateRef.current;
            const invulnMap = gs.invulnerableSlots?.[rowId];
            if (!invulnMap) return false;
            const row = gs.rows[rowId];
            if (!row?.cardIds) return false;
            return Object.keys(invulnMap).some((sourceCardId) => {
                const center = row.cardIds.indexOf(sourceCardId);
                if (center === -1) return false;
                return Math.abs(slotIndex - center) <= 1;
            });
        };
        window.__ow_removeRowEffect = (rowId, effectType, effectId) => {
            try {
                if (!rowId || !gameStateRef.current.rows[rowId]) {
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
            const card = gameStateRef.current.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
            
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
        window.__ow_dispatchArmorUpdate = (cardId, newArmor) => {
            const playerNum = parseInt(cardId[0]);
            dispatch({
                type: ACTIONS.EDIT_CARD,
                payload: {
                    playerNum: playerNum,
                    targetCardId: cardId,
                    editKeys: ['armor'],
                    editValues: [Math.max(0, Number(newArmor) || 0)],
                }
            });
        };
        window.__ow_createCardOnRow = (playerNum, heroId, rowId, insertIndex) => {
            dispatch({
                type: ACTIONS.CREATE_CARD,
                payload: { playerNum, heroId, rowId, insertIndex },
            });
            return `${playerNum}${heroId}`;
        };
        window.__ow_appendCardEffect = (cardId, effect) => {
            dispatch({
                type: ACTIONS.APPEND_CARD_EFFECT,
                payload: { cardId, effect },
            });
        };
        window.__ow_removeCardEffect = (cardId, effectId) => {
            // Remove effect from card by ID
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const currentCard = gameStateRef.current.playerCards[playerKey]?.cards?.[cardId];
            
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
                const cards = gameStateRef.current.rows[rowId]?.cardIds || [];
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
            return gameStateRef.current.lastUltimateUsed;
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
        window.__ow_dispatch = (action) => {
            dispatch(action);
        };
        window.__ow_getTurnCount = () => {
            return turnStateRef.current.turnCount;
        };
        window.__ow_hasUsedUltimate = (playerNum, heroId) => {
            const key = `player${playerNum}`;
            return !!gameStateRef.current.ultimateUsage?.[key]?.includes(heroId);
        };
        window.__ow_isUltimateReady = (cardId) => {
            // Find the card's row
            const playerNum = parseInt(cardId[0]);
            const rows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];

            let cardRow = null;
            let rowId = null;
            for (const rid of rows) {
                const row = gameStateRef.current.rows[rid];
                if (row && row.cardIds && row.cardIds.includes(cardId)) {
                    cardRow = row;
                    rowId = rid;
                    break;
                }
            }

            if (!cardRow) {
                console.log(`Ultimate check failed: card ${cardId} not found in any row`);
                return false;
            }

            const readyCard = gameStateRef.current.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
            if (isDisoriented(readyCard)) {
                return false;
            }

            // Get ultimate cost from card data
            const heroId = cardId.slice(1); // Remove player number
            const heroData = data.heroes[heroId];
            if (!heroData || !heroData.ultimate) {
                console.log(`Ultimate check failed: no ultimate data for hero ${heroId}`);
                return false;
            }

            const requiredCost = parseUltimateCost(heroData.ultimate, {
                heroId,
                currentSynergy: cardRow.synergy || 0,
            });

            // Get synergy for the row (it's a single number, not an object)
            const currentSynergy = cardRow.synergy || 0;

            console.log(`Ultimate check for ${cardId} (${heroId}) in ${rowId}: needs ${requiredCost} synergy, has ${currentSynergy}`);

            return currentSynergy >= requiredCost;
        };
        window.__ow_triggerOnEnter = async (playerHeroId, rowId, playerNum) => {
            window.__ow_aiTriggering = true;
            try {
                await checkOnEnterAbilities(playerHeroId, rowId, playerNum);
            } finally {
                window.__ow_aiTriggering = false;
            }
        };
        window.__ow_useUltimate = async (cardId, target) => {
            console.log(`AI requesting ultimate for ${cardId}`, target);

            // Find the row where the card is located
            const playerNum = parseInt(cardId[0]);
            const allRows = [`${playerNum}f`, `${playerNum}m`, `${playerNum}b`];
            let cardRowId = null;

            for (const rowId of allRows) {
                const row = gameStateRef.current.rows[rowId];
                if (row && row.cardIds.includes(cardId)) {
                    cardRowId = rowId;
                    break;
                }
            }

            if (!cardRowId) {
                console.error(`AI ultimate failed: card ${cardId} not found on board`);
                return false;
            }

            // Get hero ID and ultimate cost
            const heroId = cardId.slice(1);
            const heroJsonData = data.heroes[heroId];

            const ultimateCost = parseUltimateCost(heroJsonData?.ultimate, {
                heroId,
                currentSynergy: gameStateRef.current.rows[cardRowId]?.synergy || 0,
            });

            // Check synergy availability
            const currentSynergy = gameStateRef.current.rows[cardRowId]?.synergy || 0;
            if (currentSynergy < ultimateCost) {
                console.log(`AI ultimate failed: insufficient synergy (have ${currentSynergy}, need ${ultimateCost})`);
                return false;
            }

            // Check if already used
            const playerKey = `player${playerNum}`;
            if (gameStateRef.current.ultimateUsage[playerKey]?.includes(heroId)) {
                console.log(`AI ultimate failed: ${heroId} already used ultimate this round`);
                return false;
            }

            const caster = gameStateRef.current.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
            if (isDisoriented(caster)) {
                console.log(`AI ultimate failed: ${cardId} is Disoriented`);
                return false;
            }

            // Publish the ultimate request via actions bus
            console.log(`======= AI ULTIMATE EXECUTION START =======`);
            console.log(`Hero: ${heroId}, Card: ${cardId}, Row: ${cardRowId}`);
            console.log(`Cost: ${ultimateCost}, Current Synergy: ${gameStateRef.current.rows[cardRowId]?.synergy}`);
            console.log(`Target:`, target);

            const actionsBus = await import('./abilities/engine/actionsBus');
            window.__ow_aiTriggering = true;
            // Store the target for AI ultimates so onUltimate functions can use it instead of selectCardTarget
            window.__ow_aiUltimateTarget = target;

            console.log(`Publishing requestUltimate action...`);
            await actionsBus.default.publish(actionsBus.Actions.requestUltimate(cardId, cardRowId, ultimateCost));
            console.log(`Ultimate action published successfully`);

            // NOTE: Flags cleared after ultimate execution completes (see action handler)
            console.log(`======= AI ULTIMATE REQUEST SENT =======`);

            return true;
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
            try {
                const heroId = normalizeHeroId(lastUltimate.heroId);
                const heroAbility = abilitiesIndex[heroId]?.onUltimate;
                if (!heroAbility) {
                    console.log('Echo: Cannot duplicate - hero ability not found:', heroId);
                    return false;
                }
                const result = await heroAbility({
                    playerHeroId,
                    rowId,
                    cost: 2,
                });
                return result !== false;
            } catch (error) {
                console.error('Echo: Failed to execute duplicated ultimate:', error);
                return false;
            }
        };
        window.__ow_useAbility = async (cardId) => {
            const heroId = normalizeHeroId(cardId);
            if (heroId === 'ramattra') {
                await publishAction(Actions.requestTransform(cardId));
                return true;
            }
            return false;
        };
        window.__ow_moveCardToRow = (cardId, targetRowId) => {
            if (shouldPopMirageOnMove({
                cardId,
                sourceCardId: window.__ow_abilitySourceCardId,
                getCard: (id) => window.__ow_getCard?.(id),
            })) {
                popMirage({ mirageId: cardId, sourceCardId: window.__ow_abilitySourceCardId });
                return;
            }
            const playerNum = parseInt(cardId[0]);
            const playerKey = `player${playerNum}cards`;
            const currentCard = gameStateRef.current.playerCards[playerKey]?.cards?.[cardId];
            
            if (currentCard) {
                // Find current row and index
                let currentRowId = null;
                let currentIndex = -1;
                
                const allRows = ['1f', '1m', '1b', '2f', '2m', '2b', 'player1hand', 'player2hand'];
                for (const rowId of allRows) {
                    const rowCards = gameStateRef.current.rows[rowId]?.cardIds || [];
                    const index = rowCards.indexOf(cardId);
                    if (index !== -1) {
                        currentRowId = rowId;
                        currentIndex = index;
                        break;
                    }
                }
                
                if (currentRowId && currentIndex !== -1) {
                    // Get target row cards to determine insertion point
                    const targetRowCards = gameStateRef.current.rows[targetRowId]?.cardIds || [];
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
        // Graveyard bridge, used by Mercy's resurrection, the AI, and PlayerButtons.
        window.__ow_reshuffleGraveyardIntoDeck = (playerNum) =>
            reshuffleGraveyardIntoDeckRef.current?.(playerNum) || 0;
        window.__ow_getGraveyard = (playerNum) =>
            gameStateRef.current.graveyards?.[`player${playerNum}`] || [];
        window.__ow_pickBestGraveyardTarget = (playerNum) =>
            pickBestResurrection(window.__ow_getGraveyard(playerNum), data.heroes);
        window.__ow_resurrectFromGraveyard = (playerNum, heroId, rowId) => {
            const grave = window.__ow_getGraveyard(playerNum);
            if (!grave.some((entry) => entry?.heroId === heroId)) return null;

            const row = gameStateRef.current.rows[rowId];
            // occupiedCount, not length: a row can carry holes, and counting
            // those as bodies reports a row full while it still has a slot.
            if (!row || occupiedCount(row.cardIds) >= 4) return null;
            if (heroBlockedByCage(data.heroes[heroId], row)) return null;

            const playerHeroId = `${playerNum}${heroId}`;
            dispatch({ type: ACTIONS.REMOVE_FROM_GRAVEYARD, payload: { playerNum, heroId } });
            dispatch({ type: ACTIONS.CREATE_CARD, payload: { playerNum, heroId } });
            dispatch({
                type: ACTIONS.ADD_CARD_TO_ROW,
                payload: { playerNum, rowId, playerHeroId },
            });
            // A hero returning from the dead may use its ultimate again.
            dispatch({
                type: ACTIONS.CLEAR_ULTIMATE_USAGE,
                payload: { playerNum, heroId },
            });
            return playerHeroId;
        };

        window.__ow_reshuffleBag = window.__ow_reshuffleBag || { player1: [], player2: [] };
        window.__ow_reshuffleToDeck = (cardId, { turbojacked = false } = {}) => {
            const owner = parseInt(cardId[0], 10);
            const heroId = cardId.slice(1);
            const card = window.__ow_getCard?.(cardId);
            const currentRowId = findBoardRowId(cardId, window.__ow_getRow);
            if (!currentRowId || !card) return;
            const nextIds = (window.__ow_getRow(currentRowId).cardIds || []).filter((id) => id !== cardId);
            window.__ow_setRowArray?.(currentRowId, 'cardIds', nextIds);
            const key = `player${owner}`;
            const bag = window.__ow_reshuffleBag[key] || [];
            // `turbojacked` rides along in the bag so the mark survives the trip
            // through the deck and can be put back on the card when it is drawn.
            window.__ow_reshuffleBag[key] = [...bag, { heroId, health: card.health, turbojacked }];
        };
        window.__ow_peekReshuffle = (playerNum) => {
            const bag = window.__ow_reshuffleBag?.[`player${playerNum}`] || [];
            return bag[0] || null;
        };
        window.__ow_shiftReshuffleBag = (playerNum) => {
            const key = `player${playerNum}`;
            const bag = [...(window.__ow_reshuffleBag?.[key] || [])];
            bag.shift();
            window.__ow_reshuffleBag[key] = bag;
        };
        window.__ow_drawQueue = window.__ow_drawQueue || { player1: [], player2: [] };
        window.__ow_peekDrawQueue = (playerNum) => {
            const q = window.__ow_drawQueue?.[`player${playerNum}`] || [];
            return q[0] || null;
        };
        window.__ow_setDrawQueue = (playerNum, ids) => {
            window.__ow_drawQueue = window.__ow_drawQueue || { player1: [], player2: [] };
            window.__ow_drawQueue[`player${playerNum}`] = [...(ids || [])];
        };
        window.__ow_getDrawQueue = (playerNum) => (
            [...(window.__ow_drawQueue?.[`player${playerNum}`] || [])]
        );
        window.__ow_shiftDrawQueue = (playerNum) => {
            const key = `player${playerNum}`;
            const { next, rest } = shiftDrawQueue(window.__ow_drawQueue?.[key] || []);
            window.__ow_drawQueue = window.__ow_drawQueue || { player1: [], player2: [] };
            window.__ow_drawQueue[key] = rest;
            return next;
        };
        window.__ow_getDrawnHeroes = (playerNum) => (
            [...(gameLogicRef.current?.[`player${playerNum}DrawnHeroes`] || [])]
        );
        window.__ow_getHeroRoster = () => data.heroes;
        window.__ow_getAbilityModule = (heroId) => abilitiesIndex[heroId] || null;
        window.__ow_rerunEnterAbility = async (playerHeroId, rowId) => {
            const heroId = normalizeHeroId(playerHeroId);
            const mod = abilitiesIndex[heroId];
            if (!mod) return false;
            const playerNum = parseInt(playerHeroId[0], 10);
            const resolvedRow = rowId || findCardRowId(
                playerHeroId,
                (id) => window.__ow_getRow?.(id)?.cardIds || []
            );
            if (!resolvedRow) return false;
            await withAbilitySource(playerHeroId, async () => {
                if (typeof mod.onEnter === 'function') {
                    await mod.onEnter({ playerHeroId, rowId: resolvedRow });
                }
                if (heroId === 'ana' && typeof mod.onEnterAbility1 === 'function') {
                    await mod.onEnterAbility1({ playerNum, playerHeroId });
                }
            });
            return true;
        };
        window.__ow_getSeeker = () => window.__ow_seeker || null;
        window.__ow_setSeeker = (value) => { window.__ow_seeker = value; };
        window.__ow_getSandstorm = () => window.__ow_sandstorm || null;
        window.__ow_setSandstorm = (value) => { window.__ow_sandstorm = value; };
        window.__ow_isSandstormActive = () => !!window.__ow_sandstorm;
        window.__ow_onDirectAttack = ({ sourceCardId, targetRow }) => {
            const row = window.__ow_getRow?.(targetRow);
            const cycloId = chainswordCycloId(row?.cardIds);
            if (!cycloId || sourceCardId?.slice(1) === 'cyclo') return;
            if (!chainswordApplies({
                attackerPlayerNum: parseInt(sourceCardId[0], 10),
                defenderRowPlayerNum: parseInt(cycloId[0], 10),
                sourceCardId,
            })) return;
            const attackerRowId = findBoardRowId(sourceCardId, window.__ow_getRow);
            if (!attackerRowId) return;
            abilitiesIndex.cyclo.offerChainsword({ attackerCardId: sourceCardId, attackerRowId, cycloId });
        };
        return () => {
            window.__ow_appendRowEffect = null; window.__ow_getRow = null; window.__ow_setRowArray = null; window.__ow_updateSynergy = null; window.__ow_getCard = null; window.__ow_getMaxHealth = null; window.__ow_setCardHealth = null; window.__ow_isSpecial = null; window.__ow_setRowPower = null; window.__ow_setRowSynergy = null; window.__ow_setInvulnerableSlots = null; window.__ow_clearInvulnerableSlots = null; window.__ow_isSlotInvulnerable = null; window.__ow_removeRowEffect = null; window.__ow_cleanupImmortalityField = null; window.__ow_dealDamage = null; window.__ow_dispatchShieldUpdate = null; window.__ow_dispatchArmorUpdate = null; window.__ow_createCardOnRow = null; window.__ow_appendCardEffect = null; window.__ow_removeCardEffect = null; window.__ow_moveCardToRow = null; window.__ow_isRowFull = null; window.__ow_addSpecialCardToHand = null; window.__ow_returnDvaToHand = null; window.__ow_replaceWithDva = null; window.__ow_cleanupDvaSuitedUp = null; window.__ow_removeSpecialCard = null; window.__ow_getLastUltimateUsed = null; window.__ow_trackUltimateUsed = null; window.__ow_dispatchAction = null; window.__ow_dispatch = null; window.__ow_executeDuplicatedUltimate = null; window.__ow_getReinhardtFunctions = null; window.__ow_useUltimate = null; window.__ow_useAbility = null; window.__ow_reshuffleToDeck = null; window.__ow_reshuffleGraveyardIntoDeck = null; window.__ow_getGraveyard = null; window.__ow_pickBestGraveyardTarget = null; window.__ow_resurrectFromGraveyard = null; window.__ow_peekReshuffle = null; window.__ow_shiftReshuffleBag = null; window.__ow_peekDrawQueue = null; window.__ow_setDrawQueue = null; window.__ow_getDrawQueue = null; window.__ow_shiftDrawQueue = null; window.__ow_getDrawnHeroes = null; window.__ow_getHeroRoster = null; window.__ow_getAbilityModule = null; window.__ow_rerunEnterAbility = null; window.__ow_getSeeker = null; window.__ow_setSeeker = null; window.__ow_getSandstorm = null; window.__ow_setSandstorm = null; window.__ow_isSandstormActive = null; window.__ow_onDirectAttack = null; window.__ow_hasUsedUltimate = null; window.__ow_getTurnCount = null;
        };
    }, []);

    useEffect(() => {
        const storm = window.__ow_sandstorm;
        if (storm && turnState.playerTurn === storm.ownerPlayerNum && turnState.turnCount > (storm.armedOnTurn || 0)) {
            window.__ow_sandstorm = null;
        }
    }, [turnState.playerTurn, turnState.turnCount]);

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
        maxTurnsPerPlayer: 9, // 9 turns each = 18 turns total
        maxHandSize: 6, // Changed from 10 to 6
        gamePhase: 'playing', // 'playing', 'roundEnd', 'gameEnd'
        // Every hero each player has drawn this match. Not reset between
        // rounds: a hero is drawn once, full stop.
        player1DrawnHeroes: [],
        player2DrawnHeroes: [],
        reshuffleBag: { player1: [], player2: [] },
    });

    // References for setting state inside useEffects
    let matchRef = useRef(null);
    // The round-2 deal runs from a timer, where the captured `gameLogic` is a
    // round out of date.
    const gameLogicRef = useRef(gameLogic);
    gameLogicRef.current = gameLogic;

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

    /**
     * Safety net: bury anything left dead on the board.
     *
     * The damage bus buries its own kills so they land after onDeath, but abilities
     * that zero health directly (EDIT_CARD instant-kills) and AI cleanup never went
     * through it. Without this sweep those heroes are deleted instead of buried,
     * which silently leaks them out of the deck and starves Mercy of rez targets.
     * Deferred a tick so onDeath handlers commit first; MOVE_CARD_TO_GRAVEYARD is
     * idempotent, so overlapping with the damage bus is harmless.
     */
    useEffect(() => {
        if (screen !== SCREENS.MATCH) return;
        const timer = setTimeout(() => {
            const gs = gameStateRef.current;
            for (const rowId of ['1f', '1m', '1b', '2f', '2m', '2b']) {
                for (const cardId of gs.rows[rowId]?.cardIds || []) {
                    const owner = parseInt(cardId[0]);
                    const card = gs.playerCards[`player${owner}cards`]?.cards?.[cardId];
                    if (!card || (card.health || 0) > 0) continue;
                    dispatch({
                        type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
                        payload: { cardId },
                    });
                }
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [screen, gameState.rows, gameState.playerCards]);

    /**
     * Fold a spent deck's graveyard back into the deck. Un-drawing the heroes
     * returns them to the draw pool, and since draws already pick at random from
     * that pool, that is the shuffle.
     */
    const reshuffleGraveyardIntoDeck = (playerNum) => {
        const grave = gameStateRef.current.graveyards?.[`player${playerNum}`] || [];
        const heroIds = graveyardHeroIds(grave);
        if (heroIds.length === 0) return 0;

        setGameLogic((prev) => ({
            ...prev,
            [`player${playerNum}DrawnHeroes`]: prev[`player${playerNum}DrawnHeroes`]
                .filter((heroId) => !heroIds.includes(heroId)),
        }));
        dispatch({ type: ACTIONS.CLEAR_GRAVEYARD, payload: { playerNum } });
        console.log(`Player ${playerNum}: reshuffled ${heroIds.length} cards from graveyard into deck`);
        return heroIds.length;
    };
    reshuffleGraveyardIntoDeckRef.current = reshuffleGraveyardIntoDeck;

    // Opening deal: initiating VO (first match), round announcer, then each
    // player shuffles and draws one role at a time so the hands fill 1-by-1.
    const initializeGame = async ({ includeInitiating = true, round = 1 } = {}) => {
        openingDealRef.current = true;
        theaterLockedRef.current = true;
        setTheaterLocked(true);
        setShufflingPlayer(null);

        console.log('Initializing new round - shuffling deck and dealing cards...');

        // Seeded with what each player has already drawn this match, so the
        // opening deal of round 2 cannot hand out a hero they are still holding
        // or one already in their graveyard.
        const drawn = {
            1: [...(gameLogicRef.current?.player1DrawnHeroes || [])],
            2: [...(gameLogicRef.current?.player2DrawnHeroes || [])],
        };
        window.__ow_reshuffleBag = { player1: [], player2: [] };
        window.__ow_drawQueue = { player1: [], player2: [] };
        window.__ow_seeker = null;
        window.__ow_sandstorm = null;
        dispatch({ type: ACTIONS.CLEAR_REDEPLOY_LOCKS });

        const heroesByRole = {
            offense: getHeroesByRole('offense'),
            tank: getHeroesByRole('tank'),
            support: getHeroesByRole('support'),
            defense: getHeroesByRole('defense'),
        };
        const allHeroIds = Object.keys(data.heroes).filter((id) => !data.heroes[id].special);
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const dealOne = (playerNum, role) => {
            const heroId = pickHeroFromRole(role, drawn[playerNum], heroesByRole, allHeroIds);
            if (!heroId) return;
            drawn[playerNum].push(heroId);
            dispatch({
                type: ACTIONS.CREATE_CARD,
                payload: { playerNum, heroId },
            });
            dispatch({
                type: ACTIONS.ADD_CARD_TO_HAND,
                payload: { playerNum, playerHeroId: `${playerNum}${heroId}` },
            });
            trackDrawnHero(heroId, playerNum);
        };

        const beats = openingDealBeats({
            round,
            includeInitiating,
            firstPlayer: turnStateRef.current.playerTurn,
        });
        const dealGeneration = ++openingDealGenerationRef.current;
        // Flush shuffle into the DOM and wait a frame before the timed hold,
        // otherwise React can commit the first draw in the same paint as the
        // overlay and the card lands before the shuffle animation is seen.
        const ensurePainted = () => new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
        await runOpeningDealBeats(beats, {
            shouldAbort: () => dealGeneration !== openingDealGenerationRef.current,
            playAudio: (beat) => playClip(beat.key, {
                awaitEnd: !!beat.awaitEnd,
                fallbackMs: beat.fallbackMs || 800,
            }),
            wait,
            ensurePainted,
            onShuffle: (playerNum) => {
                flushSync(() => {
                    setShufflingPlayer(playerNum);
                });
                playClip('cardshuffle');
            },
            onDraw: (playerNum, role) => {
                flushSync(() => {
                    setShufflingPlayer(null);
                });
                dealOne(playerNum, role);
            },
        });

        setShufflingPlayer(null);
        openingDealRef.current = false;
        theaterLockedRef.current = false;
        setTheaterLocked(!!directorRef.current?.isLocked());

        const ts = turnStateRef.current;
        if (ts.playerTurn === 2 && !ts.player2Passed) {
            window.__ow_lastAITrigger = { turn: ts.turnCount };
            setTimeout(() => {
                handleAITurn();
            }, 100);
        }
    };

    // Leave the menu and open the first round. Cards are dealt after the map
    // title card fades, so the AI never takes a turn behind the home screen
    // and the map announcer does not overlap initiating/round VO.
    const startMatch = (mode = MATCH_MODE.VERSUS_AI) => {
        setMatchMode(mode);
        // Set synchronously: module-scope guards read this before the next render.
        window.__ow_practiceMode = isPractice(mode);
        setBattlefieldMap(pickBattlefieldMap());
        setShowMapTitle(true);
        // Lock before the title finishes — otherwise an AI-first seat can take a
        // full turn (and force a human turn-2 draw) with no shuffle yet.
        openingDealRef.current = true;
        theaterLockedRef.current = true;
        setTheaterLocked(true);
        matchStartedRef.current = false;
        window.__ow_lastAITrigger = null;
        window.__ow_lastDraw = null;
        setTurnState({
            turnCount: 1,
            playerTurn: isPractice(mode) ? 1 : getRandInt(1, 3),
            player1Passed: false,
            player2Passed: false,
        });
        setScreen(SCREENS.MATCH);
    };

    const beginOpeningDeal = () => {
        if (matchStartedRef.current) return;
        matchStartedRef.current = true;
        // Buffer the clips that fire every turn, so the first draw of a match
        // does not arrive later than the rest, and the card faces the AI's
        // face-down hand would otherwise fetch only as each card lands.
        warmGameEventAudio();
        preloadHeroCardImages();
        // Practice starts empty; you add exactly the cards you want to test.
        if (!isPractice(matchMode)) {
            initializeGame({ includeInitiating: true, round: 1 });
        } else {
            openingDealRef.current = false;
            theaterLockedRef.current = false;
            setTheaterLocked(false);
        }
    };

    const handleMapTitleComplete = () => {
        setShowMapTitle(false);
        beginOpeningDeal();
    };

    // Warm assets when the match shell opens; deal waits on the title card.
    useEffect(() => {
        if (screen !== SCREENS.MATCH) return;
        warmGameEventAudio();
        preloadHeroCardImages();
        // No map splash (or already dismissed): deal immediately.
        if (!showMapTitle && !matchStartedRef.current) beginOpeningDeal();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    const commitPlayCard = (intent) => {
        const { cardId, startRowId, finishRowId, slotIndex, playerNum } = intent;
        const gs = gameStateRef.current;
        const ts = turnStateRef.current;
        const startIds = (gs.rows[startRowId]?.cardIds || []).filter(Boolean);
        const startIndex = startIds.indexOf(cardId);
        if (startIndex === -1) return;

        dispatch({
            type: ACTIONS.MOVE_CARD,
            payload: {
                targetCardId: cardId,
                startRowId,
                finishRowId,
                startIndex,
                finishIndex: slotIndex,
            },
        });

        playClip('placement');

        if (isDeployFromHand(startRowId)) {
            const card = gs.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
            const lane = finishRowId[1];
            // Mantis Cloak: synergy banks on the owner's opposite (same-lane) row.
            const synergyRowId = (cardId.slice(1) === 'mantis' && finishRowId[0] !== String(playerNum))
                ? `${playerNum}${lane}`
                : finishRowId;
            const addSynergy = card?.synergy?.[lane] || 0;
            dispatch({
                type: ACTIONS.UPDATE_SYNERGY,
                payload: { rowId: synergyRowId, synergyCost: addSynergy },
            });
            dispatch({
                type: ACTIONS.EDIT_CARD,
                payload: {
                    playerNum,
                    targetCardId: cardId,
                    editKeys: ['isPlayed', 'enteredTurn', 'synergy'],
                    editValues: [true, ts.turnCount, { f: 0, m: 0, b: 0 }],
                },
            });
            dispatch({
                type: ACTIONS.UPDATE_ROW,
                payload: {
                    targetRow: `player${playerNum}hand`,
                    updateKeys: ['cardsPlayed'],
                    updateValues: [1],
                },
            });
            checkOnEnterAbilities(cardId, finishRowId, playerNum);
            // Cloak trip: another hero entered a row that already held cloaked Mantis.
            try {
                abilitiesIndex.mantis?.onRowIntrusion?.({
                    entrantCardId: cardId,
                    rowId: finishRowId,
                });
            } catch (e) {
                console.error('Mantis cloak trip failed', e);
            }
        } else {
            // Board moves can also trip Cloak.
            try {
                abilitiesIndex.mantis?.onRowIntrusion?.({
                    entrantCardId: cardId,
                    rowId: finishRowId,
                });
            } catch (e) {
                console.error('Mantis cloak trip failed', e);
            }
        }
    };

    const verdictForDeploy = (cardId, startRowId, finishRowId, requestedIndex) => {
        const gs = gameStateRef.current;
        return canDeployFromHand({
            playerTurn: turnStateRef.current.playerTurn,
            turnCount: turnStateRef.current.turnCount,
            startRowId,
            finishRowId,
            cardId,
            rows: gs.rows,
            getCard: (id) => gs.playerCards[`player${id[0]}cards`]?.cards?.[id],
            requestedIndex,
        });
    };

    const enqueuePlayCard = (intent) => {
        const director = directorRef.current;
        if (!director) return false;
        const result = director.enqueue(intent);
        setTheaterLocked(director.isLocked());
        if (result && typeof result.then === 'function') {
            result.finally(() => setTheaterLocked(director.isLocked()));
        }
        return result;
    };

    useEffect(() => {
        if (screen !== SCREENS.MATCH) return undefined;
        const director = createDirector({
            animatePlay: (intent) => pixiBoardRef.current?.flyToSlot?.(intent) ?? Promise.resolve(),
            commitPlay: (intent) => commitPlayCard(intent),
            watchdogMs: 8000,
        });
        directorRef.current = director;
        window.__ow_enqueuePlayCard = (intent) => enqueuePlayCard(intent);
        window.__ow_isTheaterLocked = () => director.isLocked();
        window.__ow_flyToDeck = (cardId) => pixiBoardRef.current?.flyToDeck?.(cardId) ?? Promise.resolve();
        return () => {
            director.destroy();
            directorRef.current = null;
            window.__ow_enqueuePlayCard = undefined;
            window.__ow_isTheaterLocked = undefined;
            window.__ow_flyToDeck = undefined;
            setTheaterLocked(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    // Initialize AI integration (once), then keep settings and state in sync without re-initializing
    useEffect(() => {
        aiIntegration.initialize(gameState, handleAIEndTurn);
        aiIntegration.setAISettings(aiPersonality);
        
        // Expose AI integration to window for special card handling
        window.__ow_aiIntegration = aiIntegration;
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aiIntegration]);

    // Keep AI settings in sync
    useEffect(() => {
        aiIntegration.setAISettings(aiPersonality);
    }, [aiIntegration, aiPersonality]);

    // Keep AI game state reference in sync without reinitializing
    useEffect(() => {
        aiIntegration.gameState = gameState;
    }, [aiIntegration, gameState]);

    // Track deployment counts
    useEffect(() => {
        const occupied = (rowId) => occupiedCount(gameState.rows[rowId]?.cardIds);
        const player1Deployed = occupied('1f') + occupied('1m') + occupied('1b');
        const player2Deployed = occupied('2f') + occupied('2m') + occupied('2b');

        setGameLogic(prev => ({
            ...prev,
            player1Deployed,
            player2Deployed
        }));
    }, [gameState.rows]);

    // Handle AI turns and track turn counts
    useEffect(() => {
        // Handle AI turn for Player 2 (including first turn of new rounds)
        const currentPlayer = turnState.playerTurn;

        if (screen !== SCREENS.MATCH) return;
        if (isPractice(matchMode)) return; // sandbox: the human plays both sides
        if (shouldBlockPreDealActions({
            openingDeal: openingDealRef.current,
            theaterLocked: theaterLockedRef.current,
            showMapTitle,
        })) return;

        if (currentPlayer === 2 && !turnState.player2Passed && !isAIThinking) {
            // Prevent multiple AI triggers within the same Player 2 turn
            if (!window.__ow_lastAITrigger || window.__ow_lastAITrigger.turn !== turnState.turnCount) {
                window.__ow_lastAITrigger = { turn: turnState.turnCount };
                console.log(`AI turn detected - Player 2 turn ${turnState.turnCount}`);
                setTimeout(() => {
                    handleAITurn();
                }, 100);
            }
        }
    }, [screen, matchMode, turnState.turnCount, turnState.playerTurn, turnState.player2Passed, isAIThinking, showMapTitle]);

    // Note: AI turn detection is now handled in the main useEffect above

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

    // Always-mounted damage subscriber: single writer for health and shields
    useEffect(() => {
        const unsub = subscribeDamage((event) => {
            if (event?.type !== 'damage') return;
            const { targetCardId, targetRow, amount, ignoreShields } = event;
            try {
                const gs = gameStateRef.current;
                const targetPlayerNum = parseInt(targetCardId[0]);
                const targetCards = gs.playerCards[`player${targetPlayerNum}cards`].cards;
                if (!targetCards || !targetCards[targetCardId]) return;

                const result = applyDefenderDamage({
                    amount,
                    ignoreShields: !!ignoreShields,
                    health: targetCards[targetCardId].health || 0,
                    armor: targetCards[targetCardId].armor || 0,
                    cardShield: targetCards[targetCardId].shield || 0,
                    rowShields: gs.rows[targetRow]?.shield || [],
                });

                if (result.rowShieldDamage > 0) {
                    dispatch({
                        type: ACTIONS.DAMAGE_ROW_SHIELD,
                        payload: { targetRow, rowShieldDamage: result.rowShieldDamage },
                    });
                }
                if ((targetCards[targetCardId].shield || 0) !== result.cardShield) {
                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: { playerNum: targetPlayerNum, targetCardId, editKeys: ['shield'], editValues: [result.cardShield] },
                    });
                }
                if ((targetCards[targetCardId].armor || 0) !== result.armor) {
                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: { playerNum: targetPlayerNum, targetCardId, editKeys: ['armor'], editValues: [result.armor] },
                    });
                }
                if ((targetCards[targetCardId].health || 0) !== result.health) {
                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: { playerNum: targetPlayerNum, targetCardId, editKeys: ['health'], editValues: [result.health] },
                    });
                }
                if (result.died) {
                    const heroId = targetCardId.slice(1);
                    if (abilitiesIndex[heroId]?.onDeath) {
                        try {
                            abilitiesIndex[heroId].onDeath({ playerHeroId: targetCardId, rowId: targetRow });
                        } catch (error) {
                            console.error(`Error in ${heroId} onDeath:`, error);
                        }
                    }
                    try { setTimeout(() => recomputeAnaTokens(), 0); } catch {}
                    // Bury after onDeath so handlers that transform the dying card
                    // (D.Va ejecting from MEKA) commit first. Re-checked on the next
                    // tick because an onDeath or revive may have brought it back.
                    setTimeout(() => {
                        const latest = gameStateRef.current
                            .playerCards[`player${targetPlayerNum}cards`]?.cards?.[targetCardId];
                        if (!latest || (latest.health || 0) > 0) return;
                        dispatch({
                            type: ACTIONS.MOVE_CARD_TO_GRAVEYARD,
                            payload: { cardId: targetCardId },
                        });
                    }, 0);
                }
            } catch (e) {
                console.error('Damage apply failed', e);
            }
        });
        return unsub;
    }, []);


    // Subscribe to action requests
    useEffect(() => {
        const unsubscribe = subscribeToActions(async (action) => {
            if (action.type === 'request:ultimate') {
                console.log(`>>> ULTIMATE ACTION RECEIVED <<<`);
                console.log(`Action payload:`, action.payload);

                const { playerHeroId, rowId, cost } = action.payload;

                if (!playerHeroId) {
                    console.error("ULTIMATE ERROR: playerHeroId is undefined!", action.payload);
                    return;
                }
                const gs = gameStateRef.current;
                const currentSynergy = gs.rows[rowId]?.synergy || 0;
                const playerNum = parseInt(playerHeroId[0]);
                const heroId = playerHeroId.slice(1);
                const enteredTurn = gs.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId]?.enteredTurn;

                console.log(`Hero: ${heroId}, Player: ${playerNum}, Row: ${rowId}`);
                console.log(`Current Synergy: ${currentSynergy}, Required Cost: ${cost}`);
                console.log(`AI Triggering: ${window.__ow_aiTriggering}`);

                // Prevent Player 2 from manually using ultimates (AI controls Player 2)
                // UNLESS the request is coming from the AI itself
                if (playerNum === 2 && !window.__ow_aiTriggering && !manualPlayerTwo()) {
                    console.log(`>>> BLOCKED: Player 2 manual ultimate prevented`);
                    showToast('Player 2 is controlled by AI - no manual actions allowed');
                    setTimeout(() => clearToast(), 2000);
                    return;
                }

                // Block ultimates on the same turn a hero entered play
                if (enteredTurn === turnStateRef.current.turnCount) {
                    console.log('Ultimate blocked: hero entered play this turn.');
                    return;
                }

                // Base cost override (BOB = 1)
                // Row surcharges — BOB's suppression, Mei's Blizzard — all in
                // one pure rule, so the order they apply in is written down
                // once rather than re-derived at each call site.
                let adjustedCost = cost;
                try {
                    adjustedCost = rowUltimateCost(adjustedCost, gs.rows[rowId]?.enemyEffects);
                } catch {}

                if (currentSynergy >= adjustedCost) {
                    // Check if hero has already used ultimate this round
                    const playerKey = `player${playerNum}`;
                    if (gs.ultimateUsage[playerKey]?.includes(heroId)) {
                        console.log(`Ultimate blocked: ${heroId} has already used ultimate this round.`);
                        showToast(`${heroId} has already used their ultimate this round!`);
                        setTimeout(() => clearToast(), 2000);
                        return;
                    }

                    const caster = gs.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
                    if (isDisoriented(caster)) {
                        showToast('Disoriented');
                        setTimeout(() => clearToast(), 2000);
                        return;
                    }

                    const fn = abilitiesIndex[heroId]?.onUltimate;
                    let result = true;
                    try {
                        if (fn) {
                            result = await withAbilitySource(playerHeroId, () => fn({ playerHeroId, rowId, cost: adjustedCost }));
                        } else {
                            console.log(`Executing ultimate for ${playerHeroId} in ${rowId} (cost: ${adjustedCost})`);
                        }
                    } catch (e) {
                        console.log(`Error executing ${heroId} ultimate:`, e);
                        result = false;
                    }

                    if (result === false) {
                        console.log(`Ultimate aborted for ${heroId}; not charging synergy`);
                        window.__ow_aiTriggering = false;
                        window.__ow_aiUltimateTarget = null;
                        return;
                    }

                    dispatch({
                        type: ACTIONS.MARK_ULTIMATE_USED,
                        payload: { playerNum, heroId }
                    });
                    dispatch({
                        type: ACTIONS.DEDUCT_SYNERGY,
                        payload: { rowId, synergyCost: adjustedCost }
                    });

                    const heroName = data.heroes[heroId]?.name || heroId;
                    const abilityName = (data.heroes[heroId]?.ultimate || 'Ultimate').split('(')[0].trim();
                    window.__ow_trackUltimateUsed?.(heroId, heroName, abilityName, playerNum, rowId, adjustedCost);

                    if (abilitiesIndex?.wreckingball?.checkMinefieldTrigger) {
                        abilitiesIndex.wreckingball.checkMinefieldTrigger(playerHeroId, rowId);
                    }

                    window.__ow_aiTriggering = false;
                    window.__ow_aiUltimateTarget = null;
                } else {
                    console.log(`Insufficient synergy for ultimate. Need ${adjustedCost}, have ${currentSynergy}`);
                }
            } else if (action.type === 'request:transform') {
                const { playerHeroId } = action.payload;
                const playerNum = parseInt(playerHeroId[0]);
                const heroId = playerHeroId.slice(1);
                if (heroId !== 'ramattra') return;

                const gs = gameStateRef.current;
                const rowId = findCardRowId(playerHeroId, (rid) => gs.rows[rid]?.cardIds);
                if (!rowId) {
                    showToast('Ramattra must be on the board to transform');
                    setTimeout(() => clearToast(), 1500);
                    return;
                }

                const card = gs.playerCards[`player${playerNum}cards`]?.cards?.[playerHeroId];
                if (!card || card.health <= 0) {
                    showToast('Ramattra cannot transform');
                    setTimeout(() => clearToast(), 1500);
                    return;
                }
                if (card.enteredTurn === turnStateRef.current.turnCount) {
                    showToast('Ramattra cannot transform the turn he enters');
                    setTimeout(() => clearToast(), 1500);
                    return;
                }

                abilitiesIndex.ramattra.transformToNemesis(playerNum, playerHeroId, rowId);
            }
        });
        return unsubscribe;
    }, []);

    // End the round, calculate who won, update score and move to next round
    const endRound = () => {
        matchRef.current = {
            player1: { wins: matchState.player1.wins },
            player2: { wins: matchState.player2.wins },
            wonLastRound: matchState.wonLastRound,
        };
            const totalPower1 = gameState.rows.player1hand.totalPower();
            const totalPower2 = gameState.rows.player2hand.totalPower();
            const synergy1 = totalRowSynergy(gameState.rows, 1);
            const synergy2 = totalRowSynergy(gameState.rows, 2);
            const winningPlayer = decideRoundWinner(totalPower1, totalPower2, synergy1, synergy2);

            console.log(`Round End - P1: ${totalPower1} power, ${synergy1} synergy`);
            console.log(`Round End - P2: ${totalPower2} power, ${synergy2} synergy`);

            // Winner of the last round opens the next. A draw randomizes.
            setTurnState({
                turnCount: 1,
                playerTurn: nextRoundFirstPlayer(winningPlayer),
                player1Passed: false,
                player2Passed: false,
            });

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
                // Drawn heroes deliberately survive the round. Wiping them put
                // every hero back in the deck, so one already sitting in hand
                // could be dealt a second time — two copies of the same card —
                // and the buried came back out of the graveyard. One copy per
                // hero, per match.
            }));

            // Check if game is over (best 2 of 3)
            const player1Wins = matchRef.current.player1.wins;
            const player2Wins = matchRef.current.player2.wins;
            
            const matchOver = player1Wins >= 2 || player2Wins >= 2 || gameLogic.currentRound >= gameLogic.maxRounds;
            const announceMatchResult = (winner) => {
                const key = matchResultAnnouncerKey(winner);
                if (key) playClip(key);
            };
            if (player1Wins >= 2 || player2Wins >= 2) {
                const gameWinner = player1Wins >= 2 ? 1 : 2;
                announceMatchResult(gameWinner);
                alert(`Game Over! Player ${gameWinner} wins the match!`);
                setGameLogic(prev => ({ ...prev, gamePhase: 'gameEnd' }));
            } else if (gameLogic.currentRound >= gameLogic.maxRounds) {
                if (player1Wins > player2Wins) {
                    announceMatchResult(1);
                    alert(`Game Over! Player 1 wins the match!`);
                } else if (player2Wins > player1Wins) {
                    announceMatchResult(2);
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

            // Hands do not carry between rounds. Sweep every leftover card so
            // the next opening deal starts at 4 for the first player and 5 for
            // the second — not stacked on whatever was still held.
            const discardEntireHand = (playerNum) => {
                const handId = `player${playerNum}hand`;
                const handCards = handCardIdsToDiscard(gameState.rows[handId]?.cardIds);
                for (const pid of handCards) {
                    dispatch({
                        type: ACTIONS.DISCARD_CARD,
                        payload: { playerNum, targetCardId: pid, targetCardRow: handId },
                    });
                }
            };
            discardEntireHand(1);
            discardEntireHand(2);

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

            // A round cannot end with D.Va still in the MEKA. Runs after the
            // board sweep above so the MEKA is out of its row before its card
            // is dropped.
            dispatch({ type: ACTIONS.STAND_DOWN_DVA, payload: { playerNum: 1 } });
            dispatch({ type: ACTIONS.STAND_DOWN_DVA, payload: { playerNum: 2 } });

            // Set new match state using the ref that was mutated
            setMatchState(matchRef.current);

            // CRITICAL: Reset AI state for new round
            console.log('Resetting AI state for new round...');
            
            // Clear all AI context flags. __ow_isAITurn is not among them: it
            // is derived from whose turn it is, and the round's new turn state
            // re-asserts it.
            window.__ow_aiTriggering = false;
            window.__ow_currentAICardId = null;
            window.__ow_currentAIHero = null;
            window.__ow_currentAIAbility = null;
            window.__ow_aiActionsThisTurn = 0;
            window.__ow_lastAITrigger = null; // Reset AI trigger tracking for new round
            
            // Reset AI integration state
            if (window.__ow_aiIntegration) {
                window.__ow_aiIntegration.isAITurn = false;
                window.__ow_aiIntegration.cardsPlayedThisTurn = 0;
                // Re-initialize AI with fresh game state
                window.__ow_aiIntegration.initialize(gameState, handleAIEndTurn);
                window.__ow_aiIntegration.setAISettings(aiPersonality);
                console.log('AI integration re-initialized for new round');
            }

            // Fresh 4 / 5 opening deal for the next round (if the match continues).
            if (!matchOver) {
                openingDealRef.current = true;
                theaterLockedRef.current = true;
                setTheaterLocked(true);
                setTimeout(() => {
                    // Show round start notification
                    const newRound = gameLogic.currentRound + 1;
                    showToast(`Round ${newRound} starting - cards shuffled and dealt!`);
                    setTimeout(() => clearToast(), 3000);
                    
                    initializeGame({ includeInitiating: false, round: newRound });
                    // Ensure AI is ready for the new round
                    if (window.__ow_aiIntegration) {
                        // Update AI with fresh game state after cards are dealt
                        setTimeout(() => {
                            window.__ow_aiIntegration.gameState = gameState;
                            console.log('AI game state updated for new round');
                        }, 100);
                    }
                }, 1000); // Delay to allow alerts to show
            }
        };

    // End the round and update match scores when both players have passed their turn OR when turn limit is reached
    useEffect(() => {
        // When both players pass, end the round and move to the next round
        if (
            turnState.player1Passed === true &&
            turnState.player2Passed === true
        ) {
            endRound();
        }
        
        // Also end the round if we've reached the turn limit (18 turns total)
        if (turnState.turnCount > 18) {
            console.log(`Turn limit reached (${turnState.turnCount}), ending round automatically`);
            endRound();
        }
    }, [turnState, gameState.rows, matchState]);

    function handleOnDragStart(result) {
        document.getElementById(`${result.source.droppableId}-list`)?.classList.toggle('is-drag-origin');
    }

    function handleOnDragEnd(result) {
        const { destination, source, draggableId } = result;
        document.getElementById(`${result.source.droppableId}-list`)?.classList.toggle('is-drag-origin');
        if (!destination) return;
        if (openingDealRef.current || theaterLockedRef.current) return;
        if (directorRef.current?.isLocked()) return;
        if (turnStateRef.current.playerTurn === 2 && !manualPlayerTwo()) {
            showToast('Player 2 is controlled by AI - no manual actions allowed');
            setTimeout(() => clearToast(), 2000);
            return;
        }
        const startRowId = source.droppableId;
        const finishRowId = destination.droppableId;
        if (startRowId === finishRowId && source.index === destination.index) return;

        if (isDeployFromHand(startRowId)) {
            const verdict = verdictForDeploy(draggableId, startRowId, finishRowId, destination.index);
            if (!verdict.ok) return;
            enqueuePlayCard(playCardIntent({
                cardId: draggableId,
                startRowId,
                finishRowId,
                slotIndex: verdict.slotIndex,
                playerNum: parseInt(draggableId[0], 10) || 1,
            }));
            return;
        }

        if (finishRowId[0] !== 'p' && parseInt(finishRowId[0], 10) === turnStateRef.current.playerTurn) {
            dispatch({
                type: ACTIONS.MOVE_CARD,
                payload: {
                    targetCardId: draggableId,
                    startRowId,
                    finishRowId,
                    startIndex: source.index,
                    finishIndex: destination.index,
                },
            });
        }
    }

    // Expose current player and turn to window for AI wrappers
    useEffect(() => {
        window.__ow_getPlayerTurn = () => turnState.playerTurn;
        window.__ow_getTurnCount = () => turnState.turnCount;
        // Derived from the turn, not set and cleared by the AI's own call
        // stack. Dozens of hero modules branch on this flag to decide whether
        // to pick their own targets; when the AI cleared it early — its loop
        // returns 1.5s before the turn ends — those heroes fell through to the
        // human prompt mid-way through the AI's turn.
        window.__ow_isAITurn = aiOwnsDecision({
            playerTurn: turnState.playerTurn,
            practiceMode: !!window.__ow_practiceMode,
        });
    }, [turnState.playerTurn, turnState.turnCount]);

    // Every hook above runs on both screens, so this branch keeps hook order stable.
    if (screen === SCREENS.MENU) {
        return (
            <HomeScreen
                onStartMatch={startMatch}
                matchModes={MATCH_MODE}
                aiPersonality={aiPersonality}
                onPersonalityChange={setAiPersonality}
                playAudio={playAudio}
                setPlayAudio={setPlayAudio}
            />
        );
    }

    return (
        <div id='page-wrapper'>
            {battlefieldMap && (
                <div
                    className="match-map-layer"
                    style={{
                        backgroundImage: `url(${battlefieldMap.image})`,
                        opacity: BATTLEFIELD_MAP_OPACITY,
                    }}
                    aria-hidden="true"
                />
            )}
            {showMapTitle && battlefieldMap && (
                <MatchMapTitleCard
                    map={battlefieldMap}
                    onComplete={handleMapTitleComplete}
                />
            )}
            {/*
              * No title bar, difficulty chip, tutorial or disclaimer in a match:
              * they cost two full strips of vertical space and none of them are
              * needed once play has started. Difficulty, audio, the rules and
              * the attribution all live on the main menu.
              *
              * What stays is the AI decision readout — that is live feedback
              * about the game, not chrome.
              */}
            <div className="ai-controls">
                <AIDecisionDisplay
                    decision={aiDecision}
                    isVisible={isAIThinking || aiDecision}
                />
            </div>
            
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
                                reshuffleGraveyardIntoDeck={reshuffleGraveyardIntoDeck}
                                practiceMode={isPractice(matchMode)}
                                theaterLocked={theaterLocked}
                                shufflingPlayer={shufflingPlayer}
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
                                reshuffleGraveyardIntoDeck={reshuffleGraveyardIntoDeck}
                                practiceMode={isPractice(matchMode)}
                                theaterLocked={theaterLocked}
                                shufflingPlayer={shufflingPlayer}
                            />
                        </DragDropContext>
                        {isPractice(matchMode) && <PracticePanel />}
                        <TurnEffectsRunner />
                    </gameContext.Provider>
                </turnContext.Provider>
            </div>
            <PixiBoard ref={pixiBoardRef} />
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

            {modalState.type === 'reorder' && (
                <ReorderModal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    title={modalState.data?.title || 'Temporal Rift'}
                    heroName={modalState.data?.heroName || 'Vega'}
                    heroIds={modalState.data?.heroIds || []}
                    images={modalState.data?.images || {}}
                    onConfirm={(ids) => {
                        const cb = modalState.data?.onConfirm;
                        if (typeof cb === 'function') cb(ids);
                        closeModal();
                    }}
                />
            )}
        </div>
    );
}
