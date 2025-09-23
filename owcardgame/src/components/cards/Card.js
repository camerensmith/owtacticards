import React, { useContext, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import CardEffects from 'components/cards/CardEffects';
import HealthCounter from 'components/counters/HealthCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import { heroCardImages } from '../../assets/imageImports';

export default function Card(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const { turnState, setTurnState } = useContext(turnContext);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Variables
    const playerHeroId = props.playerHeroId;
    const playerNum = props.playerNum;
    const playerCardsId = `player${playerNum}cards`;
    const rowId = props.rowId;
    const rowPosition = rowId[1];
    const index = props.index;

    // Get card attributes from relevant player
    const {
        id,
        name,
        health,
        power,
        synergy,
        shield,
        enemyEffects,
        allyEffects,
        isPlayed,
        isDiscarded,
    } = gameState.playerCards[playerCardsId].cards[playerHeroId];

    function getStyle(style, snapshot) {
        if (!snapshot.isDropAnimating) return style;
        return {
            ...style,
            transitionDuration: '0.001s',
        };
    }

    return isDiscarded ? null : (
        <Draggable
            draggableId={playerHeroId}
            index={index}
            isDragDisabled={isPlayed || turnState.playerTurn !== playerNum}
        >
            {(provided, snapshot) => (
                <div className={`cardcontainer`}>
                    <li
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${
                            snapshot.isDragging ? 'dragging' : 'not-dragging'
                        }`}
                        ref={provided.innerRef}
                        style={getStyle(
                            provided.draggableProps.style,
                            snapshot
                        )}
                    >
                        {playerNum === 2 ? (
                            <CardEffects
                                type='enemy'
                                effects={enemyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        ) : (
                            <CardEffects
                                type='ally'
                                effects={allyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        )}
                        <div
                            id={`${playerHeroId}`}
                            className={`card ${health > 0 ? 'alive' : 'dead'}`}
                            onClick={
                                turnState.playerTurn === playerNum || isPlayed
                                    ? () => {
                                          props.setCardFocus({
                                              playerHeroId: playerHeroId,
                                              rowId: rowId,
                                          });
                                      }
                                    : null
                            }
                        >
                            {imageLoaded === playerHeroId &&
                                (turnState.playerTurn === playerNum ||
                                isPlayed ? (
                                    <HealthCounter
                                        type='cardcounter'
                                        health={health}
                                    />
                                ) : null)}
                            {turnState.playerTurn === playerNum || isPlayed
                                ? shield > 0 && (
                                      <ShieldCounter
                                          type='cardcounter'
                                          shield={shield}
                                      />
                                  )
                                : null}
                            <img
                                onLoad={() => setImageLoaded(playerHeroId)}
                                src={
                                    turnState.playerTurn === playerNum ||
                                    isPlayed
                                        ? heroCardImages[id]
                                        : heroCardImages['card-back']
                                }
                                className={`cardimg ${
                                    turnState.playerTurn === playerNum ||
                                    isPlayed
                                        ? 'show-card'
                                        : 'hide-card'
                                }`}
                                alt={`${name} Card`}
                            />
                        </div>
                        {playerNum === 2 ? (
                            <CardEffects
                                type='ally'
                                effects={allyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        ) : (
                            <CardEffects
                                type='enemy'
                                effects={enemyEffects}
                                setCardFocus={props.setCardFocus}
                            />
                        )}
                    </li>
                </div>
            )}
        </Draggable>
    );
}
