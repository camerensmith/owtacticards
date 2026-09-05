import React, { useContext, useEffect, useState } from 'react';
import Card from 'components/cards/Card';
import { Droppable } from 'react-beautiful-dnd';
import gameContext from 'context/gameContext';
import { isOverflown } from 'helper';

export default function CardDisplay(props) {
    // Context & State
    const { gameState } = useContext(gameContext);

    // If a direction prop is passed in, use that for the direction.
    // Otherwise, dynamically alter direction based on window width
    const [rowDirection, setRowDirection] = useState(
        props.direction
            ? props.direction
            : window.innerWidth > 1300
            ? 'vertical'
            : 'horizontal'
    );
    // One listener for the life of the component. This used to be registered
    // during render, so every one of the many re-renders a match causes left
    // another listener attached — by mid-game a single resize ran hundreds of
    // them, and none were ever released.
    const fixedDirection = props.direction;
    useEffect(() => {
        if (fixedDirection) return undefined;
        const onResize = () =>
            setRowDirection(window.innerWidth > 1300 ? 'vertical' : 'horizontal');
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [fixedDirection]);

    // Variables
    const { rowId, playerNum, listClass, droppableId } = props;
    const cards = gameState.rows[rowId].cardIds;
    const [overflown, setOverflown] = useState(false);

    // Checks if the row is overflown so that it can position cards inside correctly
    useEffect(() => {
        setOverflown(isOverflown(document.getElementById(`${rowId}-list`)));
    }, [setOverflown, rowId, cards]);

    // Add error boundary for droppable areas
    if (!droppableId) {
        console.error('CardDisplay: droppableId is required');
        return null;
    }

    return (
        <div id={`${rowId}-carddisplay`} className={`carddisplay-container`}>
            <Droppable
                droppableId={droppableId}
                direction={rowDirection}
                isDropDisabled={!!props.faceDown}
            >
                {(provided, snapshot) => {
                    if (!provided) {
                        console.error('CardDisplay: Droppable provided is null for', droppableId);
                        return null;
                    }
                    return (
                        <ul
                            id={`${rowId}-list`}
                            className={`cardlist ${listClass} ${
                                overflown ? 'overflown' : ''
                            } ${rowDirection}  ${
                                snapshot.isDraggingOver ? 'dragging-over' : ''
                            }`}
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {cards &&
                                cards.map((cardId, index) => {
                                    return (
                                        <Card
                                            setCardFocus={props.setCardFocus}
                                            playerHeroId={cardId}
                                            key={cardId}
                                            playerNum={playerNum}
                                            rowId={props.rowId}
                                            index={index}
                                            faceDown={props.faceDown}
                                        />
                                    );
                                })}
                            {provided.placeholder}
                        </ul>
                    );
                }}
            </Droppable>
        </div>
    );
}
