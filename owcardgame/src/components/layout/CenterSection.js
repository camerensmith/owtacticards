import MatchCounter from 'components/counters/MatchCounter';

function CenterSection(props) {

    return (
        <div id='center-section-container'>
            <div id='center-section'>
                <span>Match</span>
                <div id='match-counters'>
                    <MatchCounter
                        playerNum={1}
                        matchState={props.matchState}
                    />
                    <MatchCounter
                        playerNum={2}
                        matchState={props.matchState}
                    />
                </div>
                <span>Score</span>
            </div>
        </div>
    );
}

export default CenterSection;