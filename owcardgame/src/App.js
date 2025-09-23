import React, { useState, useReducer, useEffect, useRef } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import { DragDropContext } from 'react-beautiful-dnd';
import './App.css';
import PlayerHalf from 'components/layout/PlayerHalf';
import TitleCard from 'components/layout/TitleCard';
import Footer from 'components/layout/Footer';
import CardFocus from 'components/cards/CardFocus';
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
    UPDATE_ROW: 'update-row',
    UPDATE_SYNERGY: 'update-synergy',
    DEDUCT_SYNERGY: 'deduct-synergy',
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

        default:
            return gameState;
    }
}

// Check for onEnter abilities when a hero is deployed
function checkOnEnterAbilities(playerHeroId, rowId, playerNum) {
    const heroId = playerHeroId.slice(1);
    const heroData = data.heroes[heroId];
    
    // Special-case: Ashe onEnter choice (since data.js doesn't carry onEnter1/2)
    if (heroId === 'ashe') {
        const onEnter1 = { name: 'The Viper', description: 'Deal 2 damage to one enemy ignoring shields.' };
        const onEnter2 = { name: 'The Viper (Split Fire)', description: 'Deal 1 damage to two enemies in the same row ignoring shields.' };
        showOnEnterChoice('Ashe', onEnter1, onEnter2, (choiceIndex) => {
            if (choiceIndex === 0) {
                // 2 damage ignoring shields to one enemy
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
                        if (selected[0].targetRow !== targetRow) return;
                        selected.push({ targetCardId, targetRow });
                        $('.card').off('click', handler);
                        applyAsheDamage(selected[0].targetCardId, selected[0].targetRow, 1, true);
                        applyAsheDamage(selected[1].targetCardId, selected[1].targetRow, 1, true);
                    }
                };
                $('.card').on('click', handler);
            }
        });
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

    // References for setting state inside useEffects
    let matchRef = useRef(null);

    // Subscribe to modal state changes
    useEffect(() => {
        const unsubscribe = subscribeToModal((newModalState) => {
            setModalState(newModalState);
        });
        return unsubscribe;
    }, []);

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

                if (currentSynergy >= cost) {
                    // Deduct synergy and execute ultimate
                    dispatch({
                        type: ACTIONS.DEDUCT_SYNERGY,
                        payload: { rowId, synergyCost: cost }
                    });
                    
                    // Execute ultimate ability (placeholder)
                    console.log(`Executing ultimate for ${playerHeroId} in ${rowId} (cost: ${cost})`);
                } else {
                    console.log(`Insufficient synergy for ultimate. Need ${cost}, have ${currentSynergy}`);
                }
            } else if (action.type === 'request:transform') {
                const { playerHeroId } = action.payload;
                console.log(`Transform requested for ${playerHeroId}`);
                // TODO: Implement transform logic
            }
        });
        return unsubscribe;
    }, [gameState.rows]);

    // End the round and update match scores when both players have passed their turn
    useEffect(() => {
        // Set ref to current match state, alter ref within endRound(), then call setMatchState once using ref as new state
        matchRef.current = matchState;

        // End the round, calculate who won, update score and move to next round
        const endRound = () => {
            // Get power data
            const totalPower1 = gameState.rows.player1hand.totalPower();
            const totalPower2 = gameState.rows.player2hand.totalPower();

            // Get player rows info
            const player1Rows = [
                gameState.rows['1b'],
                gameState.rows['1m'],
                gameState.rows['1f'],
            ];
            const player2Rows = [
                gameState.rows['2b'],
                gameState.rows['2m'],
                gameState.rows['2f'],
            ];

            // Calculate winning player
            let winningPlayer = 0;

            if (totalPower1 > totalPower2) winningPlayer = 1;
            else if (totalPower2 > totalPower1) winningPlayer = 2;
            // If power is tied, remaining synergy decides the winner
            else if (totalPower1 === totalPower2) {
                let player1Synergy = 0;
                let player2Synergy = 0;

                for (let row of player1Rows) {
                    player1Synergy += row.synergy;
                }
                for (let row of player2Rows) {
                    player2Synergy += row.synergy;
                }

                if (player1Synergy > player2Synergy) winningPlayer = 1;
                else if (player2Synergy > player1Synergy) winningPlayer = 2;
                // If remaining synergy is also tied, it is a draw, denoted by setting player 3 as the winner
                else winningPlayer = 3;
            }

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

            // Update match state
            // Update state if round is a draw
            if (winningPlayer === 3) {
                alert('Round is a draw! Neither player receives a win.');

                // Update state for whichever player won
            } else {
                // Add a win to winner's record
                matchRef.current[`player${winningPlayer}`].wins += 1;
                matchRef.current.wonLastRound = winningPlayer;
                alert(`Player ${winningPlayer} wins the round!`);
            }

            // Discard all cards
            // Set ids of rows to be reset
            const player1RowIds = ['1b', '1m', '1f'];
            const player2RowIds = ['2b', '2m', '2f'];

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

            // TODO: create a play again button
            // If a player has reached two wins, end the match and reload the page for a new match
            if (matchState['player1'].wins === 2) {
                alert('Player 1 wins the match!');
                alert('Starting a new match.');
                window.location.reload();
            } else if (matchState['player2'].wins === 2) {
                alert('Player 2 wins the match!');
                alert('Starting a new match.');
                window.location.reload();
            }
        };
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
            // If audio is on, play intro audio
            if (playAudio === true) {
                try {
                    const introAudio = new Audio(
                        getAudioFile(`${heroId}-intro`)
                    );
                    introAudio.play();
                } catch (err) {
                    console.log('No intro audio available');
                }
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
                                nextCardDraw={nextCardDraw}
                                setNextCardDraw={setNextCardDraw}
                            />
                            <CenterSection matchState={matchState}></CenterSection>
                            <PlayerHalf
                                playerNum={2}
                                setCardFocus={setCardFocus}
                                nextCardDraw={nextCardDraw}
                                setNextCardDraw={setNextCardDraw}
                            />
                        </DragDropContext>
                        {cardFocus !== null && (
                            <CardFocus
                                setCardFocus={setCardFocus}
                                unsetCardFocus={() => {
                                    setCardFocus('invisible');
                                }}
                                cardFocus={cardFocus}
                                setNextCardDraw={setNextCardDraw}
                                playAudio={playAudio}
                            />
                        )}
                    </gameContext.Provider>
                </turnContext.Provider>
            </div>
            <Tutorial />
            <Footer />
            
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
