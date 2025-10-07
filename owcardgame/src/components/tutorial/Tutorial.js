import React from 'react';
import { otherImages } from '../../assets/imageImports';
import Overview from './components/Overview';
import CardInfo from './components/CardInfo';
import TurnActions from './components/TurnActions';
import TabButton from './components/TabButton';

function Tutorial() {
    const closeTutorialStyle = {
        position: 'absolute',
        right: '10px',
        top: '10px',
        fontSize: '2rem',
        cursor: 'pointer',
    };

    const tutorialHatStyle = {
        fontSize: '2rem',
        color: 'inherit',
    };

    function openCloseTutorial(e) {
        if (
            e.target.id === 'tutorial-container' ||
            e.target.id === 'closetutorial'
        ) {
            document.getElementById('tutorial-container').classList.remove('open');
        }
    }

    return (
        <div
            onClick={openCloseTutorial}
            id='tutorial-container'
        >
            <div id='tutorial'>
                <div id='tutorial-content-container'>
                    <div className='tutorial-header'>
                        <i
                            onClick={openCloseTutorial}
                            style={closeTutorialStyle}
                            id='closetutorial'
                            className='far fa-times-circle'
                        ></i>
                        <a
                            rel='noopener noreferrer'
                            target='_blank'
                            href={otherImages.howToPlayPdf}
                            id='howtoplay'
                            style={{ color: 'inherit' }}
                        >
                            <i
                                style={tutorialHatStyle}
                                className='fas fa-graduation-cap'
                            ></i>
                        </a>
                        <span id='tutorial-title'>Credits</span>
                        <div id='tutorial-tabs'>
                            <TabButton title='Overview' tabId='overview-content' icon='fa-eye'></TabButton>
                            <TabButton title='Card Info' tabId='card-info-content' icon='fa-exclamation'></TabButton>
                            <TabButton title='Turn Actions' tabId='turn-actions-content' icon='fa-hourglass-half'></TabButton>
                        </div>
                    </div>
                    <Overview></Overview>
                    <CardInfo></CardInfo>
                    <TurnActions></TurnActions>
                </div>
            </div>
        </div>
    );
}

export default Tutorial;
