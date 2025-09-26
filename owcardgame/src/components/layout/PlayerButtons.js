import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import data from 'data';
import getRandInt from 'helper';
import { ACTIONS } from 'App';
import { playGameEvent } from '../../abilities/engine/soundController';
import { cancelTargeting } from '../../abilities/engine/targeting';
import { getAudioFile } from '../../assets/imageImports';
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

    // Draw a card at the start of the player's turn (except for the very first turn)
    useEffect(() => {
        // Only draw if it's this player's turn and it's not the first turn of the game
        if (turnState.playerTurn === playerNum && turnState.turnCount > 1) {
            const currentHandSize = gameState.rows[`player${playerNum}hand`].cardIds.length;
            if (currentHandSize < gameLogic.maxHandSize) {
                drawCards();
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
                                  setTurnState((prevState) => ({
                                      ...prevState,
                                      turnCount: prevState.turnCount + 1,
                                      playerTurn: 2,
                                  }));
                              }
                            : () => {
                                  playGameEvent('endturn');
                                  try { cancelTargeting(); } catch {}
                                  setTurnState((prevState) => ({
                                      ...prevState,
                                      turnCount: prevState.turnCount + 1,
                                      playerTurn: 1,
                                  }));
                              }
                    }
                    title={isTargeting ? 'Finish or cancel the current ability first' : ''}
                >
                    End Turn
                </button>
            </div>
            <button
                disabled={
                    !(
                        gameState.rows[`player${playerNum}hand`].cardsPlayed >=
                        6
                    ) || turnState[`player${playerNum}Passed`] === true
                }
                className='passbutton'
                onClick={() => {
                    setTurnState((prevState) => ({
                        ...prevState,
                        [`player${playerNum}Passed`]: true,
                    }));
                }}
            >
                Pass
            </button>
        </div>
    );
}
