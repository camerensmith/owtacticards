import { otherImages } from '../../assets/imageImports';
import AudioPlayer from './AudioPlayer';

export default function TitleCard(props) {
    function toggleTutorial() {
        document.getElementById('tutorial-container').classList.toggle('open');
    }

    return (
        <div id='title-container'>
            <div className='title-corners'>
                <i onClick={toggleTutorial} className='fas fa-question'></i>
            </div>
            <span className='title'>Overwatch</span>
            <div className='credit'>
                <span>Game & Card Design by</span>
                <span>u/barberian912</span>
            </div>
            <img src={otherImages.owlogo} id='centerlogo' alt='owlogo' />
            <span className='credit'>
                <span>Digitisation by</span>
                <span>Nathan H Miles</span>
            </span>
            <span className='title'>Card Game</span>
            <AudioPlayer
                playAudio={props.playAudio}
                setPlayAudio={props.setPlayAudio}
            />
        </div>
    );
}
