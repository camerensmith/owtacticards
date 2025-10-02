import React, { useContext } from 'react';
import PlayerHand from './PlayerButtons';
import PowerCounter from '../counters/PowerCounter';
import gameContext from 'context/gameContext';
import CardDisplay from 'components/layout/CardDisplay';

export default function PlayerArea(props) {
    const { gameState } = useContext(gameContext);
    const { playerNum } = props;

    const playerAreaId = `player${playerNum}area`;
    const totalPower = props.totalPower;
    const playerHandId = `player${playerNum}hand`;
    const isAIPlayer = playerNum === 2;

    // Get hand size for AI player
    const handSize = gameState.rows[playerHandId]?.cardIds?.length || 0;

    return (
        <div id={playerAreaId} className='playerarea row'>
            <div className='player-name-buttons'>
                <div className='playerarea-section'>
                    <h1 className='playername'>Player {props.playerNum} {isAIPlayer && '🤖'}</h1>
                    <PowerCounter
                        playerNum={props.playerNum}
                        power={totalPower}
                    />
                </div>
                <PlayerHand
                    setCardFocus={props.setCardFocus}
                    playerNum={props.playerNum}
                    nextCardDraw={props.nextCardDraw}
                    setNextCardDraw={props.setNextCardDraw}
                    gameLogic={props.gameLogic}
                    trackDrawnHero={props.trackDrawnHero}
                />
            </div>

            <div className='playercards-row'>
                {isAIPlayer ? (
                    <div className='ai-hand-placeholder'>
                        <div className='ai-hand-info'>
                            {handSize} cards in hand
                        </div>
                    </div>
                ) : (
                    <CardDisplay
                        playerNum={props.playerNum}
                        droppableId={`player${props.playerNum}hand`}
                        listClass={'handlist'}
                        rowId={playerHandId}
                        setCardFocus={props.setCardFocus}
                        direction='horizontal'
                    />
                )}
            </div>
        </div>
    );
}
