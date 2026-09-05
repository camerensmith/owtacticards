import React, { useContext, useEffect, useState } from 'react';
import gameContext from 'context/gameContext';
import SynergyCounter from 'components/counters/SynergyCounter';
import ShieldCounter from 'components/counters/ShieldCounter';
import CounterArea from 'components/layout/CounterArea';
import CardDisplay from 'components/layout/CardDisplay';
import ImmortalityFieldOverlay from 'components/effects/ImmortalityFieldOverlay';
import CryoFreezeOverlay from 'components/effects/CryoFreezeOverlay';
import OrisaBarrierOverlay from 'components/effects/OrisaBarrierOverlay';
import WreckingBallTokenOverlay from 'components/effects/WreckingBallTokenOverlay';
import CardFocusLite from 'components/cards/CardFocusLite';
import { ACTIONS } from 'App';
import { isOverflown } from 'helper';
import { getCardFromState } from '../../game/cardLookup';
import { clampBlocksMovement } from '../../game/abilityRules';
import { cardPowerContribution } from '../../game/disorient';
import { isCloakedMantis, oppositeRowId } from '../../game/mantis';

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

        // For every card in the row (that is alive), add up the power values.
        // Cloaked Mantis on an enemy row does not feed that enemy's power total.
        for (let cardId of gameState.rows[rowId].cardIds) {
            const card = getCardFromState(gameState, cardId);
            if (!card || card.health <= 0) continue;
            if (isCloakedMantis(card) && String(cardId[0]) !== String(playerNum)) continue;
            playerPower += cardPowerContribution(card, rowPosition);
        }

        // Cloaked Mantis on the opposite enemy row still powers THIS (owner) row.
        const oppId = oppositeRowId(rowId);
        if (oppId) {
            for (const cardId of gameState.rows[oppId]?.cardIds || []) {
                const card = getCardFromState(gameState, cardId);
                if (!card || card.health <= 0) continue;
                if (!isCloakedMantis(card)) continue;
                if (String(cardId[0]) !== String(playerNum)) continue;
                playerPower += cardPowerContribution(card, rowPosition);
            }
        }

        // Every board change runs this effect in all six rows. Dispatching an
        // unchanged total would put six more reducer passes through a state
        // tree this size for nothing, so only a real change is written.
        const current = gameState.rows[`player${playerNum}hand`]?.power?.[rowPosition];
        if (playerPower === current) return;

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

    const isLocked = !!gameState.rows[rowId]?.locked;
    const isClamped = clampBlocksMovement(gameState.rows[rowId]);

    return (
        <div id={rowId} className={`rowarea row ${isLocked ? 'row-locked' : ''} ${isClamped ? 'row-clamped' : ''}`}>
            <div className='rowcountercontainer'>
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
                    
                    {/* Render Cryo Freeze overlays for each frozen hero in this row */}
                    {gameState.rows[rowId].cardIds.map(cardId => {
                        const card = gameState.playerCards[`player${playerNum}cards`]?.cards?.[cardId];
                        if (card && Array.isArray(card.effects) && 
                            card.effects.some(effect => effect?.id === 'cryo-freeze')) {
                            return (
                                <CryoFreezeOverlay
                                    key={`cryo-freeze-${cardId}`}
                                    playerHeroId={cardId}
                                    rowId={rowId}
                                />
                            );
                        }
                        return null;
                    })}
                    
                    {/* Render Orisa Protective Barrier overlay for this row */}
                    <OrisaBarrierOverlay rowId={rowId} />
                    
                    {/* Render Wrecking Ball Minefield token overlay for this row */}
                    <WreckingBallTokenOverlay rowId={rowId} />
                    
                </div>
                <CardFocusLite focus={props.cardFocus && props.cardFocus.playerHeroId ? props.cardFocus : null} onClose={() => props.setCardFocus('invisible')} />
            </div>
            <div className='row-synergy'>
                <SynergyCounter synergy={synergyValue} />
            </div>
        </div>
    );
}
