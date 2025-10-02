import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import data from 'data';
import getRandInt from 'helper';
import { ACTIONS } from 'App';
import { playGameEvent } from '../../abilities/engine/soundController';
import { cancelTargeting, selectCardTarget } from '../../abilities/engine/targeting';
import { getAudioFile, clearDeadCursor } from '../../assets/imageImports';
import { showMessage as showToast, clearMessage as clearToast } from '../../abilities/engine/targetingBus';
import targetingBus from '../../abilities/engine/targetingBus';

export default function PlayerHand(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState, setTurnState } = useContext(turnContext);

    // Variables
    const playerNum = parseInt(props.playerNum);
    const playerHandId = `player${playerNum}hand`;
    const playerCardsId = `player${playerNum}cards`;
    const handCards = gameState.rows[playerHandId].cardIds;
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

    // Track whether we're in clear mode (for custom cursor)
    const [isClearMode, setIsClearMode] = useState(false);

    // Apply custom cursor when in clear mode
    useEffect(() => {
        if (isClearMode) {
            document.body.style.cursor = `url(${clearDeadCursor}) 16 16, auto`;
        } else {
            document.body.style.cursor = 'default';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.cursor = 'default';
        };
    }, [isClearMode]);

    // Handle Clear button click - remove dead heroes from board
    const handleClearButtonClick = async () => {
        // If already in clear mode, exit it
        if (isClearMode) {
            setIsClearMode(false);
            clearToast();
            showToast('Exited clear mode');
            setTimeout(() => clearToast(), 1500);
            return;
        }

        setIsClearMode(true);
        showToast('Clear: Click on a dead hero to remove it from the board');
        
        try {
            const target = await selectCardTarget();
            if (!target) { 
                clearToast(); 
                setIsClearMode(false);
                return; 
            }
            
            const targetCard = gameState.playerCards[`player${parseInt(target.cardId[0])}cards`]?.cards?.[target.cardId];
            const targetPlayerNum = parseInt(target.cardId[0]);
            
            // Check if target is on the current player's side
            if (targetPlayerNum !== playerNum) {
                showToast('Clear: You can only clear dead heroes on your own side');
                setTimeout(() => clearToast(), 2000);
                return; // Stay in clear mode to try again
            }
            
            // Check if target is dead (health <= 0)
            if (!targetCard || targetCard.health > 0) {
                showToast('Clear: Target must be a dead hero (health <= 0)');
                setTimeout(() => clearToast(), 2000);
                return; // Stay in clear mode to try again
            }
            
            // Remove the dead card
            dispatch({
                type: ACTIONS.REMOVE_DEAD_CARD,
                payload: { cardId: target.cardId }
            });
            
            clearToast();
            showToast(`Cleared ${targetCard.name || 'dead hero'} from the board`);
            setTimeout(() => clearToast(), 2000);
            
            // Ask if user wants to clear another dead hero
            showToast('Clear: Click another dead hero or right-click to exit clear mode');
            
        } catch (error) {
            console.error('Clear button error:', error);
            showToast('Clear cancelled');
            setTimeout(() => clearToast(), 1500);
            setIsClearMode(false);
        }
    };

    // Draw a card at the start of the player's turn (except for the very first turn)
    useEffect(() => {
        // Only draw if it's this player's turn and it's not the first turn of the game
        if (turnState.playerTurn === playerNum && turnState.turnCount > 1) {
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
        return Object.keys(data.heroes).filter(heroId => 
            !drawnHeroes.includes(heroId) && 
            !data.heroes[heroId].special // Special cards can only be spawned, not drawn
        );
    };

    // Draws one random card and puts the card into the player's hand
    function drawCards(playIntroSound = true) {
        // Check if hand is at maximum size (6 cards)
        const currentHandSize = gameState.rows[`player${playerNum}hand`].cardIds.length;
        if (currentHandSize >= gameLogic.maxHandSize) {
            console.log(`Player ${playerNum} hand is full (${currentHandSize}/${gameLogic.maxHandSize} cards)`);
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
            return;
        }

        // Draw a random card from available heroes
        const availableHeroes = getAvailableHeroes();
        if (availableHeroes.length === 0) {
            console.log(`Player ${playerNum} has no more heroes available to draw`);
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

        // Play intro sound if requested (not during initial setup)
        if (playIntroSound) {
            try {
                const introAudioSrc = getAudioFile(`${newCardId}-intro`);
                if (introAudioSrc) {
                    console.log(`Playing ${newCardId} intro sound...`);
                    const introAudio = new Audio(introAudioSrc);
                    introAudio.play().then(() => {
                        console.log(`${newCardId} intro sound played successfully`);
                    }).catch(err => {
                        console.log(`${newCardId} intro sound play failed:`, err);
                    });
                }
            } catch (err) {
                console.log(`${newCardId} intro audio creation failed:`, err);
            }
        }
    }

    return (
        <div className='playerbuttons'>
            <div className='common-buttons'>
                <div
                    className='hand-indicator'
                >
                    Hand ({handCards.length}/{gameLogic.maxHandSize})
                </div>
                <button
                    disabled={!(turnState.playerTurn === playerNum) || isTargeting}
                    className='endturnbutton'
                    onClick={
                        turnState.playerTurn === 1
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
                                      turnCount: Math.min(prevState.turnCount + 1, 14),
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
                                      turnCount: Math.min(prevState.turnCount + 1, 14),
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
            <button
                className={`clearbutton ${isClearMode ? 'clearbutton-active' : ''}`}
                onClick={() => {
                    handleClearButtonClick();
                }}
            >
                {isClearMode ? 'Exit Clear' : 'Clear'}
            </button>
        </div>
    );
}
