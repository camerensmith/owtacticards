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
            <div id='overview-container' className='tutorial-content-container'>
                <div className='overview-section'>
                    <div className='tutorial-section'>
                        <div className='tutorial-heading'>Credits</div>
                        <div>
                            <p>Initial card design and concept: u/barberian912</p>
                            <p>Digitisation by Nathan H Miles</p>
                            <p>Ability overhaul, balance, AI mechanics, new cards, updated methods and other improvements by Cam Smith</p>
                        </div>
                    </div>
                    <div className='tutorial-section' style={{ marginTop: '16px' }}>
                        <div className='tutorial-heading'>How to win</div>
                        <p>
                            When a card is played, that card's Power score is added to that player's Power score (please see the Card Info section for a detailed breakdown of the cards' layout). The player with the highest Power score at the end of the round wins the round, with two rounds needed to win the match. The round is over when both players have played six cards and pressed the Pass button.
                        </p>
                        <p>
                            If both players have the same Power score, the player with the higher total Synergy wins. If both players' Synergy scores are also tied, the round is a draw and neither player receives a win.
                        </p>
                    </div>
                    <div className='tutorial-section'>
                        <div className='tutorial-heading'>Starting a game</div>
                        <p>
                            Both players should begin by drawing 4 cards each +1 on draw step. Then the players each take turns to play as many cards as they want per turn. At the end of your turn, click the End Turn button to allow the other player to take their turn. You can tell which player's turn it is by which cards are facing up. To find out exactly what you can do on your turn, please see the Turn Actions section above.
                        </p>
                    </div>
                    <div className='tutorial-section'>
                        <div className='tutorial-heading'>Scores, abilities and counters</div>
                        <p>
                            See the Card Info and Turn Actions sections for details about counters, abilities, synergy, shields, and scoring.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Overview;