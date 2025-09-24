import React, { useContext, useState, useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import gameContext from 'context/gameContext';
import turnContext from 'context/turnContext';
import CardEffects from 'components/cards/CardEffects';
import HealthCounter from 'components/counters/HealthCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import { heroCardImages } from '../../assets/imageImports';
import ContextMenu from './ContextMenu';
import actionsBus, { Actions } from '../../abilities/engine/actionsBus';

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

    const [menu, setMenu] = useState(null);

    function buildContextMenu(e) {
        e.preventDefault();
        if (turnState.playerTurn !== playerNum) return;
        const items = [];
        items.push({
            label: 'Ultimate',
            onClick: () => {
                // Get current row synergy and ultimate cost
                const currentRow = gameState.rows[rowId];
                const currentSynergy = currentRow ? currentRow.synergy : 0;
                const ultimateCost = 3; // Default cost, could be made dynamic based on hero
                
                actionsBus.publish(Actions.requestUltimate(playerHeroId, rowId, ultimateCost));
                setMenu(null);
            },
        });
        if (id === 'ramattra') {
            items.push({
                label: 'Transform',
                onClick: () => {
                    actionsBus.publish(Actions.requestTransform(playerHeroId));
                    setMenu(null);
                },
            });
        }
        setMenu({ x: e.clientX, y: e.clientY, items });
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
                        onContextMenu={buildContextMenu}
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
                                (turnState.playerTurn === playerNum || isPlayed)
                                    ? (e) => {
                                          // Only focus card on SHIFT + LEFT CLICK
                                          if (e.shiftKey) {
                                              props.setCardFocus({
                                                  playerHeroId: playerHeroId,
                                                  rowId: rowId,
                                              });
                                          }
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
                        {menu && (
                            <ContextMenu
                                x={menu.x}
                                y={menu.y}
                                items={menu.items}
                                onClose={() => setMenu(null)}
                            />
                        )}
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
