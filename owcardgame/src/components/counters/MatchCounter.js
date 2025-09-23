import React from 'react';

export default function MatchCounter(props) {
    const matchState = props.matchState;
    const playerNum = props.playerNum;

    return (
        <div className='matchcountercontainer'>
            <div
                id={`player${playerNum}matchcounter`}
                className='matchcounter counter'
            >
                {matchState[`player${playerNum}`].wins}
            </div>
        </div>
    );
}
