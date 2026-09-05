import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import data from 'data';
import getRandInt from 'helper';
import { ACTIONS } from 'App';
import { playGameEvent, playClip } from '../../abilities/engine/soundController';
import { cancelTargeting } from '../../abilities/engine/targeting';
import { showMessage as showToast, clearMessage as clearToast } from '../../abilities/engine/targetingBus';
import { TURBOJACK_MARK } from '../../game/rules';
import targetingBus from '../../abilities/engine/targetingBus';
import Graveyard from './Graveyard';
import { deckCounts, shouldReshuffle } from '../../game/graveyard';
import { shouldDrawOnTurnStart } from '../../game/openingDeal';
import { excludeQueuedFromPool } from '../../game/drawQueue';

export default function PlayerHand(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState, setTurnState } = useContext(turnContext);

    // Variables
    const playerNum = parseInt(props.playerNum);
    const playerHandId = `player${playerNum}hand`;
    const playerCardsId = `player${playerNum}cards`;
    const nextCardDraw = props.nextCardDraw;
    const setNextCardDraw = props.setNextCardDraw;
    const setCardFocus = props.setCardFocus;
    const gameLogic = props.gameLogic;
    const trackDrawnHero = props.trackDrawnHero;

    // Track whether a targeting flow is active (disables End Turn)
    const [isTargeting, setIsTargeting] = useState(false);
    useEffect(() => {
        const unsub = targetingBus.subscribe((msg) => setIsTargeting(!!msg));
        return unsub;
    }, []);

    // Deck counter: how many heroes are still drawable, out of the full deck.
    const drawnHeroes = gameLogic[`player${playerNum}DrawnHeroes`] || [];
    const deck = deckCounts({ heroes: data.heroes, drawnHeroes });

    // Draw a card at the start of the player's turn, after both opening turns.
    // Opening hands are already asymmetric (first 4 / second 5), so turn 1 and
    // turn 2 must not draw again.
    useEffect(() => {
        // Practice deals nothing: you add exactly the cards you want to test.
        const shouldDraw = !window.__ow_practiceMode
            && turnState.playerTurn === playerNum
            && shouldDrawOnTurnStart(turnState.turnCount);
        if (shouldDraw) {
            // Prevent duplicate draws within the same player's turn
            if (!window.__ow_lastDraw || window.__ow_lastDraw.player !== playerNum || window.__ow_lastDraw.turn !== turnState.turnCount) {
                const currentHandSize = gameState.rows[`player${playerNum}hand`].cardIds.length;
                if (currentHandSize < gameLogic.maxHandSize) {
                    // Don't play intro sounds for AI (Player 2) draws
                    const isAITurn = playerNum === 2;
                    drawCards(!isAITurn);
                    window.__ow_lastDraw = { player: playerNum, turn: turnState.turnCount };
                }
            }
        }
    }, [turnState.playerTurn, turnState.turnCount]);

    // Helper function to get available heroes for drawing
    const getAvailableHeroes = () => {
        const drawnHeroes = playerNum === 1 ? gameLogic.player1DrawnHeroes : gameLogic.player2DrawnHeroes;
        const pool = Object.keys(data.heroes).filter(heroId => 
            !drawnHeroes.includes(heroId) && 
            !data.heroes[heroId].special // Special cards can only be spawned, not drawn
        );
        const queued = window.__ow_getDrawQueue?.(playerNum) || [];
        return excludeQueuedFromPool(pool, queued);
    };

    // Draws one random card and puts the card into the player's hand
    function playDrawCardSound() {
        try { playClip('drawcard'); } catch {}
    }

    function drawCards(playIntroSound = true) {
        // Check if hand is at maximum size (6 cards)
        const currentHandSize = gameState.rows[`player${playerNum}hand`].cardIds.length;
        if (currentHandSize >= gameLogic.maxHandSize) {
            console.log(`Player ${playerNum} hand is full (${currentHandSize}/${gameLogic.maxHandSize} cards)`);
            return;
        }

        const pending = window.__ow_peekReshuffle?.(playerNum);
        if (pending) {
            const playerHeroId = `${playerNum}${pending.heroId}`;
            dispatch({
                type: ACTIONS.ADD_CARD_TO_HAND,
                payload: { playerNum, playerHeroId },
            });
            window.__ow_setCardHealth?.(playerHeroId, pending.health, true);
            if (pending.turbojacked) {
                // Put the mark back on the card so the banner shows in hand and
                // its on-enter stays suppressed when it is played.
                window.__ow_appendCardEffect?.(playerHeroId, {
                    id: TURBOJACK_MARK,
                    hero: 'cyclo',
                    type: 'debuff',
                    tooltip: 'Turbojack: thrown back into the deck — no on-enter when replayed',
                });
            }
            window.__ow_shiftReshuffleBag?.(playerNum);
            playDrawCardSound();
            return;
        }

        // Vega Temporal Rift: reserved upcoming draws ahead of the random pool.
        const queuedHeroId = window.__ow_peekDrawQueue?.(playerNum);
        if (queuedHeroId) {
            const playerHeroId = `${playerNum}${queuedHeroId}`;
            dispatch({
                type: ACTIONS.CREATE_CARD,
                payload: { playerNum, heroId: queuedHeroId },
            });
            dispatch({
                type: ACTIONS.ADD_CARD_TO_HAND,
                payload: { playerNum, playerHeroId },
            });
            window.__ow_shiftDrawQueue?.(playerNum);
            trackDrawnHero(queuedHeroId, playerNum);
            playDrawCardSound();
            if (playIntroSound) playClip(`${queuedHeroId}-intro`);
            return;
        }

        // Draw specific card designated by nextCardDraw state (for special cards like BOB, MEKA, etc.)
        if (nextCardDraw[`player${playerNum}`] !== null) {
            const heroId = nextCardDraw[`player${playerNum}`];
            const playerHeroId = `${playerNum}${heroId}`;
            
            dispatch({
                type: ACTIONS.CREATE_CARD,
                payload: {
                    playerNum: playerNum,
                    heroId: heroId,
                },
            });
            
            dispatch({
                type: ACTIONS.ADD_CARD_TO_HAND,
                payload: {
                    playerNum: playerNum,
                    playerHeroId: playerHeroId,
                },
            });
            
            setNextCardDraw((prevState) => ({
                ...prevState,
                [`player${playerNum}`]: null,
            }));
            
            // Special cards don't count against the unique hero rule
            playDrawCardSound();
            return;
        }

        // Draw a random card from available heroes.
        //
        // The pool is every hero not yet drawn this match, so the dead are not
        // in it: what goes to the graveyard stays in the graveyard. The deck is
        // never refilled from it — a hero is dealt once and once only.
        const availableHeroes = getAvailableHeroes();

        if (availableHeroes.length === 0) {
            showToast(`Player ${playerNum}: deck is empty`);
            setTimeout(() => clearToast(), 2000);
            return;
        }

        const randInt = getRandInt(0, availableHeroes.length);
        const newCardId = availableHeroes[randInt];
        const playerHeroId = `${playerNum}${newCardId}`;

        dispatch({
            type: ACTIONS.CREATE_CARD,
            payload: { playerNum: playerNum, heroId: newCardId },
        });

        dispatch({
            type: ACTIONS.ADD_CARD_TO_HAND,
            payload: {
                playerNum: playerNum,
                playerHeroId: playerHeroId,
            },
        });

        // Track drawn hero
        trackDrawnHero(newCardId, playerNum);
        console.log(`Player ${playerNum} drew ${newCardId}`);
        playDrawCardSound();

        // Play intro sound if requested (not during initial setup)
        if (playIntroSound) {
            playClip(`${newCardId}-intro`);
        }
    }

    return (
        <div className='playerbuttons'>
            <div className='common-buttons'>
                <div
                    className='hand-indicator'
                    title='Cards left in your deck'
                >
                    Deck ({deck.remaining}/{deck.total})
                </div>
                <button
                    disabled={!(turnState.playerTurn === playerNum) || isTargeting || props.theaterLocked}
                    className='endturnbutton'
                    onClick={
                        props.theaterLocked
                            ? undefined
                            : turnState.playerTurn === 1
                            ? () => {
                                  playGameEvent('endturn');
                                  try { cancelTargeting(); } catch {}
                                  // Prevent duplicate increment in same logical turn
                                  if (window.__ow_lastTurnAdvance && window.__ow_lastTurnAdvance.turn === turnState.turnCount && window.__ow_lastTurnAdvance.from === 1) {
                                      console.warn('Skipping duplicate Player 1 end turn advance');
                                      return;
                                  }
                                  setTurnState((prevState) => ({
                                      ...prevState,
                                      turnCount: Math.min(prevState.turnCount + 1, 18),
                                      playerTurn: 2,
                                  }));
                                  window.__ow_lastTurnAdvance = { turn: turnState.turnCount, from: 1 };
                              }
                            : () => {
                                  playGameEvent('endturn');
                                  try { cancelTargeting(); } catch {}
                                  if (window.__ow_lastTurnAdvance && window.__ow_lastTurnAdvance.turn === turnState.turnCount && window.__ow_lastTurnAdvance.from === 2) {
                                      console.warn('Skipping duplicate Player 2 end turn advance');
                                      return;
                                  }
                                  setTurnState((prevState) => ({
                                      ...prevState,
                                      turnCount: Math.min(prevState.turnCount + 1, 18),
                                      playerTurn: 1,
                                  }));
                                  window.__ow_lastTurnAdvance = { turn: turnState.turnCount, from: 2 };
                              }
                    }
                    title={isTargeting ? 'Finish or cancel the current ability first' : ''}
                >
                    End Turn
                </button>
            </div>
            <Graveyard playerNum={playerNum} />
        </div>
    );
}
