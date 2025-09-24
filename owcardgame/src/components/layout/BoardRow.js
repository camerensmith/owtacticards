import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';
import SynergyCounter from 'components/counters/SynergyCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import CounterArea from 'components/layout/CounterArea';
import CardDisplay from 'components/layout/CardDisplay';
import ImmortalityFieldOverlay from 'components/effects/ImmortalityFieldOverlay';
import CardFocusLite from 'components/cards/CardFocusLite';
import { ACTIONS } from 'App';
import { isOverflown } from 'helper';

export default function BoardRow(props) {
    // Context
    const { gameState, dispatch } = useContext(gameContext);
    const [isOverflown, setIsOverflown] = useState(false);

    // Variables
    const rowId = props.rowId;
    const rowPosition = props.rowId[1];
    const playerNum = props.playerNum;
    const synergyValue = gameState.rows[rowId].synergy;
    const rowShield = gameState.rows[rowId].totalShield();

    // Update synergy and power values anytime a card moves row
    useEffect(() => {
        let playerPower = 0;

        // For every card in the row (that is alive), add up the power values
        for (let cardId of gameState.rows[rowId].cardIds) {
            if (
                gameState.playerCards[`player${playerNum}cards`].cards[cardId]
                    .health > 0
            ) {
                playerPower +=
                    gameState.playerCards[`player${playerNum}cards`].cards[
                        cardId
                    ].power[rowPosition];
            }
        }

        // Set power state
        dispatch({
            type: ACTIONS.SET_POWER,
            payload: {
                playerNum: playerNum,
                rowPosition: rowPosition,
                powerValue: playerPower,
            },
        });
    }, [
        gameState.rows,
        gameState.playerCards,
        dispatch,
        playerNum,
        rowId,
        rowPosition,
    ]);

    // Detect if board row is overflown, and set class if it is

    // TODO: not performing well
    // $(function () {
    //   const boardRow = document.getElementById(`${rowId}-boardrow`);
    //   const rowList = document.getElementById(`${rowId}-list`);
    //   const resizeObserver = new ResizeObserver((element) => {
    //     if (checkIsOverflown(boardRow)) {
    //       console.log(`${rowId} overflown`);
    //       setIsOverflown(true);
    //     } else {
    //       setIsOverflown(false);
    //     }
    //   });
    //   resizeObserver.observe(boardRow);
    // });

    return (
        <div id={rowId} className='rowarea row'>
            <div className='rowcountercontainer'>
                <SynergyCounter synergy={synergyValue} />
                <div className='rowcountercontainer2'>
                    {rowShield > 0 && (
                        <ShieldCounter type='rowcounter' shield={rowShield} />
                    )}
                    <CounterArea
                        type={'row'}
                        setCardFocus={props.setCardFocus}
                        playerNum={props.playerNum}
                        rowId={props.rowId}
                    />
                </div>
            </div>
            <div
                id={`${rowId}-boardrow`}
                className={`boardrow ${isOverflown ? 'overflown' : ''}`}
            >
                <div className='rowlabel'>
                    <span>{props.label}</span>
                    <span>Row</span>
                </div>
                <div style={{ position: 'relative', zIndex: 0 }} data-row-id={rowId}>
                    <CardDisplay
                        playerNum={props.playerNum}
                        droppableId={props.rowId}
                        listClass='rowlist'
                        rowId={props.rowId}
                        setCardFocus={props.setCardFocus}
                    />
                    {/* Render Immortality Field overlays for each Baptiste in this row */}
                    {gameState.rows[rowId].cardIds.map(cardId => {
                        const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
                        if (card && card.id === 'baptiste') {
                            return (
                                <ImmortalityFieldOverlay
                                    key={`immortality-${cardId}`}
                                    playerHeroId={cardId}
                                    rowId={rowId}
                                />
                            );
                        }
                        return null;
                    })}
                </div>
                <CardFocusLite focus={props.cardFocus && props.cardFocus.playerHeroId ? props.cardFocus : null} onClose={() => props.setCardFocus('invisible')} />
            </div>
        </div>
    );
}
