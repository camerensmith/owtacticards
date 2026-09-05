import React, { useContext } from 'react';
import PlayerHand from './PlayerButtons';
import PowerCounter from '../counters/PowerCounter';
import gameContext from 'context/gameContext';
import CardDisplay from 'components/layout/CardDisplay';
import { heroCardImages } from '../../assets/imageImports';
import { isOpponentSeat } from '../../game/practice';

export default function PlayerArea(props) {
    const { gameState } = useContext(gameContext);
    const { playerNum } = props;

    const playerAreaId = `player${playerNum}area`;
    const totalPower = props.totalPower ?? gameState.rows[`player${playerNum}hand`].totalPower();
    const playerHandId = `player${playerNum}hand`;
    // In practice the human holds both seats, so player 2 is neither AI-badged
    // nor hidden behind card backs.
    const isAIPlayer = isOpponentSeat(playerNum, props.practiceMode);

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
                    reshuffleGraveyardIntoDeck={props.reshuffleGraveyardIntoDeck}
                    theaterLocked={props.theaterLocked}
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
                    faceDown={isAIPlayer}
                />
                {props.isShuffling ? (
                    <div className='hand-shuffle' aria-hidden='true'>
                        <img src={heroCardImages['card-back']} alt='' className='hand-shuffle-card' />
                        <img src={heroCardImages['card-back']} alt='' className='hand-shuffle-card' />
                        <img src={heroCardImages['card-back']} alt='' className='hand-shuffle-card' />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
