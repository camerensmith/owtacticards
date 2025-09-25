/* eslint-disable react-hooks/rules-of-hooks */
import React, { useContext, useEffect, useRef } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import $ from 'jquery';
import { ACTIONS } from 'App';
import { getAudioFile } from '../../assets/imageImports';
import getRandInt from 'helper';
import targetingBus from '../../abilities/engine/targetingBus';
import abilities from '../../abilities';

export default function HeroAbilities(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState } = useContext(turnContext);

    // Variables
    const playerTurn = turnState.playerTurn;
    const enemyPlayerNum = playerTurn === 1 ? 2 : 1;

    const { playerHeroId, unsetCardFocus, rowId, playAudio } = props;
    
    const currentCard =
        gameState.playerCards[`player${playerHeroId?.[0]}cards`]?.cards?.[
            playerHeroId
        ];
    const heroId = playerHeroId.slice(1, playerHeroId.length);

    // ref to keep track of card health during async ability usages
    let targetRef = useRef(null);
    // ref to check if a user clicked end turn - checks current turnstate against refs state
    let turnRef = useRef(turnState);
    // ref to track how many enemies have been hit by a multi-target ability
    let enemiesHitByAbility = useRef(0);
    // ref to track which hero's ability is currently in use
    let currentHeroAbilityRef = useRef(null);

    // TODO: later if implementing more built in controls, such as only allowing
    // TODO: user to affect cards in a specific row, create another ref to track
    // TODO: row target info and reference it during the hero's ability call

    // Ensures targetRef only contains values during ability usage,
    // Reset to empty object when rerendering (i.e. when ability is finished)
    useEffect(() => {
        targetRef.current = {};
    });


    // Applies damage to either shields or health as needed, returning both the shield and health value
    // TODO: currently only damage has its own function that sets state, all other state
    // TODO: is set within the hero's ability
    function applyDamage(
        damageValue,
        targetCardId,
        targetRow,
        ignoreShields = false
    ) {
        console.log('HeroAbilities - applyDamage called:', { damageValue, targetCardId, targetRow, ignoreShields });
        // Interrupt window: allow certain heroes (e.g., Tracer) to Recall before damage is applied
        try {
            const targetPlayerNumInterrupt = parseInt(targetCardId[0]);
            const targetHeroIdInterrupt = targetCardId.slice(1);
            // Only offer interrupt to the owner of the target card on their own hero with an interrupt
            if (targetHeroIdInterrupt === 'tracer') {
                const currentRowSynergy = gameState.rows[targetRow]?.synergy ?? 0;
                const interruptCost = 2; // Tracer Recall cost
                if (currentRowSynergy >= interruptCost) {
                    const wantInterrupt = window.confirm('Tracer can Recall (2 synergy) to avoid this damage. Activate?');
                    if (wantInterrupt) {
                        // Deduct synergy from the target row
                        dispatch({
                            type: ACTIONS.DEDUCT_SYNERGY,
                            payload: { rowId: targetRow, synergyCost: interruptCost },
                        });

                        // Clear counters/effects and set not played
                        dispatch({
                            type: ACTIONS.EDIT_CARD,
                            payload: {
                                playerNum: targetPlayerNumInterrupt,
                                targetCardId: targetCardId,
                                editKeys: ['allyEffects', 'enemyEffects', 'shield', 'isPlayed'],
                                editValues: [[], [], 0, false],
                            },
                        });

                        // Move the card back to owner's hand
                        const targetCardIndex = $(`#${targetCardId}`).closest('li').index();
                        dispatch({
                            type: ACTIONS.MOVE_CARD,
                            payload: {
                                targetCardId: targetCardId,
                                startRowId: targetRow,
                                startIndex: targetCardIndex,
                                finishRowId: `player${targetPlayerNumInterrupt}hand`,
                                finishIndex: 0,
                            },
                        });

                        // Skip applying this instance of damage
                        return { targetShield: 0, targetHealth: gameState.playerCards[`player${targetPlayerNumInterrupt}cards`].cards[targetCardId].health };
                    }
                }
            }
        } catch (e) {
            // Fail-safe: do nothing special if interrupt flow errors
        }

        // Identify target player
        const targetPlayerNum = parseInt(targetCardId[0]);
        const targetPlayerCards =
            gameState.playerCards[`player${targetPlayerNum}cards`].cards;
        const targetHeroId = targetCardId.slice(1, targetCardId.length);

        // Get hero health and shield values
        let targetHealth = targetPlayerCards[targetCardId].health;
        let targetShield = targetPlayerCards[targetCardId].shield;
        let targetRowShield = gameState.rows[targetRow].totalShield();

        // *** EFFECTS ***
        // Check ally and enemy row effects that apply to damage
        const targetRowAllyEffects = gameState.rows[
            targetRow
        ].allyEffects.filter((effect) => effect.type === 'damage');
        const targetRowEnemyEffects = gameState.rows[
            targetRow
        ].enemyEffects.filter((effect) => effect.type === 'damage');

        // Calculate net total of effects on the row
        let totalRowEffect = 0;
        for (let effect of targetRowAllyEffects) {
            totalRowEffect += effect.value;
        }
        for (let effect of targetRowEnemyEffects) {
            totalRowEffect += effect.value;
        }

        // Check ally and enemy card effects
        const targetCardAllyEffects = targetPlayerCards[
            targetCardId
        ].allyEffects.filter((effect) => effect.type === 'damage');
        const targetCardEnemyEffects = targetPlayerCards[
            targetCardId
        ].enemyEffects.filter((effect) => effect.type === 'damage');

        // Calculate net total of card effects
        let totalCardEffect = 0;
        for (let effect of targetCardAllyEffects) {
            totalCardEffect += effect.value;
        }
        for (let effect of targetCardEnemyEffects) {
            totalCardEffect += effect.value;
        }

        // Net total of all damage effects on both row and card
        const totalEffect = totalRowEffect + totalCardEffect;

        // If the enemy hasn't been targeted during the current ability, apply the damage effect
        if (!(targetCardId in targetRef.current)) {
            damageValue += totalEffect;
        }

        // *** UPDATE REF ****
        // If the target has already been targeted during this ability, update with current values
        // Needed because gameState is only updated once the entire ability is finished, so
        // we need useRef in order to keep track of the damaged hero's changing health/shield value
        if (targetCardId in targetRef.current) {
            targetHealth = targetRef.current[targetCardId].health;
            targetShield = targetRef.current[targetCardId].shield;
        } else targetRef.current[targetCardId] = {};

        if (targetRow in targetRef.current) {
            targetRowShield = targetRef.current[targetRow].totalShield;
        } else targetRef.current[targetRow] = {};

        // *** APPLY DAMAGE ***
        // Track how much damage is done to the row's shields so it can be dispatched to state later
        let rowShieldDamage = 0;
        try {
            // Decrement the target's health/shield/rowshield as needed
            for (let i = 0; i < damageValue; i++) {
                // Damage row shield before all else, and update ref
                if (targetRowShield > 0 && ignoreShields === false) {
                    console.log(
                        `damaging row shield ${targetRowShield} with damage ${damageValue}`
                    );

                    targetRowShield -= 1;
                    rowShieldDamage += 1;

                    targetRef.current[targetRow]['totalShield'] =
                        targetRowShield;

                    // Damage hero shield before health, and update ref
                } else if (targetShield > 0 && ignoreShields === false) {
                    targetShield -= 1;

                    // Damage hero health and update ref
                } else if (targetHealth > 0) {
                    targetHealth -= 1;
                } else if (targetHealth === 0) {
                    console.log('target health is 0');
                    // Trigger onDeath for modular heroes
                    const heroId = targetCardId.slice(1);
                    if (abilities[heroId]?.onDeath) {
                        try {
                            abilities[heroId].onDeath({ playerHeroId: targetCardId, rowId: targetRow });
                        } catch (error) {
                            console.error(`Error in ${heroId} onDeath:`, error);
                        }
                    }
                } else {
                    throw new Error(
                        `${targetCardId} is at ${targetHealth} health`
                    );
                }
            }
            targetRef.current[targetCardId]['health'] = targetHealth;
            targetRef.current[targetCardId]['shield'] = targetShield;
        } catch (err) {
            console.log(err);
        }

        // Set the new state (will be done in batch at the end of the ability)
        dispatch({
            type: ACTIONS.DAMAGE_ROW_SHIELD,
            payload: {
                targetRow: targetRow,
                rowShieldDamage: rowShieldDamage,
            },
        });

        dispatch({
            type: ACTIONS.EDIT_CARD,
            payload: {
                playerNum: targetPlayerNum,
                targetCardId: targetCardId,
                editKeys: ['health', 'shield'],
                editValues: [targetHealth, targetShield],
            },
        });

        return;
    }

    function applyHealing(healingValue, targetCardId) {
        const targetPlayerNum = targetCardId[0];
        const targetPlayerCards =
            gameState.playerCards[`player${targetPlayerNum}cards`].cards;

        // Get hero health
        let targetHealth = targetPlayerCards[targetCardId].health;
        const targetMaxHealth = targetPlayerCards[targetCardId].maxHealth;

        if (targetCardId in targetRef.current) {
            targetHealth = targetRef.current[targetCardId].health;
        }

        // Initialise ref if not been used yet during this ability
        targetRef.current[targetCardId] = {};

        // Track amount of healing done
        let healingDone = 0;

        // Increment health value
        if (targetHealth !== 0) {
            for (let i = 0; i < healingValue; i++) {
                if (targetHealth < targetMaxHealth) {
                    targetHealth += 1;
                    healingDone += 1;
                    targetRef.current[targetCardId]['health'] = targetHealth;
                }
            }
            // Set the new state (will be done in batch at the end of the ability)
            dispatch({
                type: ACTIONS.EDIT_CARD,
                payload: {
                    playerNum: targetPlayerNum,
                    targetCardId: targetCardId,
                    editKeys: ['health'],
                    editValues: [targetHealth],
                },
            });
        }

        // Return remaining healing left over for possible later use
        const remainingHealing = healingValue - healingDone;
        return remainingHealing;
    }

    // Subscribe to central damage bus to apply damage uniformly
    // (Local subscription kept simple; ensure unsubscribe on unmount)
    const damageBusRef = useRef(null);
    useEffect(() => {
        try {
            const { subscribe } = require('../../abilities/engine/damageBus');
            damageBusRef.current = subscribe((event) => {
                console.log('HeroAbilities - Received damage event:', event);
                if (event?.type === 'damage') {
                    const { targetCardId, targetRow, amount, ignoreShields } = event;
                    console.log('HeroAbilities - Processing damage:', { targetCardId, targetRow, amount, ignoreShields });
                    applyDamage(amount, targetCardId, targetRow, !!ignoreShields);
                }
            });
        } catch (e) {}
        return () => {
            if (typeof damageBusRef.current === 'function') {
                damageBusRef.current();
            }
        };
    }, []);

    // Abilities data
    const abilities = {
        ana: {
            ability1: {
                audioFile: 'ana-grenade',
                run() {
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const rowPosition = targetRow[1];

                            // Remove the onclick
                            $('.row').off('click');

                            // Check target is valid
                            if (targetRow[0] === 'p') {
                                reject('Incorrect target');
                                return;
                            }

                            const enemyPlayer = playerTurn === 1 ? 2 : 1;
                            const playerRowCardIds =
                                gameState.rows[`${playerTurn}${rowPosition}`]
                                    .cardIds;
                            const enemyPlayerRowCardIds =
                                gameState.rows[`${enemyPlayer}${rowPosition}`]
                                    .cardIds;

                            const damageValue = 1;
                            const healValue = 1;

                            // Heal own player cards
                            for (let cardId of playerRowCardIds) {
                                applyHealing(healValue, cardId);
                            }

                            // Damage enemy cards
                            for (let cardId of enemyPlayerRowCardIds) {
                                applyDamage(
                                    damageValue,
                                    cardId,
                                    `${enemyPlayer}${rowPosition}`
                                );
                            }

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'ana-ult',
                run() {
                    const currentRowAllyNumber =
                        gameState.rows[rowId].cardIds.length;
                    const effectId = 'anaUltimateEffect';

                    // TODO: ensure ana's ultimate can be removed by hack/EMP
                },
            },
            anaUltimateEffect: {},
        },
        ashe: {
            ability1: {
                audioFile: 'ashe-deadlockgang',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Skip if we're in targeting mode
                            if (targetingBus.isTargeting()) {
                                return;
                            }
                            
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 1;
                            applyDamage(
                                damageValue,
                                targetCardId,
                                targetRow,
                                true
                            );

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'ashe-bob',
                run() {
                    // Create bob card
                    dispatch({
                        type: ACTIONS.CREATE_CARD,
                        payload: {
                            playerNum: playerTurn,
                            heroId: 'bob',
                        },
                    });

                    // Add summoned hero to hand
                    dispatch({
                        type: ACTIONS.ADD_CARD_TO_HAND,
                        payload: {
                            playerNum: playerTurn,
                            playerHeroId: `${playerTurn}bob`,
                        },
                    });
                },
            },
        },
        baptiste: {
            ability1: {
                audioFile: 'baptiste-notover',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Skip if we're in targeting mode
                            if (targetingBus.isTargeting()) {
                                return;
                            }
                            
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick from all cards
                            $('.card').off('click');

                            // Check target is valid
                            if (targetCardRow[0] === 'p') {
                                reject('Incorrect target row');
                                return;
                            }

                            // Get adjacent enemy target info
                            const adjacentTarget1 =
                                gameState.rows[targetCardRow].cardIds[
                                    targetCardIndex - 1
                                ];
                            const adjacentTarget2 =
                                gameState.rows[targetCardRow].cardIds[
                                    targetCardIndex + 1
                                ];

                            const targets = [
                                targetCardId,
                                adjacentTarget1,
                                adjacentTarget2,
                            ];

                            // If target is enemy apply damage, if ally apply healing
                            if (parseInt(targetCardId[0]) === playerTurn) {
                                targets.forEach((target) => {
                                    if (target !== undefined)
                                        applyHealing(1, target, targetCardRow);
                                });
                            } else {
                                targets.forEach((target) => {
                                    console.log(`attacking ${target}`);
                                    if (target !== undefined)
                                        applyDamage(1, target, targetCardRow);
                                });
                            }

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'baptiste-immortality',
            },
        },
        bob: {
            ability1: {
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information & remove onclick
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply effect
                            const effectId = 'bobEnemyEffect';
                            const heroId = 'bob';
                            dispatch({
                                type: ACTIONS.ADD_ROW_EFFECT,
                                payload: {
                                    targetRow: targetRow,
                                    playerHeroId: `${playerTurn}${heroId}`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 1,
                maxTargets: 3,
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 1;
                            applyDamage(damageValue, targetCardId, targetRow);

                            // Apply abilities that affect a specific card
                            // Reduce synergy of target row
                            dispatch({
                                type: ACTIONS.UPDATE_SYNERGY,
                                payload: {
                                    rowId: targetRow,
                                    synergyCost: -1,
                                },
                            });

                            resolve('resolved!');
                        });
                    });
                },
            },
        },
        brigitte: {
            ability1: {
                audioFile: 'brigitte-armour',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) !== playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply heal to the target card
                            const healValue = 3;
                            const remainingHealing = applyHealing(
                                healValue,
                                targetCardId
                            );

                            // Apply remaining healing as shield
                            if (remainingHealing > 0) {
                                const shieldValue = remainingHealing;
                                dispatch({
                                    type: ACTIONS.UPDATE_CARD,
                                    payload: {
                                        playerNum: playerTurn,
                                        cardId: targetCardId,
                                        updateKeys: ['shield'],
                                        updateValues: [shieldValue],
                                    },
                                });
                            }

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'brigitte-ult',
            },
        },
        doomfist: {
            ability1: {
                audioFile: 'doomfist-punch',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const enemyPlayer = parseInt(targetCardId[0]);
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetCardRow[0] === 'p' ||
                                parseInt(targetCardRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            } else if (targetCardRow[1] !== 'b') {
                                // Move target back a row if not already in last row
                                const newRowId = `${enemyPlayer}${
                                    targetCardRow[1] === 'f' ? 'm' : 'b'
                                }`;

                                // Set state
                                dispatch({
                                    type: ACTIONS.MOVE_CARD,
                                    payload: {
                                        targetCardId: targetCardId,
                                        startRowId: targetCardRow,
                                        finishRowId: newRowId,
                                        startIndex: targetCardIndex,
                                        finishIndex: 0,
                                    },
                                });
                            }

                            // Apply damage to target
                            const damageValue = 2;
                            applyDamage(
                                damageValue,
                                targetCardId,
                                targetCardRow
                            );

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                // TODO:
                /*
        Doomfist's ability2 is exactly the same as bastion's. To differntiate them, and add a little
        more flavour to doomfist's card, ability2 could move doomfist to the opposite row that
        he targeted (i.e. click on an enemy in the middle row, damage the target and adjacent enemies,
        and also move doomfist to your middle row). This would be a double edge sword, as sometimes
        you may not want to move doomfist into the row that you want to target.
        The ability could also give doomfist a certain amount of shield for himself. 
        To balance this, the damage should probably be nerfed, probably 2 damage
        to the target, and keep 1 to the adjacent enemies
        */
                synergyCost: 3,
                audioFile: 'doomfist-ult',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const enemyPlayer = parseInt(targetCardId[0]);
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetCardRow[0] === 'p' ||
                                parseInt(targetCardRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Get adjacent enemy target info
                            const adjacentEnemy1 =
                                gameState.rows[targetCardRow].cardIds[
                                    targetCardIndex - 1
                                ];
                            const adjacentEnemy2 =
                                gameState.rows[targetCardRow].cardIds[
                                    targetCardIndex + 1
                                ];

                            // Apply 3 damage to target, and 1 damage to enemies adjacent to target
                            applyDamage(3, targetCardId, targetCardRow);
                            if (adjacentEnemy1 !== undefined) {
                                applyDamage(1, adjacentEnemy1, targetCardRow);
                            }
                            if (adjacentEnemy2 !== undefined) {
                                applyDamage(1, adjacentEnemy2, targetCardRow);
                            }

                            resolve();
                        });
                    });
                },
            },
        },
        dva: {
            ability2: {
                synergyCost: 2,
                audioFile: 'dva-ult',
                run() {
                    return new Promise((resolve, reject) => {
                        props.setNextCardDraw((prevState) => ({
                            ...prevState,
                            [`player${playerTurn}`]: 'dvameka',
                        }));

                        resolve();
                    });
                },
            },
        },
        dvameka: {
            ability1: {
                audioFile: 'dvameka-apm',
                run() {
                    // Add shield to dvameka card
                    const newShield = 2;
                    dispatch({
                        type: ACTIONS.UPDATE_CARD,
                        payload: {
                            playerNum: playerTurn,
                            cardId: `${playerTurn}dvameka`,
                            updateKeys: ['shield'],
                            updateValues: [newShield],
                        },
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'dvameka-nerfthis',
                run() {
                    const rowPosition = rowId[1];
                    const enemyPlayer = playerTurn === 1 ? 2 : 1;
                    const playerRowCardIds = gameState.rows[rowId].cardIds;
                    const enemyPlayerRowCardIds =
                        gameState.rows[`${enemyPlayer}${rowPosition}`].cardIds;
                    const dvamekaIndex = $(`#${playerTurn}dvameka`)
                        .closest('li')
                        .index();

                    const damageValue = 4;

                    // Damage own player cards, except for dvameka using the ability
                    for (let cardId of playerRowCardIds) {
                        if (cardId !== `${playerTurn}dvameka`) {
                            applyDamage(damageValue, cardId, rowId);
                        }
                    }

                    // Damage enemy cards
                    for (let cardId of enemyPlayerRowCardIds) {
                        applyDamage(
                            damageValue,
                            cardId,
                            `${enemyPlayer}${rowPosition}`
                        );
                    }

                    // After effects
                    // Discard dvameka card
                    dispatch({
                        type: ACTIONS.DISCARD_CARD,
                        payload: {
                            playerNum: playerTurn,
                            targetCardId: `${playerTurn}dvameka`,
                            targetCardRow: rowId,
                        },
                    });

                    // Create baby dva card
                    dispatch({
                        type: ACTIONS.CREATE_CARD,
                        payload: {
                            playerNum: playerTurn,
                            heroId: 'dva',
                        },
                    });

                    // Add baby dva to row dvameka was in
                    dispatch({
                        type: ACTIONS.ADD_CARD_TO_HAND,
                        payload: {
                            playerNum: playerTurn,
                            playerHeroId: `${playerTurn}dva`,
                        },
                    });

                    // Get Dva's index in player hand
                    const dvaIndex = $(`#${playerTurn}dva`)
                        .closest('li')
                        .index();

                    // Move dva from player hand to dvameka's former position
                    dispatch({
                        type: ACTIONS.MOVE_CARD,
                        payload: {
                            targetCardId: `${playerTurn}dva`,
                            startRowId: `player${playerTurn}hand`,
                            finishRowId: rowId,
                            startIndex: dvaIndex,
                            finishIndex: dvamekaIndex,
                        },
                    });
                },
            },
        },
        echo: {
            ability1: {
                audioFile: 'echo-burning',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Check target is in valid row
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const targetPlayer = parseInt(targetCardId[0]);
                            const targetCard =
                                gameState.playerCards[
                                    `player${targetPlayer}cards`
                                ].cards[targetCardId];
                            const damageValue =
                                targetCard.maxHealth - targetCard.health;
                            applyDamage(damageValue, targetCardId, targetRow);

                            // Apply abilities that affect a specific card

                            resolve('resolved!');
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'echo-ult',
                synergyCost: 2,
                async run() {
                    // Get the id of the last used ultimate
                    const echoUltHeroId = localStorage.getItem('echoUltHeroId');

                    // Certain ults need to be tailored specifically for echo to use
                    // Ashe - differntiate echo's bob from ashe's by using a different id
                    if (echoUltHeroId === 'ashe') {
                        // Create bob card
                        dispatch({
                            type: ACTIONS.CREATE_CARD,
                            payload: {
                                playerNum: playerTurn,
                                heroId: 'bob-echo',
                            },
                        });

                        // Add summoned hero to hand
                        dispatch({
                            type: ACTIONS.ADD_CARD_TO_HAND,
                            payload: {
                                playerNum: playerTurn,
                                playerHeroId: `${playerTurn}bob-echo`,
                            },
                        });

                        return;
                    }
                    // Dva - cant allow echo to create a second dvameka in player's deck
                    else if (echoUltHeroId === 'dva') {
                        alert("Cannot duplicate D.va's Ultimate");
                        return;
                    }
                    // DvaMeka - Echo causes the damage, but none of the other effects
                    else if (echoUltHeroId === 'dvameka') {
                        const rowPosition = rowId[1];
                        const enemyPlayer = playerTurn === 1 ? 2 : 1;
                        const playerRowCardIds = gameState.rows[rowId].cardIds;
                        const enemyPlayerRowCardIds =
                            gameState.rows[`${enemyPlayer}${rowPosition}`]
                                .cardIds;

                        // Damage own player cards, except for echo using the ability
                        const damageValue = 4;
                        for (let cardId of playerRowCardIds) {
                            if (cardId !== `${playerTurn}echo`) {
                                applyDamage(damageValue, cardId, rowId);
                            }
                        }

                        // Damage enemy cards
                        for (let cardId of enemyPlayerRowCardIds) {
                            applyDamage(
                                damageValue,
                                cardId,
                                `${enemyPlayer}${rowPosition}`
                            );
                        }

                        return;
                    }

                    // Run the ultimate in the same way as normal, but without deducting synergy
                    const maxTargets =
                        abilities[echoUltHeroId].ability2.maxTargets;
                    let i = 0;
                    do {
                        await abilities[echoUltHeroId].ability2.run();
                        i++;
                    } while (
                        'maxTargets' in abilities[echoUltHeroId].ability2 &&
                        i < maxTargets
                    );
                },
            },
        },
        genji: {
            ability1: {
                maxTargets: 3,
                audioFile: 'genji-cutting',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 1;
                            applyDamage(damageValue, targetCardId, targetRow);

                            // Apply abilities that affect a specific card

                            resolve('resolved!');
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'genji-ult',
                run() {
                    return new Promise((resolve, reject) => {
                        // Execute the following when any card is clicked
                        $('.card').on('click', (e) => {
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const enemyPlayer = parseInt(targetCardId[0]);
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove the onclick effect from all cards
                            $('.card').off('click');
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn ||
                                // Check target has been damaged
                                gameState.playerCards[
                                    `player${enemyPlayer}cards`
                                ].cards[targetCardId].health ===
                                    gameState.playerCards[
                                        `player${enemyPlayer}cards`
                                    ].cards[targetCardId].maxHealth
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply abilities that affect a specific card
                            dispatch({
                                type: ACTIONS.EDIT_CARD,
                                payload: {
                                    playerNum: enemyPlayer,
                                    targetCardId: targetCardId,
                                    editKeys: ['health'],
                                    editValues: [0],
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
        },
        hanzo: {
            ability1: {
                audioFile: 'hanzo-marked',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information & remove onclick
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply effect
                            const effectId = 'hanzoEnemyEffect';
                            dispatch({
                                type: ACTIONS.ADD_ROW_EFFECT,
                                payload: {
                                    targetRow: targetRow,
                                    playerHeroId: `${playerTurn}hanzo`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'hanzo-ult',
                maxTargets: 3,
                synergyCost: 3,
                run() {
                    // Wait for user input
                    return new Promise((resolve, reject) => {
                        // Specifically, wait for user to click on a card
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            // TODO: check that target cards are actually in the same column
                            // TODO: currently just relying on user to choose correctly
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 3;
                            applyDamage(damageValue, targetCardId, targetRow);

                            resolve();
                        });
                    });
                },
            },
        },
        junkrat: {
            ability1: {
                audioFile: 'junkrat-laugh',
            },
            ability2: {
                audioFile: 'junkrat-ult',
                synergyCost: 3,
                run() {
                    return new Promise((resolve, reject) => {
                        $('.row').on('click', (e) => {
                            const targetRowId = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const junkratStartIndex = $(`#${playerHeroId}`)
                                .closest('li')
                                .index();
                            const newRowPosition = targetRowId[1];

                            $('.row').off('click');

                            // Check target is valid
                            if (targetRowId[0] === 'p') {
                                reject('Incorrect target row');
                                return;
                            }

                            // Set state
                            dispatch({
                                type: ACTIONS.MOVE_CARD,
                                payload: {
                                    targetCardId: `${playerHeroId}`,
                                    startRowId: rowId,
                                    finishRowId: targetRowId,
                                    startIndex: junkratStartIndex,
                                    finishIndex: 0,
                                },
                            });

                            // Get all cards in the target row
                            const targetRowCardIds = $.map(
                                $(`#${enemyPlayerNum}${newRowPosition} .card`),
                                (card) => {
                                    return card.id;
                                }
                            );

                            // Apply damange
                            const damageValue = 2;
                            targetRowCardIds.forEach((cardId) => {
                                applyDamage(damageValue, cardId, targetRowId);
                            });

                            resolve();
                        });
                    });
                },
            },
        },
        lucio: {
            ability1: {
                audioFile: 'lucio-ampitup',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove the onclick
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) !== playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Effect id
                            const effectId = 'lucioAllyEffect';
                            // Apply effect
                            dispatch({
                                type: ACTIONS.ADD_ROW_EFFECT,
                                payload: {
                                    targetRow: targetRow,
                                    playerHeroId: `${playerTurn}lucio`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'lucio-ult',
                synergyCost: 3,
                run() {
                    // Get target information
                    const heroRowCardIds = gameState.rows[rowId].cardIds;

                    // Remove the onclick
                    $('.card').off('click');

                    // Apply effect
                    const shieldValue = 2;
                    for (let cardId of heroRowCardIds) {
                        dispatch({
                            type: ACTIONS.UPDATE_CARD,
                            payload: {
                                playerNum: playerTurn,
                                cardId: cardId,
                                updateKeys: ['shield'],
                                updateValues: [shieldValue],
                            },
                        });
                    }
                },
            },
            lucioAllyEffect: {
                run(rowId) {
                    const targetRowCardIds = gameState.rows[rowId].cardIds;
                    const healingValue = 1;

                    for (let cardId of targetRowCardIds) {
                        applyHealing(healingValue, cardId);
                    }

                    return;
                },
            },
        },
        mccree: {
            ability1: {
                audioFile: 'mccree-fishinabarrel',
                run() {
                    return new Promise((resolve, reject) => {
                        // When any card is clicked
                        $('.row').on('click', (e) => {
                            // Get target info
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const enemyPlayer = parseInt(targetCardRow[0]);
                            const rowEnemies =
                                gameState.rows[targetCardRow].cardIds.length;

                            // Remove onclick from all cards
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetCardRow[0] === 'p' ||
                                parseInt(targetCardRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Reduce synergy of target row
                            dispatch({
                                type: ACTIONS.UPDATE_SYNERGY,
                                payload: {
                                    rowId: targetCardRow,
                                    synergyCost: Math.abs(rowEnemies) * -1,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'mccree-ult',
                synergyCost: 3,
                run() {
                    return new Promise((resolve, reject) => {
                        $('.row').on('click', async (e) => {
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Get all cards in the target row
                            const targetRowCardIds = $.map(
                                $(`#${targetRow} .card`),
                                function (card) {
                                    return card.id;
                                }
                            );

                            // Apply damange
                            const totalDamage = 6;
                            const damagePerEnemy = Math.floor(
                                totalDamage / targetRowCardIds.length
                            );
                            let damageDone = 0;
                            targetRowCardIds.forEach((cardId) => {
                                applyDamage(damagePerEnemy, cardId, targetRow);
                                damageDone += damagePerEnemy;
                            });

                            if (damageDone < totalDamage) {
                                let remainingDamage = totalDamage - damageDone;

                                alert(
                                    `${remainingDamage} left over. Choose who should receive it! (1 damage per click)`
                                );

                                // Define the function that will apply remaining damage
                                const applyRemainingDamage = () => {
                                    return new Promise((resolve, reject) => {
                                        $('.card').on('click', (e) => {
                                            const targetCard = $(e.target)
                                                .closest('.card')
                                                .attr('id');
                                            const targetRow = $(e.target)
                                                .closest('.row')
                                                .attr('id');

                                            $('.card').off('click');

                                            // Check target is valid
                                            if (
                                                targetRow[0] === 'p' ||
                                                parseInt(targetRow[0]) ===
                                                    playerTurn
                                            ) {
                                                reject('Incorrect target row');
                                                return;
                                            }

                                            applyDamage(
                                                1,
                                                targetCard,
                                                targetRow
                                            );
                                            resolve();
                                        });
                                    });
                                };

                                do {
                                    await applyRemainingDamage();
                                    remainingDamage--;
                                } while (remainingDamage > 0);
                            }

                            resolve();
                        });
                    });
                },
            },
        },
        mei: {
            ability1: {
                audioFile: 'mei-goticed',
            },
            ability2: {
                audioFile: 'mei-ult',
                synergyCost: 2,
            },
        },
        mercy: {
            ability1: {
                audioFile: 'mercy-medicalemergency',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.card').on('click', (e) => {
                            // Get target information & remove onclick
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            console.log(targetRow);

                            // Remove click event from all cards
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) !== playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply effect
                            // TODO: find way to decide between the two mercy ally effects - currently only healing effect is implemented
                            let effectId = 'mercyAllyEffect1';

                            // Harmony orb applies healing immediately, as well as over time
                            if (effectId === 'mercyAllyEffect1') {
                                const healingValue = 2;
                                applyHealing(healingValue, targetCardId);
                            }

                            // Set state
                            dispatch({
                                type: ACTIONS.ADD_CARD_EFFECT,
                                payload: {
                                    targetCardId: targetCardId,
                                    playerHeroId: `${playerTurn}mercy`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'mercy-ult',
                synergyCost: 3,
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.card').on('click', (e) => {
                            // Get target information
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRowId = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const mercyStartIndex = $(`#${playerHeroId}`)
                                .closest('li')
                                .index();
                            const targetCardIndex = $(`#${targetCardId}`)
                                .closest('li')
                                .index();
                            const newRowPosition = targetRowId[1];

                            // Remove the onclick
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetRowId[0] === 'p' ||
                                parseInt(targetRowId[0]) !== playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Set state
                            dispatch({
                                type: ACTIONS.MOVE_CARD,
                                payload: {
                                    targetCardId: `${playerHeroId}`,
                                    startRowId: rowId,
                                    finishRowId: targetRowId,
                                    startIndex: mercyStartIndex,
                                    finishIndex: targetCardIndex + 1,
                                },
                            });

                            if (
                                gameState.playerCards[
                                    `player${playerTurn}cards`
                                ].cards[targetCardId].health === 0
                            ) {
                                dispatch({
                                    type: ACTIONS.EDIT_CARD,
                                    payload: {
                                        playerNum: playerTurn,
                                        targetCardId: targetCardId,
                                        editKeys: ['health'],
                                        editValues: [
                                            gameState.playerCards[
                                                `player${playerTurn}cards`
                                            ].cards[targetCardId].maxHealth,
                                        ],
                                    },
                                });
                            }

                            resolve();
                        });
                    });
                },
            },
            mercyAllyEffect1: {
                run(cardId) {
                    const healingValue = 1;
                    applyHealing(healingValue, cardId);
                    return;
                },
            },
        },
        moira: {
            ability1: {
                audioFile: 'moira-grasp',
                run() {
                    // Carry out first stage of ability1 - i.e. damage or heal
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', async (e) => {
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const enemyPlayer = parseInt(targetCardId[0]);
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            $('.card').off('click');

                            // Check target is valid
                            if (targetCardRow[0] === 'p') {
                                reject('Incorrect target row');
                                return;
                            }

                            let targetedPlayer;
                            // If targeting an ally apply heal, else apply damage
                            if (parseInt(targetCardRow[0]) === playerTurn) {
                                applyHealing(2, targetCardId);
                                targetedPlayer = 'ally';
                            } else {
                                const damageValue = 2;
                                applyDamage(
                                    damageValue,
                                    targetCardId,
                                    targetCardRow,
                                    true
                                );
                                targetedPlayer = 'enemy';
                            }

                            // Carry out the second stage - i.e. damage or healing, whichever wasnt already done
                            function moiraAbility1Stage2() {
                                return new Promise((resolve, reject) => {
                                    $('.card').on('click', (e) => {
                                        const targetCardId = $(e.target)
                                            .closest('.card')
                                            .attr('id');
                                        const targetCardRow = $(e.target)
                                            .closest('.row')
                                            .attr('id');

                                        $('.card').off('click');

                                        // Check target is valid
                                        if (targetCardRow[0] === 'p') {
                                            reject('Incorrect target row');
                                            return;
                                        }

                                        if (targetedPlayer === 'ally') {
                                            const damageValue = 2;
                                            applyDamage(
                                                damageValue,
                                                targetCardId,
                                                targetCardRow,
                                                true
                                            );
                                        } else {
                                            applyHealing(2, targetCardId);
                                        }

                                        resolve();
                                    });
                                });
                            }
                            await moiraAbility1Stage2();

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                maxTargets: 6,
                audioFile: 'moira-ult',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', async (e) => {
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (targetCardRow[0] === 'p') {
                                reject('Incorrect target row');
                                return;
                            }

                            // If targeting an ally apply heal, else apply damage
                            if (parseInt(targetCardRow[0]) === playerTurn) {
                                applyHealing(2, targetCardId);
                            } else {
                                applyDamage(
                                    2,
                                    targetCardId,
                                    targetCardRow,
                                    true
                                );
                            }

                            resolve();
                        });
                    });
                },
            },
        },
        orisa: {
            ability1: {
                audioFile: 'orisa-barrier',
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'orisa-ult',
            },
        },
        pharah: {
            ability1: {
                audioFile: 'pharah-clear',
                run() {
                    return new Promise((resolve, reject) => {
                        // When any card is clicked
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const enemyPlayer = parseInt(targetCardId[0]);
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick from all cards
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetCardRow[0] === 'p' ||
                                parseInt(targetCardRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;

                                // Move target back a row if not already in last row
                            } else if (targetCardRow[1] !== 'b') {
                                const newRowId = `${enemyPlayer}${
                                    targetCardRow[1] === 'f' ? 'm' : 'b'
                                }`;

                                dispatch({
                                    type: ACTIONS.MOVE_CARD,
                                    payload: {
                                        targetCardId: targetCardId,
                                        startRowId: targetCardRow,
                                        finishRowId: newRowId,
                                        startIndex: targetCardIndex,
                                        finishIndex: 0,
                                    },
                                });
                            }

                            // Reduce synergy of target row
                            dispatch({
                                type: ACTIONS.UPDATE_SYNERGY,
                                payload: {
                                    rowId: targetCardRow,
                                    synergyCost: -2,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                maxTargets: 3,
                synergyCost: 3,
                audioFile: 'pharah-ult',
                run() {
                    // Wait for user input
                    return new Promise((resolve, reject) => {
                        // Specifically, wait for user to click on a card
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetPlayerNum = parseInt(targetCardId[0]);
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 2;
                            applyDamage(damageValue, targetCardId, targetRow);

                            resolve();
                        });
                    });
                },
            },
        },
        reaper: {
            ability1: {
                audioFile: 'reaper-lastwords',
                maxTargets: 2,
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 1;
                            applyDamage(damageValue, targetCardId, targetRow);

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'reaper-ult',
                run() {
                    // Get target info
                    const rowPosition = rowId[1];
                    const enemyPlayer = playerTurn === 1 ? 2 : 1;
                    const enemyPlayerRowCardIds =
                        gameState.rows[`${enemyPlayer}${rowPosition}`].cardIds;

                    // Damage enemy cards
                    const damageValue = 3;
                    for (let cardId of enemyPlayerRowCardIds) {
                        applyDamage(
                            damageValue,
                            cardId,
                            `${enemyPlayer}${rowPosition}`
                        );
                    }

                    // After effects
                    // Discard card
                    dispatch({
                        type: ACTIONS.DISCARD_CARD,
                        payload: {
                            playerNum: playerTurn,
                            targetCardId: `${playerTurn}reaper`,
                            targetCardRow: rowId,
                        },
                    });
                },
            },
        },
        reinhardt: {
            ability1: {
                audioFile: 'reinhardt-barrier',
                run() {
                    // Apply shield to row
                    const shieldValue = 3;
                    dispatch({
                        type: ACTIONS.ADD_ROW_SHIELD,
                        payload: {
                            playerHeroId: playerHeroId,
                            targetRow: rowId,
                            rowShield: shieldValue,
                        },
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'reinhardt-ult',
                maxTargets: 3,
                run() {
                    // Wait for user input
                    return new Promise((resolve, reject) => {
                        // Specifically, wait for user to click on a card
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            // TODO: check that target cards are actually in the same column
                            // TODO: currently just relying on user to choose correctly
                            if (
                                targetCardRow[0] === 'p' ||
                                parseInt(targetCardRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 2;
                            applyDamage(
                                damageValue,
                                targetCardId,
                                targetCardRow
                            );

                            // Reduce synergy of target row
                            dispatch({
                                type: ACTIONS.UPDATE_SYNERGY,
                                payload: {
                                    rowId: targetCardRow,
                                    synergyCost: -1,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
        },
        roadhog: {
            ability1: {
                audioFile: 'roadhog-hook',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const targetCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const enemyPlayer = parseInt(targetCardId[0]);

                            // Remove onclick from all cards
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetCardRow[0] === 'p' ||
                                parseInt(targetCardRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Move target to front row
                            const newRowId = `${enemyPlayer}f`;
                            dispatch({
                                type: ACTIONS.MOVE_CARD,
                                payload: {
                                    targetCardId: targetCardId,
                                    startRowId: targetCardRow,
                                    finishRowId: newRowId,
                                    startIndex: targetCardIndex,
                                    finishIndex: 0,
                                },
                            });

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 2;
                            applyDamage(
                                damageValue,
                                targetCardId,
                                targetCardRow
                            );

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'roadhog-hogwild',
                synergyCost: 3,
                async run() {
                    // TODO
                    // Get target info
                    const enemyPlayer = playerTurn === 1 ? 2 : 1;

                    // Copy arrays of cards from state, assign id to the row for later reference
                    // We will manipulate the array, so we dont want a reference to the original array
                    const enemyBackRowCards = Array.from(
                        gameState.rows[`${enemyPlayer}b`].cardIds
                    );
                    enemyBackRowCards['id'] = `${enemyPlayer}b`;
                    const enemyMiddleRowCards = Array.from(
                        gameState.rows[`${enemyPlayer}m`].cardIds
                    );
                    enemyMiddleRowCards['id'] = `${enemyPlayer}m`;
                    const enemyFrontRowCards = Array.from(
                        gameState.rows[`${enemyPlayer}f`].cardIds
                    );
                    enemyFrontRowCards['id'] = `${enemyPlayer}f`;

                    const enemyRows = [
                        enemyBackRowCards,
                        enemyMiddleRowCards,
                        enemyFrontRowCards,
                    ];

                    // Filter out heros at 0 health
                    for (let row of enemyRows) {
                        row.filter((cardId) => {
                            if (
                                gameState.playerCards[
                                    `player${enemyPlayer}cards`
                                ].cards[cardId].health > 0
                            ) {
                                return cardId;
                            }
                            return null;
                        });
                    }

                    // Get total damage amount (2d6 = between 2 - 12)
                    const totalDamage = getRandInt(2, 13);
                    alert(`Wholehog rolled ${totalDamage} damage!`);

                    // Calculate damage per hero and apply
                    const totalEnemyCards =
                        enemyBackRowCards.length +
                        enemyMiddleRowCards.length +
                        enemyFrontRowCards.length;
                    const damageValue = Math.floor(
                        totalDamage / totalEnemyCards
                    );
                    let damageDone = 0;
                    if (damageValue > 0) {
                        for (let row of enemyRows) {
                            for (let cardId of row) {
                                applyDamage(damageValue, cardId, row.id);
                                damageDone += damageValue;
                            }
                        }
                    }

                    // Calculate damage that cant be evenly spread among all enemy heroes
                    let remainingDamage = totalDamage - damageDone;

                    // Allow user to spread remaining damage
                    if (remainingDamage > 0) {
                        alert(
                            `${remainingDamage} left over. Choose who should receive it! (1 damage per click)`
                        );

                        // Define the function that will apply remaining damage
                        const applyRemainingDamage = () => {
                            return new Promise((resolve, reject) => {
                                $('.card').on('click', (e) => {
                                    const targetCard = $(e.target)
                                        .closest('.card')
                                        .attr('id');
                                    const targetRow = $(e.target)
                                        .closest('.row')
                                        .attr('id');

                                    $('.card').off('click');

                                    // Check target is valid
                                    if (
                                        targetRow[0] === 'p' ||
                                        parseInt(targetRow[0]) === playerTurn
                                    ) {
                                        reject('Incorrect target row');
                                        return;
                                    }

                                    applyDamage(1, targetCard, targetRow);
                                    resolve();
                                });
                            });
                        };

                        do {
                            await applyRemainingDamage();
                            remainingDamage--;
                        } while (remainingDamage > 0);
                    }
                },
            },
        },
        sigma: {
            ability1: {
                audioFile: 'sigma-barrier',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove the onclick
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) !== playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply effect
                            const shieldValue = 3;
                            dispatch({
                                type: ACTIONS.ADD_ROW_SHIELD,
                                payload: {
                                    playerHeroId: playerHeroId,
                                    targetRow: targetRow,
                                    rowShield: shieldValue,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'sigma-ult',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.row').on('click', (e) => {
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Reduce synergy of target row to 0
                            dispatch({
                                type: ACTIONS.SET_SYNERGY,
                                payload: {
                                    rowId: targetRow,
                                    newSynergyVal: 0,
                                },
                            });

                            // Get all cards in the target row
                            const targetRowCardIds = $.map(
                                $(`#${targetRow} .card`),
                                function (card) {
                                    return card.id;
                                }
                            );

                            // Apply damange
                            const damageValue = 1;
                            targetRowCardIds.forEach((cardId) => {
                                applyDamage(damageValue, cardId, targetRow);
                            });

                            resolve();
                        });
                    });
                },
            },
        },
        soldier: {
            id: 'soldier',
            ability1: {
                audioFile: 'soldier-teamheal',
                run() {
                    // Get target info
                    const playerRowCardIds = gameState.rows[rowId].cardIds;

                    // Damage enemy cards
                    const healValue = 1;
                    for (let cardId of playerRowCardIds) {
                        applyHealing(healValue, cardId);
                    }
                },
            },
            ability2: {
                audioFile: 'soldier-ult',
                maxTargets: 3,
                synergyCost: 3,
                run() {
                    // Wait for user input
                    return new Promise((resolve, reject) => {
                        // Specifically, wait for user to click on a card
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                                // Check target is valid
                            } else if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card
                            // Decrease damage with each successive hit by using a ref
                            const damageValue = 3 - enemiesHitByAbility.current;
                            applyDamage(damageValue, targetCardId, targetRow);
                            enemiesHitByAbility.current += 1;

                            resolve();
                        });
                    });
                },
            },
        },
        sombra: {
            ability1: {
                audioFile: 'sombra-hack',
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'sombra-ult',
            },
        },
        symmetra: {
            ability1: {
                audioFile: 'symmetra-teleporter',
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const teleportCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const teleportCardIndex = $(e.target)
                                .closest('li')
                                .index();
                            const teleportCardRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick from all cards
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                teleportCardRow[0] === 'p' ||
                                parseInt(teleportCardRow[0]) !== playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Check if target effect is applied to any row, if so remove effect
                            for (let key in gameState.rows) {
                                if (key[0] !== 'p') {
                                    const targetPlayer = parseInt(key[0]);

                                    console.log(`key is ${key}`);
                                    console.log(
                                        JSON.stringify(gameState.rows[key])
                                    );

                                    for (let effect of gameState.rows[key]
                                        .allyEffects) {
                                        if (
                                            effect.playerHeroId ===
                                            teleportCardId
                                        ) {
                                            const newRow = gameState.rows[
                                                key
                                            ].allyEffects.filter(
                                                (effect) =>
                                                    effect.playerHeroId !==
                                                    teleportCardId
                                            );
                                            dispatch({
                                                type: ACTIONS.EDIT_ROW,
                                                payload: {
                                                    targetRow: key,
                                                    editKeys: ['allyEffects'],
                                                    editValues: [newRow],
                                                },
                                            });
                                        }
                                    }

                                    for (let effect of gameState.rows[key]
                                        .enemyEffects) {
                                        if (
                                            effect.playerHeroId ===
                                            teleportCardId
                                        ) {
                                            const newRow = gameState.rows[
                                                key
                                            ].enemyEffects.filter(
                                                (effect) =>
                                                    effect.playerHeroId !==
                                                    teleportCardId
                                            );
                                            dispatch({
                                                type: ACTIONS.EDIT_ROW,
                                                payload: {
                                                    targetRow: key,
                                                    editKeys: ['enemyEffects'],
                                                    editValues: [newRow],
                                                },
                                            });
                                        }
                                    }

                                    // Check if target's effect is applied to any card, if so remove
                                    for (let cardId of gameState.rows[key]
                                        .cardIds) {
                                        for (let effect of gameState
                                            .playerCards[
                                            `player${targetPlayer}cards`
                                        ].cards[cardId].allyEffects) {
                                            if (
                                                effect.playerHeroId ===
                                                teleportCardId
                                            ) {
                                                const newEffects =
                                                    gameState.playerCards[
                                                        `player${targetPlayer}cards`
                                                    ].cards[
                                                        cardId
                                                    ].allyEffects.filter(
                                                        (effect) =>
                                                            effect.playerHeroId !==
                                                            teleportCardId
                                                    );
                                                dispatch({
                                                    type: ACTIONS.EDIT_CARD,
                                                    payload: {
                                                        playerNum: targetPlayer,
                                                        targetCardId: cardId,
                                                        editKeys: [
                                                            'allyEffects',
                                                        ],
                                                        editValues: [
                                                            newEffects,
                                                        ],
                                                    },
                                                });
                                            }
                                        }

                                        for (let effect of gameState
                                            .playerCards[
                                            `player${targetPlayer}cards`
                                        ].cards[cardId].enemyEffects) {
                                            if (
                                                effect.playerHeroId ===
                                                teleportCardId
                                            ) {
                                                const newEffects =
                                                    gameState.playerCards[
                                                        `player${targetPlayer}cards`
                                                    ].cards[
                                                        cardId
                                                    ].enemyEffects.filter(
                                                        (effect) =>
                                                            effect.playerHeroId !==
                                                            teleportCardId
                                                    );
                                                dispatch({
                                                    type: ACTIONS.EDIT_CARD,
                                                    payload: {
                                                        playerNum: targetPlayer,
                                                        targetCardId: cardId,
                                                        editKeys: [
                                                            'enemyEffects',
                                                        ],
                                                        editValues: [
                                                            newEffects,
                                                        ],
                                                    },
                                                });
                                            }
                                        }
                                    }
                                }
                            }

                            // Move target to playerhand
                            const newRowId = `player${playerTurn}hand`;
                            dispatch({
                                type: ACTIONS.MOVE_CARD,
                                payload: {
                                    targetCardId: teleportCardId,
                                    startRowId: teleportCardRow,
                                    finishRowId: newRowId,
                                    startIndex: teleportCardIndex,
                                    finishIndex: 0,
                                },
                            });

                            // Set card to not played
                            /* 
              Do not reset the card's synergy, despite what it says on the card
              Symmetra's teleporter ability as written on the card is very simple
              Keeping the teleported card's synergy in the row, and not resetting the card's synergy,
              adds a bit more complexity and strategy to how this ability is used
              */
                            dispatch({
                                type: ACTIONS.EDIT_CARD,
                                payload: {
                                    playerNum: playerTurn,
                                    targetCardId: teleportCardId,
                                    editKeys: [
                                        'isPlayed',
                                        'allyEffects',
                                        'enemyEffects',
                                        'shield',
                                    ],
                                    editValues: [false, [], [], 0],
                                },
                            });

                            // Reduce number of cards played by player
                            dispatch({
                                type: ACTIONS.UPDATE_ROW,
                                payload: {
                                    targetRow: `player${playerTurn}hand`,
                                    updateKeys: ['cardsPlayed'],
                                    updateValues: [-1],
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'symmetra-shield',
                synergyCost: 3,
                run() {
                    const playerBackRowCardIds =
                        gameState.rows[`${playerTurn}b`].cardIds;
                    const playerMiddleRowCardIds =
                        gameState.rows[`${playerTurn}m`].cardIds;
                    const playerFrontRowCardIds =
                        gameState.rows[`${playerTurn}f`].cardIds;

                    const playerCards = [
                        playerBackRowCardIds,
                        playerMiddleRowCardIds,
                        playerFrontRowCardIds,
                    ];

                    // Add shield to all ally cards
                    for (let row of playerCards) {
                        for (let cardId of row) {
                            const newShield = 1;
                            dispatch({
                                type: ACTIONS.UPDATE_CARD,
                                payload: {
                                    playerNum: playerTurn,
                                    cardId: cardId,
                                    updateKeys: ['shield'],
                                    updateValues: [newShield],
                                },
                            });
                        }
                    }
                },
            },
        },
        torbjorn: {
            ability1: {
                audioFile: 'torbjorn-turret',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information & remove onclick
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply effect
                            const effectId = 'torbjornEnemyEffect';
                            const heroId = 'torbjorn';
                            dispatch({
                                type: ACTIONS.ADD_ROW_EFFECT,
                                payload: {
                                    targetRow: targetRow,
                                    playerHeroId: `${playerTurn}${heroId}`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'torbjorn-ult',
                synergyCost: 3,
                run() {
                    const newTurretDamage = 2;
                    const playerHeroId = `${playerTurn}torbjorn`;

                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: {
                            playerNum: playerTurn,
                            targetCardId: playerHeroId,
                            editKeys: ['effects.torbjornEnemyEffect.value'],
                            editValues: [newTurretDamage],
                        },
                    });
                },
            },
            torbjornEnemyEffect: {
                run(rowId) {
                    // Get enemies in target row
                    const targetPlayer = parseInt(rowId[0]);
                    const torbPlayer = targetPlayer === 1 ? 2 : 1;
                    const rowEnemies = gameState.rows[rowId].cardIds.filter(
                        (cardId) => {
                            if (
                                gameState.playerCards[
                                    `player${targetPlayer}cards`
                                ].cards[cardId].health > 0
                            ) {
                                return cardId;
                            } else return null;
                        }
                    );

                    const turretDamage =
                        gameState.playerCards[`player${torbPlayer}cards`].cards[
                            `${torbPlayer}torbjorn`
                        ].effects.torbjornEnemyEffect.value;
                    const maxTargets = 2;

                    // If there are no enemies in the target row, do nothing
                    if (rowEnemies.length === 0) {
                        return;

                        // If there is just one enemy, attach that enemy once
                    } else if (rowEnemies.length === 1) {
                        applyDamage(turretDamage, rowEnemies[0], rowId);

                        // If there are several enemies, attack two at random
                    } else if (rowEnemies.length >= 2) {
                        const attackedEnemies = [];

                        for (let i = 0; i < maxTargets; i++) {
                            let target;
                            do {
                                target = getRandInt(0, rowEnemies.length);
                            } while (attackedEnemies.includes(target));
                            console.log(`target is ${target}`);
                            applyDamage(
                                turretDamage,
                                rowEnemies[target],
                                rowId
                            );
                            attackedEnemies.push(target);
                        }
                    }
                },
            },
        },
        tracer: {
            ability1: {
                audioFile: 'tracer-smarts',
                maxTargets: 2,
                run() {
                    return new Promise((resolve, reject) => {
                        $('.card').on('click', (e) => {
                            // Get target info
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick
                            $('.card').off('click');

                            // Allow user to end the ability early by clicking on the ability-using-hero's card
                            if (
                                targetCardId ===
                                `${currentHeroAbilityRef.current}`
                            ) {
                                alert('Ability stopped early');
                                return;
                            }
                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply damage to the target card (includes setting state)
                            const damageValue = 1;
                            applyDamage(damageValue, targetCardId, targetRow);

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'tracer-imback',
                synergyCost: 2,
                run() {
                    const targetCardId = playerHeroId;
                    const targetCardIndex = $(`#${targetCardId}`)
                        .closest('li')
                        .index();

                    // Remove all counters from tracer
                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: {
                            playerNum: playerTurn,
                            targetCardId: targetCardId,
                            editKeys: [
                                'allyEffects',
                                'enemyEffects',
                                'shield',
                                'isPlayed',
                            ],
                            editValues: [[], [], 0, false],
                        },
                    });

                    // Return tracer to player hand
                    dispatch({
                        type: ACTIONS.MOVE_CARD,
                        payload: {
                            targetCardId: targetCardId,
                            startRowId: rowId,
                            startIndex: targetCardIndex,
                            finishRowId: `player${playerTurn}hand`,
                            finishIndex: 0,
                        },
                    });

                    // Reduce number of cards played by player
                    dispatch({
                        type: ACTIONS.UPDATE_ROW,
                        payload: {
                            targetRow: `player${playerTurn}hand`,
                            updateKeys: ['cardsPlayed'],
                            updateValues: [-1],
                        },
                    });
                },
            },
        },
        widowmaker: {
            ability1: {
                audioFile: 'widowmaker-noonecanhide-fr',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.row').on('click', (e) => {
                            // Get target information
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove the onclick
                            $('.row').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Effect id
                            const effectId = 'widowmakerEnemyEffect';
                            // Apply effect
                            dispatch({
                                type: ACTIONS.ADD_ROW_EFFECT,
                                payload: {
                                    targetRow: targetRow,
                                    playerHeroId: `${playerTurn}widowmaker`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'widowmaker-oneshot',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When card is chosen as target by being clicked on
                        $('.card').on('click', (e) => {
                            // Get target information
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const enemyPlayer = parseInt(targetCardId[0]);
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove onclick event
                            $('.card').off('click');

                            // Check valid target
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) === playerTurn
                            ) {
                                reject('Incorrect target row');
                                return;
                            }

                            // Apply abilities that affect a specific card
                            dispatch({
                                type: ACTIONS.EDIT_CARD,
                                payload: {
                                    playerNum: enemyPlayer,
                                    targetCardId: targetCardId,
                                    editKeys: ['health'],
                                    editValues: [0],
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
        },
        winston: {
            ability1: {
                audioFile: 'winston-barrier',
                run() {
                    // Apply shield to row
                    const shieldValue = 3;
                    dispatch({
                        type: ACTIONS.ADD_ROW_SHIELD,
                        payload: {
                            playerHeroId: playerHeroId,
                            targetRow: rowId,
                            rowShield: shieldValue,
                        },
                    });
                },
            },
            ability2: {
                /*
        Winston's ult is the same as junkrat - to differentiate and
        add more flavor, winston could jump twice instead of once, 
        doing 1 damage each time. Perhaps prevent jumping in the same row
        so Winston cant do two damage to one row?
        */
                audioFile: 'winston-angry',
                synergyCost: 3,
                run() {
                    return new Promise((resolve, reject) => {
                        $('.row').on('click', (e) => {
                            const targetRowId = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const winstonStartIndex = $(`#${playerHeroId}`)
                                .closest('li')
                                .index();
                            const newRowPosition = targetRowId[1];

                            $('.row').off('click');

                            // Check target is valid
                            if (targetRowId[0] === 'p') {
                                reject('Incorrect target row');
                                return;
                            }

                            // Set state
                            dispatch({
                                type: ACTIONS.MOVE_CARD,
                                payload: {
                                    targetCardId: `${playerHeroId}`,
                                    startRowId: rowId,
                                    finishRowId: targetRowId,
                                    startIndex: winstonStartIndex,
                                    finishIndex: 0,
                                },
                            });

                            // Get all cards in the target row
                            const targetRowCardIds = $.map(
                                $(`#${enemyPlayerNum}${newRowPosition} .card`),
                                (card) => {
                                    return card.id;
                                }
                            );

                            // Apply damange
                            const damageValue = 2;
                            targetRowCardIds.forEach((cardId) => {
                                applyDamage(damageValue, cardId, targetRowId);
                            });

                            resolve();
                        });
                    });
                },
            },
        },
        wreckingball: {
            ability1: {
                audioFile: 'wreckingball-shields',
                run() {
                    // Get number of enemies in opposite row
                    const oppositeRowEnemies =
                        gameState.rows[`${enemyPlayerNum}${rowId[1]}`].cardIds;
                    const newShield = 1 + oppositeRowEnemies.length;
                    dispatch({
                        type: ACTIONS.UPDATE_CARD,
                        payload: {
                            playerNum: playerTurn,
                            cardId: `${playerTurn}wreckingball`,
                            updateKeys: ['shield'],
                            updateValues: [newShield],
                        },
                    });
                },
            },
            ability2: {
                audioFile: 'wreckingball-ult',
            },
        },
        zarya: {
            ability1: {
                audioFile: 'zarya-barrier',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.card').on('click', (e) => {
                            // Get target information
                            const targetCard = $(e.target)
                                .closest('.card')
                                .attr('id');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');

                            // Remove the onclick
                            $('.card').off('click');

                            // Check target is valid
                            if (
                                targetRow[0] === 'p' ||
                                parseInt(targetRow[0]) !== playerTurn
                            ) {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply effect
                            const shieldValue = 3;
                            dispatch({
                                type: ACTIONS.UPDATE_CARD,
                                payload: {
                                    playerNum: playerTurn,
                                    cardId: targetCard,
                                    updateKeys: ['shield'],
                                    updateValues: [shieldValue],
                                },
                            });

                            // Keep track of how much shield remaining for Zarya's ultimate
                            // TODO: zarya tracks how much shield is given, but currently doesnt know when her shield has been damaged
                            dispatch({
                                type: ACTIONS.UPDATE_CARD,
                                payload: {
                                    playerNum: playerTurn,
                                    cardId: playerHeroId,
                                    updateKeys: ['zaryaShieldRemaining'],
                                    updateValues: [shieldValue],
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                audioFile: 'zarya-ult',
                synergyCost: 3,
            },
        },
        zenyatta: {
            ability1: {
                audioFile: 'zenyatta-harmony',
                run() {
                    // Wait for user click
                    return new Promise((resolve, reject) => {
                        // When a row is clicked
                        $('.card').on('click', (e) => {
                            // Get target information & remove onclick
                            const targetCardId = $(e.target)
                                .closest('.card')
                                .attr('id');
                            $('.card').off('click');
                            const targetRow = $(e.target)
                                .closest('.row')
                                .attr('id');
                            const targetPlayer = parseInt(targetCardId[0]);

                            // Check target is valid
                            if (targetRow[0] === 'p') {
                                reject('Incorrect target');
                                return;
                            }

                            // Apply ally/enemy effect depending on which card was clicked
                            let effectId;
                            targetPlayer === playerTurn
                                ? (effectId = 'zenyattaAllyEffect')
                                : (effectId = 'zenyattaEnemyEffect');

                            // Harmony orb applies healing immediately, as well as over time
                            if (effectId === 'zenyattaAllyEffect') {
                                const healingValue = 1;
                                applyHealing(healingValue, targetCardId);
                            }

                            // Set state
                            dispatch({
                                type: ACTIONS.ADD_CARD_EFFECT,
                                payload: {
                                    targetCardId: targetCardId,
                                    playerHeroId: `${playerTurn}zenyatta`,
                                    effectId: effectId,
                                },
                            });

                            resolve();
                        });
                    });
                },
            },
            ability2: {
                synergyCost: 3,
                audioFile: 'zenyatta-ult',
                run() {},
            },
            zenyattaAllyEffect: {
                run(cardId) {
                    const healingValue = 1;

                    applyHealing(healingValue, cardId);

                    return;
                },
            },
        },
    };

    // Handle the calling of hero abilites, including checking the ability call is valid
    async function activateAbility1(e) {
        e.stopPropagation();

        // keep track of which hero is currently using their ability
        currentHeroAbilityRef.current = playerHeroId;

        unsetCardFocus();

        // TODO: Check any effects that trigger on ability usage

        // Check that the card is not in the player's hand
        if (rowId[0] !== 'p') {
            // Call the relevant hero's ability
            try {
                // Play ability audio if exists (always enabled)
                if ('audioFile' in abilities[heroId].ability1) {
                    const audioFile = abilities[heroId].ability1.audioFile;
                    console.log('Attempting to play audio:', audioFile);
                    const audioSrc = getAudioFile(audioFile);
                    console.log('Audio source:', audioSrc);
                    if (audioSrc) {
                        const ability1audio = new Audio(audioSrc);
                        ability1audio.play().catch(err => {
                            console.error('Error playing audio:', err);
                        });
                    } else {
                        console.log('No audio source found for:', audioFile);
                    }
                }

                // Allow the ability to be triggered more than once if relevant
                const maxTargets = abilities[heroId].ability1.maxTargets;
                let i = 0;
                do {
                    await abilities[heroId].ability1.run();
                    unsetCardFocus();
                    i++;
                } while (
                    'maxTargets' in abilities[heroId].ability1 &&
                    i < maxTargets
                );

                // Set ability as used
                dispatch({
                    type: ACTIONS.EDIT_CARD,
                    payload: {
                        playerNum: playerTurn,
                        targetCardId: playerHeroId,
                        editKeys: ['ability1Used'],
                        editValues: [true],
                    },
                });
            } catch (err) {
                alert(err);
            }
        } else alert('Play cards before using abilities!');
    }

    async function activateAbility2(e) {
        e.stopPropagation();

        // keep track of which hero is currently using their ability
        currentHeroAbilityRef.current = playerHeroId;

        // Get synergy values
        let synergyCost = abilities[heroId].ability2.synergyCost;
        const rowSynergy = gameState.rows[rowId].synergy;
        unsetCardFocus();

        // Check any effects that trigger on ability usage
        // Add error handling for undefined rows
        if (!gameState.rows[rowId]) {
            console.error('activateAbility2: rowId not found in gameState.rows:', rowId);
            console.log('Available rows:', Object.keys(gameState.rows));
            return;
        }
        
        const enemyRowEffects = gameState.rows[rowId].enemyEffects || [];
        const enemyCardEffects =
            gameState.playerCards[`player${playerTurn}cards`]?.cards?.[
                playerHeroId
            ]?.enemyEffects || [];
        const allyRowEffects = gameState.rows[rowId].allyEffects || [];
        const allyCardEffects =
            gameState.playerCards[`player${playerTurn}cards`]?.cards?.[
                playerHeroId
            ]?.allyEffects || [];

        // *ENEMY EFFECTS*
        // Check for row effects that proc when an ultimate is used
        for (let effect of enemyRowEffects) {
            // Apply the effect
            if (effect.on === 'ultimate') {
                if (effect.value === 'double') synergyCost += synergyCost;
                else synergyCost += effect.value;
            }
        }

        // Check for card effects that proc when an ultimate is used
        for (let effect of enemyCardEffects) {
            if (effect.on === 'ultimate') {
                if (effect.value === 'double') synergyCost += synergyCost;
                else synergyCost += effect.value;
            }
        }

        // *ALLY EFFECTS*
        // Check for ally row effects that proc when an ultimate is used
        for (let effect of allyRowEffects) {
            // Apply the effect
            if (effect.on === 'ultimate') {
                if (effect.value === 'double') synergyCost += synergyCost;
                else synergyCost += effect.value;
            }
        }

        // Check for ally card effects that proc when an ultimate is used
        for (let effect of allyCardEffects) {
            if (effect.on === 'ultimate') {
                if (effect.value === 'double') synergyCost += synergyCost;
                else synergyCost += effect.value;
            }
        }

        // Check that the card is not in the player's hand
        if (rowId[0] !== 'p') {
            // Check there is sufficient synergy to use the ability
            if (rowSynergy >= synergyCost) {
                // Call the relevant hero's ability and deduct synergy
                try {
                    // Play ability audio if exists (always enabled)
                    if ('audioFile' in abilities[heroId].ability2) {
                        const audioFile = abilities[heroId].ability2.audioFile;
                        console.log('Attempting to play ultimate audio:', audioFile);
                        const audioSrc = getAudioFile(audioFile);
                        console.log('Ultimate audio source:', audioSrc);
                        if (audioSrc) {
                            const ability2audio = new Audio(audioSrc);
                            ability2audio.play().catch(err => {
                                console.error('Error playing ultimate audio:', err);
                            });
                        } else {
                            console.log('No audio source found for ultimate:', audioFile);
                        }
                    }

                    // Allow multiple targets if applicable
                    const maxTargets = abilities[heroId].ability2.maxTargets;
                    let i = 0;
                    do {
                        await abilities[heroId].ability2.run();
                        i++;
                    } while (
                        'maxTargets' in abilities[heroId].ability2 &&
                        i < maxTargets
                    );

                    // Record which ult was used for Echo's ability2
                    // TODO: delete localstore on unmount?
                    if (heroId !== 'echo')
                        localStorage.setItem('echoUltHeroId', heroId);

                    // Subtract ability synergy cost from row synergy
                    // Make synergy negative so that the cost is subtracted, not added
                    dispatch({
                        type: ACTIONS.UPDATE_SYNERGY,
                        payload: {
                            rowId: rowId,
                            synergyCost: Math.abs(synergyCost) * -1,
                        },
                    });

                    // Set ability as used
                    dispatch({
                        type: ACTIONS.EDIT_CARD,
                        payload: {
                            playerNum: playerTurn,
                            targetCardId: playerHeroId,
                            editKeys: ['ability2Used'],
                            editValues: [true],
                        },
                    });
                } catch (err) {
                    alert(err);
                }
            } else alert('Insufficient synergy!');
        } else alert('Play cards before using abilities!');
    }

    // Apply card effects every turn
    useEffect(() => {
        // Check the turn count has increased - ensures effects only trigger once per turn
        if (turnState.turnCount > turnRef.current.turnCount) {
            // Identify player row ids
            const playerTurn = turnState.playerTurn;
            const playerRowIds = [
                `${playerTurn}b`,
                `${playerTurn}m`,
                `${playerTurn}f`,
            ];

            // Get all effects currently applied to rows and cards
            // Run each 'turnstart' effect on each row
            for (let rowId of playerRowIds) {
                const allyRowEffects = gameState.rows[rowId].allyEffects;
                const enemyRowEffects = gameState.rows[rowId].enemyEffects;

                // Run ally row effects
                for (let effect of allyRowEffects) {
                    if (effect.on === 'turnstart') {
                        // Special handling for immortality field cleanup
                        if (effect.id === 'immortality-field' && effect.hero === 'baptiste') {
                            if (abilities[effect.hero]?.cleanupImmortalityField) {
                                abilities[effect.hero].cleanupImmortalityField(rowId);
                            }
                        } else {
                            abilities[effect.hero][effect.id].run(rowId);
                        }
                        console.log(`running ${effect.id} on ${rowId}`);
                    }
                }

                // Run ally card effects
                for (let cardId of gameState.rows[rowId].cardIds) {
                    const cardEffects =
                        gameState.playerCards[`player${playerTurn}cards`].cards[
                            cardId
                        ].allyEffects;
                    for (let effect of cardEffects) {
                        if (effect.on === 'turnstart') {
                            console.log(
                                `running ${JSON.stringify(effect)} on ${rowId}`
                            );
                            abilities[effect.hero][effect.id].run(cardId);
                        }
                    }
                }

                // Run enemy row effects
                for (let effect of enemyRowEffects) {
                    if (effect.on === 'turnstart') {
                        abilities[effect.hero][effect.id].run(rowId);
                        console.log(`running ${effect.id} on ${rowId}`);
                    }
                }

                // Run enemy card effects
                for (let cardId of gameState.rows[rowId].cardIds) {
                    const cardEffects =
                        gameState.playerCards[`player${playerTurn}cards`].cards[
                            cardId
                        ].enemyEffects;
                    for (let effect of cardEffects) {
                        if (effect.on === 'turnstart') {
                            console.log(
                                `running ${JSON.stringify(effect)} on ${rowId}`
                            );
                            abilities[effect.hero][effect.id].run(cardId);
                        }
                    }
                }
            }
        }

        // Update ref to current turn
        turnRef.current.turnCount = turnState.turnCount;
    }, [turnState, gameState.playerCards, gameState.rows]);

    // Add error handling for missing props after all hooks
    if (!playerHeroId || !rowId) {
        console.error('HeroAbilities: Missing required props', { playerHeroId, rowId });
        return null;
    }

    return (
        <div id='abilitiescontainer'>
            {'ability1' in abilities[heroId] &&
                currentCard.ability1Used === false && (
                    <div
                        id='ability1'
                        className='ability ability1'
                        onClick={activateAbility1}
                    ></div>
                )}
            {'ability2' in abilities[heroId] &&
                currentCard.ability2Used === false && (
                    <div
                        id='ability2'
                        className='ability ability2'
                        onClick={activateAbility2}
                    ></div>
                )}
        </div>
    );
}
