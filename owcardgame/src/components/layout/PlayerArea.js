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
    return (
        <div id={playerAreaId} className='playerarea row'>
            <div className='player-name-buttons'>
                <div className='playerarea-section'>
                    <h1 className='playername'>Player {props.playerNum}</h1>
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
                />
            </div>

            <div className='playercards-row'>
                <CardDisplay
                    playerNum={props.playerNum}
                    droppableId={`player${props.playerNum}hand`}
                    listClass={'handlist'}
                    rowId={playerHandId}
                    setCardFocus={props.setCardFocus}
                    direction='horizontal'
                />
            </div>
        </div>
    );
}
