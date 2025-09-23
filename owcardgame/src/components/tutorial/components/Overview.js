import Counter from 'components/counters/Counter';
import React from 'react';
import { otherImages, heroIconImages } from '../../../assets/imageImports';

function Overview() {

    const powerStyle = {
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '20px',
        height: '20px',
        backgroundColor: '#fa9c1e',
        color: 'white',
        borderRadius: '50%',
        fontSize: '1.5em',
    };

    const matchStyle = {
        width: '20px',
        height: '20px',
        backgroundColor: '#fa9c1e',
        color: 'black',
        fontSize: '1.5em',
        margin: '2px',
    };

    const healthStyle = {
        width: '20px',
        height: '20px',
        fontSize: '0.8em',
        borderRadius: '100%',
    };

    const tutorialCounterStyle = {
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '50%',
        margin: '4px',
        fontFamily: 'Big-Noodle-Titling',
    };

    const synergyStyle = {
        width: '20px',
        height: '20px',
        color: 'white',
        fontSize: '1em',
        border: '3px solid steelblue',
        backgroundColor: '#3f547a',
    };

    const effectStyle = {};

    return (
        <div id='overview-content' className='tutorial-content'>
            <div
                id='overview-container'
                className='tutorial-content-container'
            >
                <div className='overview-section'>
                    <img
                        src={otherImages.overviewGif}
                        alt='Game overview'
                        className='tutorial-image'
                    />
                    <div className='tutorial-section'>
                        <div className='tutorial-heading'>
                            How to win
                        </div>
                        <span>
                            <p>
                                When a card is played, that card's
                                Power score is added to that
                                player's Power score
                                {/* <Counter value={8} styles={['power', 'tutorial']}></Counter> */}
                                <span
                                    style={{
                                        ...powerStyle,
                                        ...tutorialCounterStyle,
                                    }}
                                >
                                    8
                                </span>
                                (please see the Card Info section
                                for a detailed breakdown of the
                                cards' layout). The player with the
                                highest Power score at the end of
                                the round wins the round, with two
                                rounds needed to win the match
                                <span
                                    style={{
                                        ...matchStyle,
                                        ...tutorialCounterStyle,
                                        backgroundColor: 'aqua',
                                    }}
                                >
                                    2
                                </span>
                                <span
                                    style={{
                                        ...matchStyle,
                                        ...tutorialCounterStyle,
                                        backgroundColor: 'red',
                                    }}
                                >
                                    1
                                </span>
                                . The round is over when both
                                players have played six cards and
                                pressed the Pass button.
                            </p>
                            <p>
                                If both players have the same Power
                                score, the player with the higher
                                total Synergy wins. If both players'
                                Synergy scores are also tied, the
                                round is a draw and neither player
                                receives a win.
                            </p>
                        </span>
                    </div>
                    <div className='tutorial-section'>
                        <div className='tutorial-heading'>
                            Starting a game
                        </div>
                        <p>
                            <span>
                                Both players should begin by drawing
                                8 cards each. Then the players each
                                take turns to play one card per
                                turn. At the end of your turn, click
                                the End Turn button to allow the
                                other player to take their turn. You
                                can tell which player's turn it is
                                by which cards are facing up. To
                                find out exactly what you can do on
                                your turn, please see the Turn
                                Actions section above.
                            </span>
                        </p>
                    </div>
                    <div className='tutorial-section'>
                        <div className='tutorial-heading'>
                            Scores, abilities and counters
                        </div>

                        <span>
                            <ul className='tutorial-list'>
                                <li>
                                    <span
                                        style={{
                                            ...powerStyle,
                                            ...tutorialCounterStyle,
                                            width: '40px',
                                            height: '40px',
                                            fontSize: '2rem',
                                        }}
                                    >
                                        8
                                    </span>
                                    <span className='counter-desc'>
                                        <strong>Power: </strong>Each
                                        player has one Power score
                                        which increases as cards are
                                        played. A card's Power is
                                        subtracted from the player's
                                        Power score if it is
                                        defeated. The player with
                                        the higher power score at
                                        the end of the round wins.
                                    </span>
                                </li>
                                <li>
                                    <span
                                        style={{
                                            ...synergyStyle,
                                            ...tutorialCounterStyle,
                                            width: '40px',
                                            height: '40px',
                                            fontSize: '2rem',
                                            border: '5px solid steelblue',
                                        }}
                                    >
                                        3
                                    </span>
                                    <span className='counter-desc'>
                                        <strong>Synergy: </strong>
                                        Each row has its own Synergy
                                        score. The row's synergy
                                        increases as Heroes are
                                        played into that row.
                                        Synergy is spent when Heroes
                                        use their Ultimate Ability.
                                    </span>
                                </li>
                                <li>
                                    <span
                                        style={{
                                            ...tutorialCounterStyle,
                                            ...healthStyle,
                                            width: '40px',
                                            height: '44px',
                                            fontSize: '2rem',
                                        }}
                                        className={`healthcounter counter tutorial-counter`}
                                    >
                                        4
                                    </span>
                                    <span className='counter-desc'>
                                        <strong>Health: </strong>How
                                        much damage the Hero can
                                        take before it is defeated.
                                        A defeated Hero's Power is
                                        subtracted from the player's
                                        Power score.
                                    </span>
                                </li>
                                <li>
                                    <span
                                        style={{
                                            ...tutorialCounterStyle,
                                            ...healthStyle,
                                            width: '40px',
                                            height: '44px',
                                            fontSize: '2rem',
                                        }}
                                        className={`shieldcounter counter`}
                                    >
                                        2
                                    </span>
                                    <span className='counter-desc'>
                                        <strong>Shield: </strong>A
                                        Shield can be placed either
                                        on a specific Hero or on an
                                        entire row. If a Hero has
                                        Shield or is in a row that
                                        has Shield, the Shield will
                                        take any damage before the
                                        Hero's Health takes damage.
                                    </span>
                                </li>
                                <li>
                                    <span
                                        style={{
                                            ...effectStyle,
                                            ...tutorialCounterStyle,
                                        }}
                                        className='counter'
                                    >
                                        <img
                                            src={
                                                heroIconImages['mercy-icon']
                                            }
                                            className='counter herocounter'
                                            alt='Hero Counter'
                                        />
                                    </span>
                                    <span className='counter-desc'>
                                        <strong>Effects: </strong>
                                        There are a number of
                                        different positive and
                                        negative Effects that Heroes
                                        can apply to ally and enemy
                                        Heroes, as well as ally and
                                        enemy rows. If a Hero
                                        applies an Effect to a Hero
                                        or row, the Hero's counter
                                        will show up next to the row
                                        or on the Hero card. These
                                        counters can be clicked to
                                        show the card which applied
                                        the Effect, so that you can
                                        easily read the Ability
                                        description to understand
                                        what the Effect does.
                                    </span>
                                </li>
                            </ul>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Overview;