import MatchCounter from 'components/counters/MatchCounter';

function CenterSection(props) {
    const { matchState, gameLogic, turnState } = props;

    return (
        <div id='center-section-container'>
            <div id='center-section'>
                <span>Match</span>
                <div id='match-counters'>
                    <MatchCounter
                        playerNum={1}
                        matchState={matchState}
                    />
                    <MatchCounter
                        playerNum={2}
                        matchState={matchState}
                    />
                </div>
                <span>Score</span>
                
                {/* Turn Information */}
                <div id='turn-info'>
                    <div className='turn-display'>
                        <span>Round {gameLogic.currentRound}/3</span>
                        <span>Turn {turnState.turnCount}</span>
                    </div>
                    <div className='player-turns'>
                        <span>P1: {gameLogic.player1Turns}/7</span>
                        <span>P2: {gameLogic.player2Turns}/7</span>
                    </div>
                    <div className='deployment-count'>
                        <span>P1 Heroes: {gameLogic.player1Deployed || 0}/6</span>
                        <span>P2 Heroes: {gameLogic.player2Deployed || 0}/6</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CenterSection;